import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCall } from "../../context/CallContext";
import { normalizeUserId } from "../../context/callParticipantUtils";
import CallMemberInvite from "./CallMemberInvite";
import "./calls.css";
import "./callRecovery.css";
import "../collaborators/collaborators.css";

const duration = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const contextLabel = (value) => ({ direct: "Direct conversation", repository: "Repository conversation", issue: "Issue conversation", pull_request: "Pull request conversation", mentor: "Mentor session", guided_contribution: "Guided contribution" }[value.callType] || "CodeHub conversation");
const participantName = (participant) => participant?.user?.name || participant?.user?.username || participant?.displayName || participant?.name || participant?.username || "Participant";
const stateFor = (states, participantId) => states instanceof Map ? states.get(participantId) : states?.[participantId];
const streamFor = (streams, participantId) => streams instanceof Map ? streams.get(participantId) : streams?.[participantId];
const liveVideoTrack = (stream) => stream?.getVideoTracks?.().find((track) => track.readyState === "live" && !track.muted);

export function ParticipantVideo({ participantId, stream, isLocal, displayName, cameraEnabled, screenSharing = false, registerVideo }) {
  const videoRef = useRef(null);
  const videoTrack = liveVideoTrack(stream);
  const shouldShowVideo = Boolean(videoTrack) && Boolean(cameraEnabled || screenSharing);
  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    registerVideo?.(participantId, node, { isLocal, screenSharing });
  }, [isLocal, participantId, registerVideo, screenSharing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldShowVideo) return undefined;
    if (video.srcObject !== stream) video.srcObject = stream || null;
    const playPromise = video.play?.();
    playPromise?.catch?.(() => {});
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [shouldShowVideo, stream, videoTrack?.id]);

  return <figure className="call-participant-tile">
    {shouldShowVideo ? <video
      ref={setVideoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={`call-participant-video${isLocal && !screenSharing ? " call-participant-video--local" : ""}${screenSharing ? " call-participant-video--screen" : ""}`}
    /> : <div className="camera-off-placeholder"><div className="participant-avatar" aria-hidden="true">{displayName?.trim()?.charAt(0)?.toUpperCase() || "U"}</div><span>Camera off</span></div>}
    <figcaption className="participant-label">{displayName}</figcaption>
  </figure>;
}

function Status({ call, extraMessage, onDismissExtra }) {
  if (call.error) return <p className="call-status" role="alert">{call.error}<button type="button" aria-label="Dismiss call message" onClick={call.clearError}>Dismiss</button></p>;
  return extraMessage ? <p className="call-status" role="alert">{extraMessage}<button type="button" aria-label="Dismiss picture-in-picture message" onClick={onDismissExtra}>Dismiss</button></p> : null;
}

