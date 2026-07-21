import React, { useEffect, useRef, useState } from "react";
import { useCall } from "../../context/CallContext";
import { getParticipantId } from "../../context/callParticipantUtils";
import CallMemberInvite from "./CallMemberInvite";
import "./calls.css";
import "./callRecovery.css";
import "../collaborators/collaborators.css";

const duration = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const contextLabel = (value) => ({
  direct: "Direct conversation",
  repository: "Repository conversation",
  issue: "Issue conversation",
  pull_request: "Pull request conversation",
  mentor: "Mentor session",
  guided_contribution: "Guided contribution",
}[value.callType] || "CodeHub conversation");
const participantName = (participant) => participant?.user?.name || participant?.user?.username || participant?.name || participant?.username || "Participant";
const stateFor = (states, participantId) => states instanceof Map ? states.get(participantId) : states?.[participantId];
const streamFor = (streams, participantId) => streams instanceof Map ? streams.get(participantId) : streams?.[participantId];
const hasLiveVideo = (stream) => Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === "live" && !track.muted));

export function ParticipantVideo({ stream, isLocal, displayName, cameraEnabled, screenSharing = false }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    if (video.srcObject !== stream) video.srcObject = stream || null;
    if (stream) Promise.resolve(video.play?.()).catch(() => {});
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  return <figure className="call-participant-tile">
    {stream && cameraEnabled ? <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={isLocal && !screenSharing ? "local-call-video" : "remote-call-video"}
    /> : <div className="camera-off-placeholder">
      <div className="participant-avatar" aria-hidden="true">{displayName?.charAt(0)?.toUpperCase() || "?"}</div>
      <span>Camera off</span>
    </div>}
    <figcaption className="participant-name">{isLocal ? "You" : displayName}</figcaption>
  </figure>;
}

function Status({ call }) {
  return call.error ? <p className="call-status" role="alert">{call.error}<button type="button" aria-label="Dismiss call message" onClick={call.clearError}>Dismiss</button></p> : null;
}

