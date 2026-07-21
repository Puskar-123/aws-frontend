export const getParticipantId = (participant) => String(
  participant?.userId?._id
  || participant?.userId
  || participant?.user?._id
  || participant?.user?.id
  || participant?.user
  || participant?._id
  || participant?.id
  || participant
  || ""
);

export const mergeRemoteTracks = (remoteStream, event, createStream = () => new MediaStream()) => {
  const stream = remoteStream || createStream();
  const incomingTracks = event.streams?.[0]?.getTracks?.() || [event.track];
  for (const track of incomingTracks) {
    if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) stream.addTrack(track);
  }
  return stream;
};
