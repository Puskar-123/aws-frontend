import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "./ChatContext";
import { getActiveCall, getIceServers, inviteCallMember } from "../services/callApi";
import { useAuth } from "../authContext";
import { canRestartIce, getPeerNetworkStatus, isLiveEnabledTrack, mergeRemoteTracks, normalizeUserId, replacePeerVideoTrack } from "./callParticipantUtils";

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
    : error?.name === "NotReadableError"
      ? "The microphone or camera is already in use by another application."
    : error?.message || "Unable to access media devices.";

const createStream = (tracks = []) => typeof MediaStream === "function"
  ? new MediaStream(tracks)
  : { getTracks: () => tracks, getAudioTracks: () => tracks.filter((track) => track.kind === "audio"), getVideoTracks: () => tracks.filter((track) => track.kind === "video"), addTrack: (track) => tracks.push(track), removeTrack: (track) => tracks.splice(tracks.indexOf(track), 1) };

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
  const [controlBusy, setControlBusy] = useState("");

  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const participantMediaRef = useRef(new Map());
  const pendingIceCandidatesRef = useRef(new Map());
  const peerRecoveryTimersRef = useRef(new Map());
  const peerNetworkStatesRef = useRef(new Map());
  const callRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceRef = useRef([]);
  const screenRef = useRef(null);
  const startingRef = useRef(false);

  const updateMediaStatesFromCall = useCallback((value) => {
    if (!value?.participants) return;
    const next = new Map();
    for (const participant of value.participants) {
      const participantId = normalizeUserId(participant);
      if (participantId) next.set(participantId, mediaStateOf(participant));
    }
    participantMediaRef.current = next;
    setParticipantMediaStates(next);
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
      peer.onconnectionstatechange = null;
      peer.oniceconnectionstatechange = null;
      peer.onicegatheringstatechange = null;
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
      participantMediaRef.current = next;
      return next;
    });
    clearTimeout(peerRecoveryTimersRef.current.get(key));
    peerRecoveryTimersRef.current.delete(key);
    peerNetworkStatesRef.current.delete(key);
    for (const queuedKey of pendingIceCandidatesRef.current.keys()) {
      if (queuedKey.endsWith(`:${key}`)) pendingIceCandidatesRef.current.delete(queuedKey);
    }
  }, []);

  const cleanup = useCallback(() => {
    for (const participantId of [...peerConnectionsRef.current.keys()]) cleanupPeer(participantId);
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    participantMediaRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    for (const timer of peerRecoveryTimersRef.current.values()) clearTimeout(timer);
    peerRecoveryTimersRef.current.clear();
    peerNetworkStatesRef.current.clear();
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
    setQuality("good");
    setReconnecting(false);
    setControlBusy("");
  }, [cleanupPeer]);

  const restore = useCallback((value) => {
    if (!value) {
      setIncoming(null);
      return setRecovery(null);
    }
    const participant = (value.participants || []).find((row) => normalizeUserId(row) === selfId);
    const pendingInvitation = participant?.status === "invited";
    const incomingCall = (value.status === "ringing" && participant?.status === "ringing")
      || (value.status === "active" && pendingInvitation);
    if (incomingCall && normalizeUserId(value.initiatedBy) !== selfId) {
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

  const ensureLocalMedia = useCallback(async ({ audio = true, video = false } = {}) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("WebRTC media is not supported by this browser.");
    let stream = localStreamRef.current;
    if (!stream) stream = createStream();
    const liveAudio = stream.getAudioTracks?.().find((track) => track.readyState === "live");
    if (audio && !liveAudio) {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      for (const track of audioStream.getAudioTracks?.() || []) stream.addTrack(track);
    }
    const liveVideo = stream.getVideoTracks?.().find((track) => track.readyState === "live");
    if (video && !liveVideo) {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      for (const track of stream.getVideoTracks?.().filter((track) => track.readyState !== "live") || []) stream.removeTrack(track);
      for (const track of videoStream.getVideoTracks?.() || []) stream.addTrack(track);
      if (!stream.getVideoTracks?.().some((track) => track.readyState === "live")) throw new Error("No usable camera track was created.");
    }
    localStreamRef.current = stream;
    setLocalStream(createStream(stream.getTracks()));
    await loadDevices();
    if (import.meta.env.DEV) {
      console.debug("[Call] local tracks", {
        audio: stream.getAudioTracks().map((track) => ({ id: track.id, enabled: track.enabled, readyState: track.readyState })),
        video: stream.getVideoTracks().map((track) => ({ id: track.id, enabled: track.enabled, readyState: track.readyState })),
      });
    }
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

  const sendOffer = useCallback(async (participantId, peer, options = {}) => {
    if (!callRef.current?._id || !socket?.connected || peer.signalingState === "closed") return;
    const metadata = peer.__codeHub;
    if (metadata.makingOffer || peer.signalingState !== "stable") return;
    try {
      metadata.makingOffer = true;
      await syncLocalTracks(peer);
      await peer.setLocalDescription(await peer.createOffer(options));
      await emit(socket, "webrtc:offer", {
        callId: callRef.current._id,
        to: participantId,
        description: peer.localDescription,
      });
    } finally {
      metadata.makingOffer = false;
    }
  }, [socket, syncLocalTracks]);

  const publishNetworkStatus = useCallback(() => {
    const states = [...peerConnectionsRef.current.values()]
      .filter((peer) => peer.signalingState !== "closed")
      .map(getPeerNetworkStatus);
    const status = states.includes("failed") ? "failed"
      : states.includes("reconnecting") ? "reconnecting"
        : states.some((state) => state === "connecting" || state === "disconnected") ? "connecting"
          : states.length ? "good" : "connecting";
    setQuality(status);
    setReconnecting(status === "reconnecting");
  }, []);

  const handlePeerState = useCallback((participantId, peer) => {
    const status = getPeerNetworkStatus(peer);
    peerNetworkStatesRef.current.set(participantId, status);
    if (import.meta.env.DEV) console.debug("[Call] peer state", { participantId, connectionState: peer.connectionState, iceConnectionState: peer.iceConnectionState, signalingState: peer.signalingState });
    publishNetworkStatus();
    const clearRecovery = () => {
      clearTimeout(peerRecoveryTimersRef.current.get(participantId));
      peerRecoveryTimersRef.current.delete(participantId);
    };
    if (status === "good") return clearRecovery();
    const restart = async () => {
      if (getPeerNetworkStatus(peer) === "good" || peer.signalingState === "closed") return clearRecovery();
      const now = Date.now();
      if (!canRestartIce(peer.__codeHub.lastIceRestartAt, now)) return;
      peer.__codeHub.lastIceRestartAt = now;
      peer.restartIce?.();
      await sendOffer(participantId, peer, { iceRestart: true }).catch((restartError) => setError(restartError.message));
    };
    if (status === "failed") {
      clearRecovery();
      restart();
    } else if (status === "reconnecting" && !peerRecoveryTimersRef.current.has(participantId)) {
      peerRecoveryTimersRef.current.set(participantId, setTimeout(() => {
        peerRecoveryTimersRef.current.delete(participantId);
        restart();
      }, 3000));
    }
  }, [publishNetworkStatus, sendOffer]);

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
      isSettingRemoteAnswerPending: false,
      polite: selfId.localeCompare(participantId) > 0,
      lastIceRestartAt: 0,
      senders: { audio: null, video: null },
    };
    peerConnectionsRef.current.set(participantId, peer);

    peer.ontrack = (event) => {
      if (import.meta.env.DEV) {
        console.debug("[Call] remote track", {
          participantId,
          kind: event.track.kind,
          id: event.track.id,
          muted: event.track.muted,
          readyState: event.track.readyState,
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
    peer.onconnectionstatechange = () => handlePeerState(participantId, peer);
    peer.oniceconnectionstatechange = () => handlePeerState(participantId, peer);
    peer.onicegatheringstatechange = () => handlePeerState(participantId, peer);
    await syncLocalTracks(peer);
    handlePeerState(participantId, peer);
    return peer;
  }, [ensureIce, handlePeerState, removeRemoteTrack, selfId, sendOffer, socket, syncLocalTracks]);

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
    participantMediaRef.current.set(selfId, state);
    setParticipantMediaStates(new Map(participantMediaRef.current));
    await emit(socket, "call:media-state", { callId: callRef.current._id, ...state });
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
      await ensureLocalMedia({ audio: true, video: mediaMode === "video" });
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
  }, [ensureLocalMedia, refreshActive, restore, setActiveCall, socket]);

  const accept = useCallback(async (camera = true) => {
    setError("");
    try {
      await ensureLocalMedia({ audio: true, video: incoming?.mediaMode === "video" && camera });
      const microphoneEnabled = isLiveEnabledTrack(localStreamRef.current?.getAudioTracks?.()[0]);
      const cameraEnabled = isLiveEnabledTrack(localStreamRef.current?.getVideoTracks?.()[0]);
      const value = await emit(socket, incoming?.invitation ? "call:join" : "call:accept", { callId: incoming._id, cameraEnabled, microphoneEnabled });
      setRecovery(null);
      setActiveCall(value);
      setIncoming(null);
      await emitMediaState();
      return value;
    } catch (value) {
      setError(mediaError(value));
      throw value;
    }
  }, [emitMediaState, ensureLocalMedia, incoming, setActiveCall, socket]);

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
      await ensureLocalMedia({ audio: true, video: recovery.mediaMode === "video" });
      const value = await emit(socket, "call:rejoin", {
        callId: recovery._id,
        cameraEnabled: isLiveEnabledTrack(localStreamRef.current?.getVideoTracks?.()[0]),
        microphoneEnabled: isLiveEnabledTrack(localStreamRef.current?.getAudioTracks?.()[0]),
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
  }, [checking, emitMediaState, ensureLocalMedia, recovery, refreshActive, setActiveCall, socket]);

  const leaveRecovery = useCallback(async () => {
    if (!recovery || checking) return;
    setChecking(true);
    try {
      const caller = normalizeUserId(recovery.initiatedBy) === selfId;
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
    if (controlBusy) return;
    setControlBusy("microphone");
    try {
      const stream = await ensureLocalMedia({ audio: true, video: false });
      const track = stream.getAudioTracks().find((candidate) => candidate.readyState === "live");
      if (!track) throw new Error("No usable microphone track was created.");
      track.enabled = !track.enabled;
      setLocalStream(createStream(stream.getTracks()));
      await emitMediaState({ microphoneEnabled: track.enabled });
      patchActiveCall({ localMicrophoneEnabled: track.enabled });
      setError("");
    } catch (toggleError) {
      setError(mediaError(toggleError));
    } finally {
      setControlBusy("");
    }
  }, [controlBusy, emitMediaState, ensureLocalMedia, patchActiveCall]);

  const toggleCamera = useCallback(async () => {
    if (controlBusy) return;
    setControlBusy("camera");
    try {
      const currentTrack = localStreamRef.current?.getVideoTracks?.().find((candidate) => candidate.readyState === "live");
      const turningOn = !isLiveEnabledTrack(currentTrack);
      const stream = turningOn ? await ensureLocalMedia({ audio: false, video: true }) : localStreamRef.current;
      const track = stream?.getVideoTracks?.().find((candidate) => candidate.readyState === "live");
      if (!track && turningOn) throw new Error("No usable camera track was created.");
      if (track) track.enabled = turningOn;
      if (turningOn && !screenRef.current) {
        for (const [participantId, peer] of peerConnectionsRef.current) {
          const result = await replacePeerVideoTrack(peer, track, stream);
          if (result.requiresNegotiation) await offerTo(participantId);
        }
      }
      setLocalStream(createStream(stream?.getTracks?.() || []));
      await emitMediaState({ cameraEnabled: Boolean(track?.enabled), screenSharing: Boolean(screenRef.current) });
      patchActiveCall({ localCameraEnabled: Boolean(track?.enabled) });
      setError("");
    } catch (toggleError) {
      setError(mediaError(toggleError));
    } finally {
      setControlBusy("");
    }
  }, [controlBusy, emitMediaState, ensureLocalMedia, offerTo, patchActiveCall]);

  const stopScreen = useCallback(async () => {
    if (!callRef.current || controlBusy === "screen") return;
    setControlBusy("screen");
    try {
      const camera = localStreamRef.current?.getVideoTracks?.().find((track) => track.readyState === "live") || null;
      for (const peer of peerConnectionsRef.current.values()) {
        const sender = peer.__codeHub?.senders.video || peer.getSenders().find((value) => value.track?.kind === "video");
        if (sender) await sender.replaceTrack(camera);
      }
      for (const track of screenRef.current?.getTracks?.() || []) { track.onended = null; track.stop(); }
      screenRef.current = null;
      await emit(socket, "media:screen-stop", { callId: callRef.current._id });
      await emitMediaState({ screenSharing: false });
      patchActiveCall({ screenSharing: false });
      setError("");
    } catch (screenError) {
      setError(screenError.message || "Screen sharing could not be stopped.");
    } finally {
      setControlBusy("");
    }
  }, [controlBusy, emitMediaState, patchActiveCall, socket]);

  const shareScreen = useCallback(async () => {
    if (controlBusy) return;
    setControlBusy("screen");
    try {
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
      setError("");
    } catch (screenError) {
      setError(mediaError(screenError));
    } finally {
      setControlBusy("");
    }
  }, [controlBusy, emitMediaState, patchActiveCall, socket, stopScreen, syncLocalTracks]);

  const invite = useCallback((user) => {
    const inviteeId = normalizeUserId(user);
    if (!callRef.current?._id || !inviteeId) return Promise.reject(new Error("Select a repository member to invite."));
    return inviteCallMember(callRef.current._id, inviteeId);
  }, []);

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
    setLocalStream(createStream(localStreamRef.current.getTracks()));
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
      if (normalizeUserId(value.initiatedBy) === selfId) {
        for (const participant of value.participants || []) {
          const participantId = normalizeUserId(participant);
          if (participantId !== selfId && participant.status === "joined") await offerTo(participantId).catch((offerError) => setError(offerError.message));
        }
      }
    };
    const onEnded = () => cleanup();
    const onJoined = async (value) => {
      if (value.call) setActiveCall(value.call);
      else if (value.participants) setActiveCall({ ...callRef.current, participants: value.participants });
      const participantId = normalizeUserId(value.userId);
      if (participantId && participantId !== selfId) await offerTo(participantId).catch(() => {});
    };
    const onParticipants = (value) => { if (value.call) setActiveCall(value.call); };
    const onOffer = async (value) => {
      const participantId = normalizeUserId(value.from);
      const peer = await peerFor(participantId);
      const metadata = peer.__codeHub;
      const readyForOffer = !metadata.makingOffer && (peer.signalingState === "stable" || metadata.isSettingRemoteAnswerPending);
      const offerCollision = !readyForOffer;
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
      const participantId = normalizeUserId(value.from);
      const peer = await peerFor(participantId);
      if (peer.__codeHub.ignoreOffer || peer.signalingState === "closed") return;
      peer.__codeHub.isSettingRemoteAnswerPending = true;
      try {
        await peer.setRemoteDescription(value.description);
        await flushIceCandidates(value.callId, participantId, peer);
      } finally {
        peer.__codeHub.isSettingRemoteAnswerPending = false;
      }
    };
    const onIce = async (value) => {
      if (!value.candidate) return;
      const participantId = normalizeUserId(value.from);
      const peer = await peerFor(participantId);
      if (peer.__codeHub.ignoreOffer) return;
      if (!peer.remoteDescription) queueIceCandidate(value.callId, participantId, value.candidate);
      else await peer.addIceCandidate(value.candidate);
    };
    const onMediaState = (payload) => {
      if (String(payload?.callId || "") !== String(callRef.current?._id || "")) return;
      const participantId = normalizeUserId(payload?.userId);
      if (!participantId) return;
      participantMediaRef.current.set(participantId, {
        cameraEnabled: Boolean(payload.cameraEnabled),
        microphoneEnabled: Boolean(payload.microphoneEnabled),
        screenSharing: Boolean(payload.screenSharing),
      });
      setParticipantMediaStates(new Map(participantMediaRef.current));
    };
    const onMediaSnapshot = (payload) => {
      if (String(payload?.callId || "") !== String(callRef.current?._id || "")) return;
      const next = new Map();
      for (const state of payload?.states || []) {
        const participantId = normalizeUserId(state.userId);
        if (participantId) next.set(participantId, mediaStateOf(state));
      }
      participantMediaRef.current = next;
      setParticipantMediaStates(next);
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
      ["call:media-state-updated", onMediaState], ["call:media-state-snapshot", onMediaSnapshot], ["call:access-revoked", onRevoked],
    ];
    for (const [event, handler] of listeners) socket.on(event, handler);
    return () => { for (const [event, handler] of listeners) socket.off(event, handler); };
  }, [cleanup, flushIceCandidates, offerTo, peerFor, queueIceCandidate, selfId, setActiveCall, socket, syncLocalTracks]);

  useEffect(() => {
    if (!socket) return undefined;
    const clearPeer = (value) => {
      const participantId = normalizeUserId(value?.userId);
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
    invite, selectDevice, loadDevices, controlBusy,
  }), [incoming, call, recovery, checking, localStream, remoteStreams, participantMediaStates, selfId,
    error, quality, devices, elapsed, reconnecting, start, refreshActive, rejoin, leaveRecovery,
    clearError, accept, reject, end, toggleMicrophone, toggleCamera, shareScreen, stopScreen,
    invite, selectDevice, loadDevices, controlBusy]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCall = () => useContext(Context);