export default function CallOverlay() {
  const call = useCall();
  const [settings, setSettings] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  const [pipMessage, setPipMessage] = useState("");
  const [participantVideos, setParticipantVideos] = useState(new Map());
  const dialog = useRef(null);
  const participantVideoRefs = useRef(new Map());

  const registerVideo = useCallback((participantId, node, metadata) => {
    const previous = participantVideoRefs.current.get(participantId)?.node;
    if (!node && previous && document.pictureInPictureElement === previous) {
      document.exitPictureInPicture?.().catch?.(() => {});
    }
    if (node) participantVideoRefs.current.set(participantId, { node, ...metadata });
    else participantVideoRefs.current.delete(participantId);
    if (previous !== node) setParticipantVideos(new Map(participantVideoRefs.current));
  }, []);

  useEffect(() => { if (call?.incoming || call?.call) dialog.current?.focus(); }, [call?.incoming, call?.call]);
  useEffect(() => {
    const entered = () => setPipActive(true);
    const left = () => setPipActive(false);
    document.addEventListener("enterpictureinpicture", entered);
    document.addEventListener("leavepictureinpicture", left);
    return () => {
      document.removeEventListener("enterpictureinpicture", entered);
      document.removeEventListener("leavepictureinpicture", left);
      if (document.pictureInPictureElement) document.exitPictureInPicture?.().catch?.(() => {});
    };
  }, []);
  useEffect(() => {
    if (call?.call || !document.pictureInPictureElement) return;
    document.exitPictureInPicture?.().catch?.(() => {});
    participantVideoRefs.current.clear();
    Promise.resolve().then(() => {
      setParticipantVideos(new Map());
      setPipActive(false);
      setPipMessage("");
    });
  }, [call?.call]);

  const usableVideos = useMemo(() => [...participantVideos.values()].filter(({ node }) => node && !node.hidden && liveVideoTrack(node.srcObject)), [participantVideos]);
  const preferredPipVideo = usableVideos.find((video) => !video.isLocal && !video.screenSharing)
    || usableVideos.find((video) => video.isLocal && !video.screenSharing)
    || usableVideos.find((video) => video.screenSharing)
    || null;
  const togglePictureInPicture = async () => {
    try {
      if (!document.pictureInPictureEnabled) return setPipMessage("Picture-in-Picture is not supported by this browser.");
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
        return;
      }
      const video = preferredPipVideo?.node;
      if (!video) return setPipMessage("Turn on a camera or receive a participant video before using Picture-in-Picture.");
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) await video.play();
      await video.requestPictureInPicture();
      setPipActive(true);
      setPipMessage("");
    } catch (pipError) {
      setPipMessage(pipError?.name === "NotAllowedError" ? "Picture-in-Picture requires a direct user action." : "Picture-in-Picture could not be started for this video.");
    }
  };

  if (!call) return null;
  if (call.incoming) return <div className="call-backdrop"><section className="incoming-call" role="dialog" aria-modal="true" aria-live="assertive" tabIndex="-1" ref={dialog}><p>Incoming {call.incoming.mediaMode} call</p><h2>{call.incoming.initiatedBy?.name || call.incoming.initiatedBy?.username || "CodeHub user"}</h2><p>{call.incoming.repository?.name || call.incoming.callType.replaceAll("_", " ")}</p><div><button disabled={call.checking} onClick={() => call.accept(true)}>Accept</button>{call.incoming.mediaMode === "video" && <button disabled={call.checking} onClick={() => call.accept(false)}>Accept without video</button>}<button disabled={call.checking} onClick={call.reject}>Reject</button></div><Status call={call} /></section></div>;
  if (!call.call && call.recovery) return <section className="call-recovery" aria-live="polite"><div><strong>You have an active call.</strong><span>{call.recovery.mediaMode} call · {call.recovery.status}</span><span>Context: {contextLabel(call.recovery)}</span><time dateTime={call.recovery.startedAt}>{new Date(call.recovery.startedAt || call.recovery.createdAt).toLocaleString()}</time></div><div><button type="button" disabled={call.checking} onClick={call.rejoin}>{call.recovery.status === "ringing" ? "Return to outgoing call" : "Rejoin call"}</button><button type="button" disabled={call.checking} onClick={call.leaveRecovery}>{call.recovery.status === "ringing" ? "Cancel call" : "Leave call"}</button><button type="button" disabled={call.checking} onClick={call.refreshActive}>Refresh state</button></div><Status call={call} /></section>;
  if (!call.call) return <Status call={call} extraMessage={pipMessage} onDismissExtra={() => setPipMessage("")} />;

  const participants = call.call.participants || [];
  const remoteParticipants = participants.filter((participant) => normalizeUserId(participant) !== call.selfId && participant.status === "joined");
  const localVideo = liveVideoTrack(call.localStream);
  const localAudio = call.localStream?.getAudioTracks?.().find((track) => track.readyState === "live");
  const localCameraEnabled = Boolean(localVideo?.enabled);
  const localMicrophoneEnabled = Boolean(localAudio?.enabled);

  return <div className="call-backdrop"><section className="active-call" role="dialog" aria-modal="true" aria-label="Active CodeHub call" tabIndex="-1" ref={dialog}>
    <header><div><strong>{call.call.callType.replaceAll("_", " ")} call</strong><span>{duration(call.elapsed)}</span></div><span aria-live="polite">Network: {call.quality}</span></header>
    <div className="call-stage">
      <ParticipantVideo key={`local-${call.selfId}`} participantId={call.selfId || "local-user"} stream={call.localStream} isLocal displayName="You" cameraEnabled={localCameraEnabled} registerVideo={registerVideo} />
      {remoteParticipants.map((participant) => {
        const participantId = normalizeUserId(participant);
        const remoteStream = streamFor(call.remoteStreams, participantId);
        const mediaState = stateFor(call.participantMediaStates, participantId) || participant;
        return <ParticipantVideo key={participantId} participantId={participantId} stream={remoteStream} isLocal={false} displayName={participantName(participant)} cameraEnabled={Boolean(mediaState?.cameraEnabled)} screenSharing={Boolean(mediaState?.screenSharing)} registerVideo={registerVideo} />;
      })}
    </div>
    <aside><h3>Participants ({participants.length || 1}/{call.call.maxParticipants || 4})</h3>{participants.map((participant) => {
      const participantId = normalizeUserId(participant);
      const isLocal = participantId === call.selfId;
      const stream = isLocal ? call.localStream : streamFor(call.remoteStreams, participantId);
      const mediaState = stateFor(call.participantMediaStates, participantId) || participant;
      const cameraEnabled = isLocal ? localCameraEnabled : Boolean(liveVideoTrack(stream) && (mediaState?.cameraEnabled || mediaState?.screenSharing));
      const microphoneEnabled = isLocal ? localMicrophoneEnabled : mediaState?.microphoneEnabled !== false;
      return <p key={participantId}>{participantName(participant)} · {microphoneEnabled ? "microphone on" : "muted"} · {cameraEnabled ? "camera on" : "camera off"}</p>;
    })}{call.call.maxParticipants > 2 && <CallMemberInvite key={call.call._id} activeCall={call.call} invite={call.invite} />}</aside>
    {settings && <div className="call-settings"><label>Microphone<select onChange={(event) => call.selectDevice("audioinput", event.target.value)}>{call.devices.filter((value) => value.kind === "audioinput").map((value) => <option key={value.deviceId} value={value.deviceId}>{value.label || "Microphone"}</option>)}</select></label><label>Camera<select onChange={(event) => call.selectDevice("videoinput", event.target.value)}>{call.devices.filter((value) => value.kind === "videoinput").map((value) => <option key={value.deviceId} value={value.deviceId}>{value.label || "Camera"}</option>)}</select></label></div>}
    <footer>
      <button aria-pressed={!localMicrophoneEnabled} disabled={Boolean(call.controlBusy)} onClick={call.toggleMicrophone}>{localMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}</button>
      <button aria-pressed={localCameraEnabled} disabled={Boolean(call.controlBusy)} onClick={call.toggleCamera}>{localCameraEnabled ? "Turn camera off" : "Turn camera on"}</button>
      <button aria-pressed={Boolean(call.call.screenSharing)} disabled={Boolean(call.controlBusy)} onClick={call.call.screenSharing ? call.stopScreen : call.shareScreen}>{call.call.screenSharing ? "Stop sharing" : "Share screen"}</button>
      <button onClick={() => { call.loadDevices(); setSettings((value) => !value); }}>Devices</button>
      <button disabled={!preferredPipVideo && !pipActive} onClick={togglePictureInPicture}>{pipActive ? "Exit picture in picture" : "Enter picture in picture"}</button>
      <button className="call-end" onClick={call.end}>{call.call.status === "ringing" ? "Cancel call" : "End call"}</button>
    </footer>
    <Status call={call} extraMessage={pipMessage} onDismissExtra={() => setPipMessage("")} />
  </section></div>;
}
