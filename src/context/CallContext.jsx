import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "./ChatContext";
import { getActiveCall, getIceServers } from "../services/callApi";
import { useAuth } from "../authContext";
import { getParticipantId, mergeRemoteTracks } from "./callParticipantUtils";

const Context = createContext(null);

const emit = (socket, event, payload) => new Promise((resolve, reject) => {
  if (!socket?.connected) return reject(new Error("Calling is offline"));
  socket.emit(event, payload, (result) => result?.success
    ? resolve(result.call || result.data?.call || result)
    : reject(Object.assign(new Error(result?.message || "Call request failed"), { code: result?.error })));
});

const mediaError = (error) => error?.name === "NotAllowedError"
  ? "Media permission was denied."
  : error?.name === "NotFoundError"
    ? "The requested microphone or camera is unavailable."
    : error?.message || "Unable to access media devices.";

const mediaStateOf = (participant) => ({
  cameraEnabled: Boolean(participant?.cameraEnabled),
  microphoneEnabled: participant?.microphoneEnabled !== false,
  screenSharing: Boolean(participant?.screenSharing),
});

export const CallProvider = ({ children }) => {
  const { socket } = useChat();
  const auth = useAuth();
  const selfId = String(auth?.currentUser?._id || auth?.currentUser?.id || localStorage.getItem("userId") || "");
  const [incoming, setIncoming] = useState(null);
  const [call, setCall] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [checking, setChecking] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participantMediaStates, setParticipantMediaStates] = useState(new Map());
  const [error, setError] = useState("");
  const [quality, setQuality] = useState("good");
  const [devices, setDevices] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const pendingIceCandidatesRef = useRef(new Map());
  const callRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceRef = useRef([]);
  const screenRef = useRef(null);
  const startingRef = useRef(false);

  const updateMediaStatesFromCall = useCallback((value) => {
    if (!value?.participants) return;
    setParticipantMediaStates((previous) => {
      const next = new Map(previous);
      for (const participant of value.participants) {
        const participantId = getParticipantId(participant);
        if (participantId) next.set(participantId, mediaStateOf(participant));
      }
      return next;
    });
  }, []);

  const setActiveCall = useCallback((value) => {
    callRef.current = value;
    setCall(value);
    updateMediaStatesFromCall(value);
  }, [updateMediaStatesFromCall]);
  const patchActiveCall = useCallback((patch) => {
    const value = { ...callRef.current, ...patch };
    callRef.current = value;
    setCall(value);
  }, []);

  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  const signalKey = useCallback((callId, target) => `${String(callId || "")}:${String(target || "")}`, []);
  const queueIceCandidate = useCallback((callId, target, candidate) => {
    const key = signalKey(callId, target);
    const queued = pendingIceCandidatesRef.current.get(key) || [];
    queued.push(candidate);
    pendingIceCandidatesRef.current.set(key, queued);
  }, [signalKey]);

  const flushIceCandidates = useCallback(async (callId, target, peer) => {
    if (!peer?.remoteDescription || peer.signalingState === "closed") return;
    const key = signalKey(callId, target);
    const queued = pendingIceCandidatesRef.current.get(key) || [];
    pendingIceCandidatesRef.current.delete(key);
    for (const candidate of queued) {
      try {
        if (peer.signalingState !== "closed") await peer.addIceCandidate(candidate);
      } catch (candidateError) {
        setError(candidateError?.message || "Unable to add ICE candidate.");
      }
    }
  }, [signalKey]);

  const removeRemoteTrack = useCallback((participantId, track) => {
    setRemoteStreams((previous) => {
      const next = new Map(previous);
      const stream = next.get(participantId);
      if (!stream) return previous;
      stream.removeTrack?.(track);
      if (!stream.getTracks().length) {
        next.delete(participantId);
        remoteStreamsRef.current.delete(participantId);
      }
      return next;
    });
  }, []);

  const cleanupPeer = useCallback((participantId) => {
    const key = String(participantId || "");
    const peer = peerConnectionsRef.current.get(key);
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onnegotiationneeded = null;
      peer.close();
    }
    peerConnectionsRef.current.delete(key);
    const stream = remoteStreamsRef.current.get(key);
    for (const track of stream?.getTracks?.() || []) track.stop?.();
    remoteStreamsRef.current.delete(key);
    setRemoteStreams((previous) => {
      const next = new Map(previous);
      next.delete(key);
      return next;
    });
    setParticipantMediaStates((previous) => {
      const next = new Map(previous);
      next.delete(key);
      return next;
    });
    for (const queuedKey of pendingIceCandidatesRef.current.keys()) {
      if (queuedKey.endsWith(`:${key}`)) pendingIceCandidatesRef.current.delete(queuedKey);
    }
  }, []);

  const cleanup = useCallback(() => {
    for (const participantId of [...peerConnectionsRef.current.keys()]) cleanupPeer(participantId);
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    for (const track of localStreamRef.current?.getTracks?.() || []) track.stop();
    for (const track of screenRef.current?.getTracks?.() || []) track.stop();
    localStreamRef.current = null;
    screenRef.current = null;
    callRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipantMediaStates(new Map());
    setCall(null);
    setIncoming(null);
    setRecovery(null);
    setElapsed(0);
    setReconnecting(false);
  }, [cleanupPeer]);

  const restore = useCallback((value) => {
    if (!value) {
      setIncoming(null);
      return setRecovery(null);
    }
    const participant = (value.participants || []).find((row) => getParticipantId(row) === selfId);
    const pendingInvitation = participant?.status === "invited";
    const incomingCall = (value.status === "ringing" && participant?.status === "ringing")
      || (value.status === "active" && pendingInvitation);
    if (incomingCall && getParticipantId(value.initiatedBy) !== selfId) {
      setIncoming(value);
      setRecovery(null);
    } else {
      setRecovery(value);
    }
  }, [selfId]);

  const refreshActive = useCallback(async () => {
    if (!selfId) return null;
    setChecking(true);
    try {
      const value = (await getActiveCall()).call || null;
      restore(value);
      return value;
    } finally {
      setChecking(false);
    }
  }, [restore, selfId]);

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const rows = await navigator.mediaDevices.enumerateDevices();
    setDevices(rows);
    return rows;
  }, []);

  const acquire = useCallback(async (video = false, constraints = {}) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("WebRTC media is not supported by this browser.");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints.audio || true,
      video: video ? (constraints.video || true) : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    await loadDevices();
    return stream;
  }, [loadDevices]);

  const ensureIce = useCallback(async () => {
    if (iceRef.current.length) return iceRef.current;
    try {
      iceRef.current = (await getIceServers()).iceServers || [];
    } catch {
      iceRef.current = [{ urls: "stun:stun.l.google.com:19302" }];
    }
    return iceRef.current;
  }, []);

  const syncLocalTracks = useCallback(async (peer) => {
    const metadata = peer.__codeHub;
    const local = localStreamRef.current;
    const desired = {
      audio: local?.getAudioTracks?.()[0] || null,
      video: screenRef.current?.getVideoTracks?.()[0] || local?.getVideoTracks?.()[0] || null,
    };
    for (const kind of ["audio", "video"]) {
      let sender = metadata.senders[kind]
        || peer.getSenders().find((candidate) => candidate.track?.kind === kind)
        || peer.getTransceivers?.().find((candidate) => candidate.receiver?.track?.kind === kind)?.sender;
      if (!sender && peer.addTransceiver) {
        const transceiver = peer.addTransceiver(kind, { direction: "sendrecv" });
        sender = transceiver.sender;
      } else if (!sender && desired[kind]) {
        sender = peer.addTrack(desired[kind], local);
      }
      metadata.senders[kind] = sender || null;
      if (sender?.replaceTrack && sender.track !== desired[kind]) await sender.replaceTrack(desired[kind]);
    }
    if (import.meta.env.DEV) {
      console.debug("[Call] sender state", {
        participantId: metadata.participantId,
        senders: peer.getSenders().map((sender) => ({
          kind: sender.track?.kind,
          enabled: sender.track?.enabled,
          readyState: sender.track?.readyState,
        })),
      });
    }
  }, []);

  const sendOffer = useCallback(async (participantId, peer) => {
    if (!callRef.current?._id || !socket?.connected || peer.signalingState === "closed") return;
    const metadata = peer.__codeHub;
    if (metadata.makingOffer || peer.signalingState !== "stable") return;
    try {
      metadata.makingOffer = true;
      await syncLocalTracks(peer);
      await peer.setLocalDescription(await peer.createOffer());
      await emit(socket, "webrtc:offer", {
        callId: callRef.current._id,
        to: participantId,
        description: peer.localDescription,
      });
    } finally {
      metadata.makingOffer = false;
    }
  }, [socket, syncLocalTracks]);

  const peerFor = useCallback(async (target) => {
    const participantId = String(target || "");
    if (!participantId || participantId === selfId) throw new Error("Invalid remote call participant.");
    if (peerConnectionsRef.current.has(participantId)) return peerConnectionsRef.current.get(participantId);
    if (!window.RTCPeerConnection) throw new Error("WebRTC is not supported by this browser.");
    const peer = new RTCPeerConnection({ iceServers: await ensureIce() });
    peer.__codeHub = {
      participantId,
      makingOffer: false,
      ignoreOffer: false,
      polite: selfId.localeCompare(participantId) > 0,
      senders: { audio: null, video: null },
    };
    peerConnectionsRef.current.set(participantId, peer);

    peer.ontrack = (event) => {
      if (import.meta.env.DEV) {
        console.debug("[Call] remote track received", {
          participantId,
          kind: event.track.kind,
          trackId: event.track.id,
          streams: event.streams?.length,
        });
      }
      setRemoteStreams((previous) => {
        const next = new Map(previous);
        let remoteStream = next.get(participantId) || remoteStreamsRef.current.get(participantId);
        const incomingTracks = event.streams?.[0]?.getTracks?.() || [event.track];
        remoteStream = mergeRemoteTracks(remoteStream, event);
        for (const track of incomingTracks) {
          track.onended = () => removeRemoteTrack(participantId, track);
          track.onmute = () => setRemoteStreams((current) => new Map(current));
          track.onunmute = () => setRemoteStreams((current) => new Map(current));
        }
        remoteStreamsRef.current.set(participantId, remoteStream);
        next.set(participantId, remoteStream);
        return next;
      });
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate || !callRef.current?._id) return;
      socket.emit("webrtc:ice-candidate", {
        callId: callRef.current._id,
        to: participantId,
        candidate: event.candidate.toJSON?.() || event.candidate,
      }, () => {});
    };
    peer.onnegotiationneeded = () => sendOffer(participantId, peer).catch((offerError) => setError(offerError.message));
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      setQuality(state === "connected" ? "good" : state === "connecting" ? "fair" : state === "disconnected" ? "reconnecting" : state === "failed" ? "poor" : "good");
      setReconnecting(state === "disconnected" || state === "connecting");
    };
    await syncLocalTracks(peer);
    return peer;
  }, [ensureIce, removeRemoteTrack, selfId, sendOffer, socket, syncLocalTracks]);

  const offerTo = useCallback(async (target) => {
    const participantId = String(target);
    const peer = await peerFor(participantId);
    if (peer.__codeHub.makingOffer || peer.signalingState !== "stable") return;
    await sendOffer(participantId, peer);
  }, [peerFor, sendOffer]);

  const emitMediaState = useCallback(async (patch = {}) => {
    if (!callRef.current?._id) return;
    const audioTrack = localStreamRef.current?.getAudioTracks?.()[0];
    const videoTrack = localStreamRef.current?.getVideoTracks?.()[0];
    const state = {
      cameraEnabled: Boolean(videoTrack && videoTrack.readyState === "live" && videoTrack.enabled),
      microphoneEnabled: Boolean(audioTrack && audioTrack.readyState === "live" && audioTrack.enabled),
      screenSharing: Boolean(screenRef.current?.getVideoTracks?.().some((track) => track.readyState === "live")),
      ...patch,
    };
    setParticipantMediaStates((previous) => new Map(previous).set(selfId, state));
    await emit(socket, "call-media-state", { callId: callRef.current._id, ...state });
  }, [selfId, socket]);

  const start = useCallback(async ({ recipientId, conversationId, mediaMode = "audio", ...context }) => {
    if (startingRef.current) return null;
    startingRef.current = true;
    setChecking(true);
    setError("");
    try {
      const existing = (await getActiveCall()).call || null;
      if (existing) {
        restore(existing);
        return null;
      }
      await acquire(mediaMode === "video");
      const value = await emit(socket, "call:initiate", { recipientId, conversationId, mediaMode, ...context });
      setRecovery(null);
      setActiveCall(value);
      return value;
    } catch (value) {
      for (const track of localStreamRef.current?.getTracks?.() || []) track.stop();
      localStreamRef.current = null;
      setLocalStream(null);
      if (value.code === "CALL_ALREADY_ACTIVE") {
        const existing = await refreshActive().catch(() => null);
        if (existing) return null;
      }
      setError(mediaError(value));
      throw value;
    } finally {
      startingRef.current = false;
      setChecking(false);
    }
  }, [acquire, refreshActive, restore, setActiveCall, socket]);

  const accept = useCallback(async (camera = true) => {
    setError("");
    try {
      await acquire(incoming?.mediaMode === "video" && camera);
      const microphoneEnabled = Boolean(localStreamRef.current?.getAudioTracks?.()[0]?.enabled);
      const value = await emit(socket, incoming?.invitation ? "call:join" : "call:accept", { callId: incoming._id, cameraEnabled: camera, microphoneEnabled });
      setRecovery(null);
      setActiveCall(value);
      setIncoming(null);
      await emitMediaState();
      return value;
    } catch (value) {
      setError(mediaError(value));
      throw value;
    }
  }, [acquire, emitMediaState, incoming, setActiveCall, socket]);

  const reject = useCallback(async () => {
    try {
      if (incoming) await emit(socket, incoming.invitation ? "call:decline-invitation" : "call:reject", { callId: incoming._id || incoming.callId });
    } finally {
      setIncoming(null);
      setError("");
    }
  }, [incoming, socket]);

  const end = useCallback(async () => {
    try {
      if (callRef.current) await emit(socket, callRef.current.status === "ringing" ? "call:cancel" : "call:end", { callId: callRef.current._id });
    } finally {
      cleanup();
      setError("");
    }
  }, [cleanup, socket]);

  const rejoin = useCallback(async () => {
    if (!recovery || checking) return;
    setChecking(true);
    setError("");
    try {
      await acquire(recovery.mediaMode === "video");
      const value = await emit(socket, "call:rejoin", {
        callId: recovery._id,
        cameraEnabled: recovery.mediaMode === "video",
        microphoneEnabled: true,
      });
      setRecovery(null);
      setActiveCall(value);
      await emitMediaState();
    } catch (value) {
      setError(value.message || "The call could not be rejoined.");
      await refreshActive().catch(() => setRecovery(null));
    } finally {
      setChecking(false);
    }
  }, [acquire, checking, emitMediaState, recovery, refreshActive, setActiveCall, socket]);

  const leaveRecovery = useCallback(async () => {
    if (!recovery || checking) return;
    setChecking(true);
    try {
      const caller = getParticipantId(recovery.initiatedBy) === selfId;
      const event = recovery.status === "ringing" && caller ? "call:cancel" : "call:leave";
      await emit(socket, event, { callId: recovery._id });
      setRecovery(null);
      setError("");
      cleanup();
    } catch (value) {
      setError(value.message || "Unable to clear the call.");
      await refreshActive().catch(() => {});
    } finally {
      setChecking(false);
    }
  }, [checking, cleanup, recovery, refreshActive, selfId, socket]);

  const clearError = useCallback(() => setError(""), []);

  const toggleMicrophone = useCallback(async () => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    await emitMediaState({ microphoneEnabled: track.enabled });
    patchActiveCall({ localMicrophoneEnabled: track.enabled });
  }, [emitMediaState, patchActiveCall]);

  const toggleCamera = useCallback(async () => {
    let track = localStreamRef.current?.getVideoTracks?.().find((candidate) => candidate.readyState === "live");
    let needsNegotiation = false;
    if (!track) {
      const extra = await navigator.mediaDevices.getUserMedia({ video: true });
      track = extra.getVideoTracks()[0];
      if (!localStreamRef.current) localStreamRef.current = new MediaStream();
      for (const endedTrack of localStreamRef.current.getVideoTracks().filter((candidate) => candidate.readyState !== "live")) {
        localStreamRef.current.removeTrack(endedTrack);
      }
      localStreamRef.current.addTrack(track);
      setLocalStream(localStreamRef.current);
      for (const [participantId, peer] of peerConnectionsRef.current) {
        const sender = peer.__codeHub?.senders.video
          || peer.getSenders().find((candidate) => candidate.track?.kind === "video")
          || peer.getTransceivers?.().find((candidate) => candidate.receiver?.track?.kind === "video")?.sender;
        if (screenRef.current) continue;
        if (sender?.replaceTrack) {
          await sender.replaceTrack(track);
        } else {
          needsNegotiation = true;
          await syncLocalTracks(peer);
          await offerTo(participantId);
        }
      }
    } else {
      track.enabled = !track.enabled;
      if (track.enabled && !screenRef.current) {
        for (const peer of peerConnectionsRef.current.values()) {
          const sender = peer.__codeHub?.senders.video;
          if (sender?.track !== track) await sender?.replaceTrack?.(track);
        }
      }
    }
    await emitMediaState({ cameraEnabled: track.enabled, screenSharing: Boolean(screenRef.current) });
    patchActiveCall({ localCameraEnabled: track.enabled });
    if (needsNegotiation && import.meta.env.DEV) console.debug("[Call] video sender added through renegotiation");
  }, [emitMediaState, offerTo, patchActiveCall, syncLocalTracks]);

  const stopScreen = useCallback(async () => {
    if (!callRef.current) return;
    const camera = localStreamRef.current?.getVideoTracks?.()[0] || null;
    for (const peer of peerConnectionsRef.current.values()) {
      const sender = peer.__codeHub?.senders.video || peer.getSenders().find((value) => value.track?.kind === "video");
      if (sender) await sender.replaceTrack(camera);
    }
    for (const track of screenRef.current?.getTracks?.() || []) track.stop();
    screenRef.current = null;
    await emit(socket, "media:screen-stop", { callId: callRef.current._id });
    await emitMediaState({ screenSharing: false });
    patchActiveCall({ screenSharing: false });
  }, [emitMediaState, patchActiveCall, socket]);

  const shareScreen = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen sharing is not supported by this browser.");
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = stream.getVideoTracks()[0];
    await emit(socket, "media:screen-start", { callId: callRef.current._id });
    screenRef.current = stream;
    for (const peer of peerConnectionsRef.current.values()) {
      const sender = peer.__codeHub?.senders.video || peer.getSenders().find((value) => value.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
      else await syncLocalTracks(peer);
    }
    track.onended = () => stopScreen().catch(() => {});
    await emitMediaState({ screenSharing: true });
    patchActiveCall({ screenSharing: true });
  }, [emitMediaState, patchActiveCall, socket, stopScreen, syncLocalTracks]);

  const invite = useCallback((user) => emit(socket, "call:invite", { callId: callRef.current._id, userId: user }), [socket]);

  const selectDevice = useCallback(async (kind, deviceId) => {
    if (kind === "audiooutput") return;
    const stream = await navigator.mediaDevices.getUserMedia({ [kind === "audioinput" ? "audio" : "video"]: { deviceId: { exact: deviceId } } });
    const track = stream.getTracks()[0];
    const old = kind === "audioinput" ? localStreamRef.current.getAudioTracks()[0] : localStreamRef.current.getVideoTracks()[0];
    old?.stop();
    if (old) localStreamRef.current.removeTrack(old);
    localStreamRef.current.addTrack(track);
    for (const peer of peerConnectionsRef.current.values()) {
      if (track.kind === "video" && screenRef.current) continue;
      const sender = peer.__codeHub?.senders[track.kind] || peer.getSenders().find((value) => value.track?.kind === track.kind);
      if (sender) await sender.replaceTrack(track);
    }
    setLocalStream(localStreamRef.current);
    await emitMediaState();
  }, [emitMediaState]);

  useEffect(() => {
    if (!socket) return undefined;
    const onIncoming = (value) => setIncoming(value);
    const onInvitation = (value) => {
      if (!value || String(value.callId || value._id || "") === String(callRef.current?._id || "")) return;
      setIncoming(value);
      setRecovery(null);
    };
    const onAccepted = async (value) => {
      setActiveCall(value);
      setIncoming(null);
      if (getParticipantId(value.initiatedBy) === selfId) {
        for (const participant of value.participants || []) {
          const participantId = getParticipantId(participant);
          if (participantId !== selfId && participant.status === "joined") await offerTo(participantId).catch((offerError) => setError(offerError.message));
        }
      }
    };
    const onEnded = () => cleanup();
    const onJoined = async (value) => {
      if (value.call) setActiveCall(value.call);
      else if (value.participants) setActiveCall({ ...callRef.current, participants: value.participants });
      const participantId = String(value.userId || "");
      if (participantId && participantId !== selfId) await offerTo(participantId).catch(() => {});
    };
    const onParticipants = (value) => { if (value.call) setActiveCall(value.call); };
    const onOffer = async (value) => {
      const participantId = String(value.from);
      const peer = await peerFor(participantId);
      const metadata = peer.__codeHub;
      const offerCollision = metadata.makingOffer || peer.signalingState !== "stable";
      metadata.ignoreOffer = !metadata.polite && offerCollision;
      if (metadata.ignoreOffer) return;
      if (offerCollision && metadata.polite) await peer.setLocalDescription({ type: "rollback" });
      await peer.setRemoteDescription(value.description);
      await flushIceCandidates(value.callId, participantId, peer);
      await syncLocalTracks(peer);
      await peer.setLocalDescription(await peer.createAnswer());
      await emit(socket, "webrtc:answer", { callId: value.callId, to: participantId, description: peer.localDescription });
    };
    const onAnswer = async (value) => {
      const participantId = String(value.from);
      const peer = await peerFor(participantId);
      if (peer.__codeHub.ignoreOffer || peer.signalingState === "closed") return;
      await peer.setRemoteDescription(value.description);
      await flushIceCandidates(value.callId, participantId, peer);
    };
    const onIce = async (value) => {
      if (!value.candidate) return;
      const participantId = String(value.from);
      const peer = await peerFor(participantId);
      if (peer.__codeHub.ignoreOffer) return;
      if (!peer.remoteDescription) queueIceCandidate(value.callId, participantId, value.candidate);
      else await peer.addIceCandidate(value.candidate);
    };
    const onMediaState = (payload) => {
      const participantId = String(payload?.userId || "");
      if (!participantId) return;
      setParticipantMediaStates((previous) => new Map(previous).set(participantId, {
        cameraEnabled: Boolean(payload.cameraEnabled),
        microphoneEnabled: Boolean(payload.microphoneEnabled),
        screenSharing: Boolean(payload.screenSharing),
      }));
    };
    const onMediaSnapshot = (payload) => {
      setParticipantMediaStates((previous) => {
        const next = new Map(previous);
        for (const state of payload?.states || []) {
          const participantId = String(state.userId || "");
          if (participantId) next.set(participantId, mediaStateOf(state));
        }
        return next;
      });
    };
    const onRevoked = () => {
      setError("Your access to this call was revoked.");
      cleanup();
    };
    const listeners = [
      ["call:incoming", onIncoming], ["call:invitation", onInvitation], ["call:accepted", onAccepted],
      ["call:ended", onEnded], ["call:cancelled", onEnded], ["call:rejected", onEnded], ["call:missed", onEnded],
      ["call:participant-joined", onJoined], ["call:participants-updated", onParticipants], ["call:participant-declined", onParticipants],
      ["webrtc:offer", onOffer], ["webrtc:answer", onAnswer], ["webrtc:ice-candidate", onIce],
      ["call-media-state-updated", onMediaState], ["call-media-state-snapshot", onMediaSnapshot], ["call:access-revoked", onRevoked],
    ];
    for (const [event, handler] of listeners) socket.on(event, handler);
    return () => { for (const [event, handler] of listeners) socket.off(event, handler); };
  }, [cleanup, flushIceCandidates, offerTo, peerFor, queueIceCandidate, selfId, setActiveCall, socket, syncLocalTracks]);

  useEffect(() => {
    if (!socket) return undefined;
    const clearPeer = (value) => {
      const participantId = String(value?.userId || "");
      if (participantId) cleanupPeer(participantId);
    };
    socket.on("call:participant-left", clearPeer);
    return () => socket.off("call:participant-left", clearPeer);
  }, [cleanupPeer, socket]);

  useEffect(() => {
    Promise.resolve().then(() => refreshActive().catch((value) => setError(value.message || "Unable to check current call.")));
  }, [refreshActive]);
  useEffect(() => {
    if (!socket) return undefined;
    const recovered = (value) => { if (!callRef.current) restore(value); };
    socket.on("call:recovery", recovered);
    return () => socket.off("call:recovery", recovered);
  }, [restore, socket]);
  useEffect(() => {
    if (!call?.answeredAt) return undefined;
    const started = new Date(call.answeredAt).getTime();
    const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [call?.answeredAt]);
  useEffect(() => {
    if (!socket) return undefined;
    const reconnect = () => {
      if (callRef.current) {
        setReconnecting(true);
        emit(socket, "call:rejoin", { callId: callRef.current._id }).then((value) => {
          setActiveCall(value);
          setReconnecting(false);
          setError("");
          emitMediaState().catch(() => {});
        }).catch(() => {
          setError("The call could not be recovered safely.");
          cleanup();
        });
      } else refreshActive().catch(() => {});
    };
    socket.on("connect", reconnect);
    return () => socket.off("connect", reconnect);
  }, [cleanup, emitMediaState, refreshActive, setActiveCall, socket]);

  const value = useMemo(() => ({
    incoming, call, recovery, checking, localStream, remoteStreams, participantMediaStates, selfId,
    error, quality, devices, elapsed, reconnecting, start, refreshActive, rejoin, leaveRecovery,
    clearError, accept, reject, end, toggleMicrophone, toggleCamera, shareScreen, stopScreen,
    invite, selectDevice, loadDevices,
  }), [incoming, call, recovery, checking, localStream, remoteStreams, participantMediaStates, selfId,
    error, quality, devices, elapsed, reconnecting, start, refreshActive, rejoin, leaveRecovery,
    clearError, accept, reject, end, toggleMicrophone, toggleCamera, shareScreen, stopScreen,
    invite, selectDevice, loadDevices]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCall = () => useContext(Context);
