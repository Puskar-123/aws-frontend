export function normalizeUserId(value) {
  return String(
    value?.userId?._id
    || value?.userId
    || value?.user?._id
    || value?.user?.id
    || value?.user
    || value?._id
    || value?.id
    || value
    || ""
  );
}

export const mergeRemoteTracks = (remoteStream, event, createStream = () => new MediaStream()) => {
  const stream = remoteStream || createStream();
  const incomingTracks = event.streams?.[0]?.getTracks?.() || [event.track];
  for (const track of incomingTracks) {
    if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) stream.addTrack(track);
  }
  return stream;
};

export const isLiveEnabledTrack = (track) => Boolean(track && track.readyState === "live" && track.enabled);

export const getPeerNetworkStatus = (peer) => {
  const state = peer?.connectionState && peer.connectionState !== "new" ? peer.connectionState : peer?.iceConnectionState;
  if (["connected", "completed"].includes(state)) return "good";
  if (["checking", "connecting", "new"].includes(state) || !state) return "connecting";
  if (state === "disconnected") return "reconnecting";
  if (state === "failed") return "failed";
  if (state === "closed") return "disconnected";
  return "connecting";
};

export const canRestartIce = (lastIceRestartAt, now = Date.now()) => now - (lastIceRestartAt || 0) >= 10000;

export const replacePeerVideoTrack = async (peer, track, stream) => {
  let sender = peer.getSenders().find((candidate) => candidate.track?.kind === "video")
    || peer.getTransceivers?.().find((candidate) => candidate.receiver?.track?.kind === "video")?.sender;
  if (sender) {
    await sender.replaceTrack(track);
    return { sender, requiresNegotiation: false };
  }
  const transceiver = peer.addTransceiver(track, { direction: "sendrecv", streams: [stream] });
  sender = transceiver.sender;
  return { sender, requiresNegotiation: true };
};