export default function CallOverlay() {
  const call = useCall();
  const [settings, setSettings] = useState(false);
  const dialog = useRef(null);
  useEffect(() => { if (call?.incoming || call?.call) dialog.current?.focus(); }, [call?.incoming, call?.call]);
  if (!call) return null;
  if (call.incoming) return <div className="call-backdrop"><section className="incoming-call" role="dialog" aria-modal="true" aria-live="assertive" tabIndex="-1" ref={dialog}>
    <p>Incoming {call.incoming.mediaMode} call</p>
    <h2>{call.incoming.initiatedBy?.name || call.incoming.initiatedBy?.username || "CodeHub user"}</h2>
    <p>{call.incoming.repository?.name || call.incoming.callType.replaceAll("_", " ")}</p>
    <div><button disabled={call.checking} onClick={() => call.accept(true)}>Accept</button>{call.incoming.mediaMode === "video" && <button disabled={call.checking} onClick={() => call.accept(false)}>Accept without video</button>}<button disabled={call.checking} onClick={call.reject}>Reject</button></div>
    <Status call={call} />
  </section></div>;
  if (!call.call && call.recovery) return <section className="call-recovery" aria-live="polite"><div>
    <strong>You have an active call.</strong><span>{call.recovery.mediaMode} call · {call.recovery.status}</span><span>Context: {contextLabel(call.recovery)}</span><time dateTime={call.recovery.startedAt}>{new Date(call.recovery.startedAt || call.recovery.createdAt).toLocaleString()}</time>
  </div><div><button type="button" disabled={call.checking} onClick={call.rejoin}>{call.recovery.status === "ringing" ? "Return to outgoing call" : "Rejoin call"}</button><button type="button" disabled={call.checking} onClick={call.leaveRecovery}>{call.recovery.status === "ringing" ? "Cancel call" : "Leave call"}</button><button type="button" disabled={call.checking} onClick={call.refreshActive}>Refresh state</button></div><Status call={call} /></section>;
  if (!call.call) return <Status call={call} />;

  const participants = call.call.participants || [];
  const localParticipant = participants.find((participant) => getParticipantId(participant) === call.selfId);
  const remoteParticipants = participants.filter((participant) => getParticipantId(participant) !== call.selfId && participant.status === "joined");
  const localVideoTrack = call.localStream?.getVideoTracks?.()[0];
  const localCameraEnabled = Boolean(localVideoTrack && localVideoTrack.readyState === "live" && localVideoTrack.enabled);
  const localName = participantName(localParticipant);

  return <div className="call-backdrop"><section className="active-call" role="dialog" aria-modal="true" aria-label="Active CodeHub call" tabIndex="-1" ref={dialog}>
    <header><div><strong>{call.call.callType.replaceAll("_", " ")} call</strong><span>{duration(call.elapsed)}</span></div><span aria-live="polite">Network: {call.reconnecting ? "reconnecting" : call.quality}</span></header>
    <div className="call-stage">
      <ParticipantVideo key="local-user" stream={call.localStream} isLocal displayName={localName} cameraEnabled={localCameraEnabled} />
      {remoteParticipants.map((participant) => {
        const participantId = getParticipantId(participant);
        const remoteStream = streamFor(call.remoteStreams, participantId);
        const mediaState = stateFor(call.participantMediaStates, participantId) || participant;
        const liveVideo = hasLiveVideo(remoteStream);
        return <ParticipantVideo
          key={participantId}
          stream={remoteStream}
          isLocal={false}
          displayName={participantName(participant)}
          cameraEnabled={Boolean(liveVideo || mediaState?.cameraEnabled || mediaState?.screenSharing)}
          screenSharing={Boolean(mediaState?.screenSharing)}
        />;
      })}
    </div>
    <aside><h3>Participants ({participants.length || 1}/{call.call.maxParticipants || 4})</h3>{participants.map((participant) => {
      const participantId = getParticipantId(participant);
      const isLocal = participantId === call.selfId;
      const stream = isLocal ? call.localStream : streamFor(call.remoteStreams, participantId);
      const mediaState = stateFor(call.participantMediaStates, participantId) || participant;
      const cameraEnabled = isLocal ? localCameraEnabled : Boolean(hasLiveVideo(stream) || mediaState?.cameraEnabled || mediaState?.screenSharing);
      const microphoneEnabled = isLocal
        ? Boolean(call.localStream?.getAudioTracks?.()[0]?.enabled)
        : mediaState?.microphoneEnabled !== false;
      return <p key={participantId}>{participantName(participant)} · {microphoneEnabled ? "microphone on" : "muted"} · {cameraEnabled ? "camera on" : "camera off"}</p>;
    })}{call.call.maxParticipants > 2 && <CallMemberInvite key={call.call._id} activeCall={call.call} invite={call.invite} />}</aside>
    {settings && <div className="call-settings"><label>Microphone<select onChange={(event) => call.selectDevice("audioinput", event.target.value)}>{call.devices.filter((value) => value.kind === "audioinput").map((value) => <option key={value.deviceId} value={value.deviceId}>{value.label || "Microphone"}</option>)}</select></label><label>Camera<select onChange={(event) => call.selectDevice("videoinput", event.target.value)}>{call.devices.filter((value) => value.kind === "videoinput").map((value) => <option key={value.deviceId} value={value.deviceId}>{value.label || "Camera"}</option>)}</select></label></div>}
    <footer><button onClick={call.toggleMicrophone}>Microphone</button><button onClick={call.toggleCamera}>Camera</button><button onClick={call.call.screenSharing ? call.stopScreen : call.shareScreen}>{call.call.screenSharing ? "Stop sharing" : "Share screen"}</button><button onClick={() => { call.loadDevices(); setSettings((value) => !value); }}>Devices</button><button onClick={async () => { const video = document.querySelector(".call-stage .remote-call-video"); if (!video?.requestPictureInPicture) throw new Error("Picture-in-picture is not supported by this browser."); await video.requestPictureInPicture(); }}>Picture in picture</button><button className="call-end" onClick={call.end}>{call.call.status === "ringing" ? "Cancel call" : "End call"}</button></footer>
    <Status call={call} />
  </section></div>;
}
