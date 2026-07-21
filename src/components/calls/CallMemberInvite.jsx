import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../authContext";
import { normalizeUserId } from "../../context/callParticipantUtils";
import { getRepositoryCallMembers } from "../../services/callApi";

const roleLabel = (value) => String(value || "member").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const pendingIdsFromCall = (call) => new Set((call?.participants || [])
  .filter((participant) => ["invited", "ringing"].includes(participant.status))
  .map(normalizeUserId)
  .filter(Boolean));
const safeInviteMessage = (error) => ({
  CALL_MEMBER_NOT_FOUND: "Repository member not found.",
  CALL_MEMBER_INACTIVE: "This user no longer has active repository access.",
  CALL_MEMBER_ACCESS_EXPIRED: "This user's temporary repository access has expired.",
  CALL_ALREADY_PARTICIPANT: "This user is already in the call.",
  CALL_INVITATION_ALREADY_PENDING: "This member already has a pending invitation.",
  CALL_PARTICIPANT_LIMIT: "This call has reached the four-participant limit.",
  CALL_FORBIDDEN: "You do not have permission to invite participants.",
  CALL_NOT_ACTIVE: "This call is no longer accepting invitations.",
  CALL_INVITE_RATE_LIMITED: error?.message || "Please wait before sending another invitation.",
}[error?.code] || error?.message || "Unable to send the invitation.");

export default function CallMemberInvite({ activeCall, invite }) {
  const auth = useAuth();
  const selfId = normalizeUserId(auth?.currentUser || auth?.user || auth?.authenticatedUser);
  const repositoryId = normalizeUserId(activeCall.repository);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [inviteStatus, setInviteStatus] = useState("idle");
  const [inviteMessage, setInviteMessage] = useState("");
  const [pendingInviteIds, setPendingInviteIds] = useState(new Set());
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [referenceTime] = useState(() => Date.now());
  const requestRef = useRef(0);
  const inviteInFlightRef = useRef(false);
  const retryUntilRef = useRef(0);

  const currentParticipant = activeCall.currentParticipant
    || (activeCall.participants || []).find((participant) => normalizeUserId(participant) === selfId);
  const isHost = currentParticipant
    ? currentParticipant.role === "host" && currentParticipant.status === "joined"
    : normalizeUserId(activeCall.initiatedBy) === selfId;
  const canInvite = Boolean(repositoryId) && activeCall.callType === "repository" && activeCall.status === "active"
    && activeCall.acceptingParticipants !== false && isHost;
  const joinedParticipantIds = useMemo(() => new Set((activeCall.participants || [])
    .filter((participant) => participant.status === "joined")
    .map(normalizeUserId)), [activeCall.participants]);
  const allPendingInviteIds = useMemo(() => {
    const next = pendingIdsFromCall(activeCall);
    for (const memberId of pendingInviteIds) next.add(memberId);
    return next;
  }, [activeCall, pendingInviteIds]);
  const maxParticipants = Math.min(4, Number(activeCall.maxParticipants) || 4);
  const joinedCount = joinedParticipantIds.size;
  const totalInvitationSlots = Math.max(0, maxParticipants - joinedCount);
  const remainingInviteCapacity = Math.max(0, totalInvitationSlots - allPendingInviteIds.size);
  const callIsFull = joinedCount >= maxParticipants;

  const repositoryMembers = useMemo(() => members.filter((member) => {
    const memberId = normalizeUserId(member);
    const status = String(member.status || member.accessStatus || member.membershipStatus || "").toLowerCase();
    const expiry = member.temporaryAccessExpiresAt || member.expiresAt || member.accessExpiresAt;
    return memberId && memberId !== selfId && member.isActive !== false && !member.expired
      && !new Set(["suspended", "removed", "declined", "inactive", "expired", "not_started"]).has(status)
      && !(expiry && new Date(expiry).getTime() <= referenceTime);
  }), [members, referenceTime, selfId]);
  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return repositoryMembers.filter((member) => !term
      || String(member.username || member.user?.username || "").toLowerCase().includes(term)
      || String(member.name || member.user?.name || "").toLowerCase().includes(term));
  }, [repositoryMembers, search]);
  const effectiveSelectedMemberId = joinedParticipantIds.has(selectedMemberId) ? "" : selectedMemberId;
  const selectedMember = repositoryMembers.find((member) => normalizeUserId(member) === effectiveSelectedMemberId);
  const selectedAlreadyJoined = joinedParticipantIds.has(selectedMemberId);
  const selectedAlreadyInvited = allPendingInviteIds.has(selectedMemberId);

  useEffect(() => {
    if (!retrySeconds) return undefined;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryUntilRef.current - Date.now()) / 1000));
      setRetrySeconds(seconds);
      if (!seconds) setInviteStatus((current) => current === "rate-limited" ? "idle" : current);
    }, 250);
    return () => clearInterval(timer);
  }, [retrySeconds]);

  useEffect(() => {
    if (import.meta.env.DEV && inviteStatus !== "idle") console.debug("[Call] invitation", { callId: activeCall._id, selectedInviteMemberId: selectedMemberId, status: inviteStatus });
  }, [activeCall._id, inviteStatus, selectedMemberId]);

  const show = async () => {
    const request = ++requestRef.current;
    setOpen(true);
    setLoading(true);
    setInviteStatus("idle");
    setInviteMessage("");
    try {
      const data = await getRepositoryCallMembers(repositoryId, activeCall._id);
      if (request === requestRef.current) setMembers(data.members || []);
    } catch {
      if (request === requestRef.current) {
        setInviteStatus("error");
        setInviteMessage("The repository members could not be loaded. Try again.");
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };

  const close = () => {
    requestRef.current += 1;
    inviteInFlightRef.current = false;
    setOpen(false);
    setMembers([]);
    setSearch("");
    setSelectedMemberId("");
    setInviteStatus("idle");
    setInviteMessage("");
    setRetrySeconds(0);
  };

  const selectMember = (memberId) => {
    if (inviteInFlightRef.current || joinedParticipantIds.has(memberId) || allPendingInviteIds.has(memberId)) return;
    setSelectedMemberId(memberId);
    setInviteStatus("idle");
    setInviteMessage("");
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    if (inviteInFlightRef.current || !effectiveSelectedMemberId || !selectedMember || !remainingInviteCapacity
      || selectedAlreadyJoined || selectedAlreadyInvited || retrySeconds) return;
    const submittedMemberId = effectiveSelectedMemberId;
    const fallbackName = selectedMember.user?.username || selectedMember.username
      || selectedMember.user?.name || selectedMember.name || "the selected member";
    inviteInFlightRef.current = true;
    setInviteStatus("sending");
    setInviteMessage("");
    try {
      const response = await invite(submittedMemberId);
      setPendingInviteIds((previous) => new Set(previous).add(submittedMemberId));
      const invitedName = response?.invitee?.username || response?.inviteeDisplayName || fallbackName;
      setInviteStatus("sent");
      setInviteMessage(`Invitation sent to ${invitedName}.`);
    } catch (error) {
      if (error?.code === "CALL_INVITATION_ALREADY_PENDING") {
        setPendingInviteIds((previous) => new Set(previous).add(submittedMemberId));
        setInviteStatus("sent");
        setInviteMessage("This member already has a pending invitation.");
      } else if (error?.code === "CALL_INVITE_RATE_LIMITED") {
        const wait = Math.max(1, Number(error.retryAfterSeconds) || 1);
        retryUntilRef.current = Date.now() + wait * 1000;
        setRetrySeconds(wait);
        setInviteStatus("rate-limited");
        setInviteMessage(safeInviteMessage(error));
      } else {
        setInviteStatus("error");
        setInviteMessage(safeInviteMessage(error));
      }
    } finally {
      inviteInFlightRef.current = false;
    }
  };

  if (!canInvite) return null;
  if (!open) return <button type="button" aria-label="Invite repository member" onClick={show} disabled={!remainingInviteCapacity}>{remainingInviteCapacity ? "Invite participants" : "Call full"}</button>;

  const buttonText = !remainingInviteCapacity ? "Call full"
    : selectedAlreadyJoined ? "Already joined"
      : selectedAlreadyInvited ? "Already invited"
        : retrySeconds ? `Try again in ${retrySeconds}s`
          : inviteStatus === "sending" ? "Sending\u2026" : "Invite";
  const inviteDisabled = !effectiveSelectedMemberId || !selectedMember || loading || !remainingInviteCapacity
    || selectedAlreadyJoined || selectedAlreadyInvited || retrySeconds > 0 || inviteStatus === "sending";
  const slotMessage = callIsFull ? "Call is full"
    : `${remainingInviteCapacity} of ${totalInvitationSlots} invitation slot${totalInvitationSlots === 1 ? "" : "s"} available`;

  return <form className="call-member-invite" onSubmit={handleInviteSubmit}>
    <div className="call-member-invite-heading"><strong>Invite participants</strong><button type="button" onClick={close}>Close</button></div>
    <p>{slotMessage}</p>
    <label>Search repository members<input autoComplete="off" placeholder="Search repository members" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedMemberId(""); setInviteStatus("idle"); setInviteMessage(""); }} /></label>
    {loading ? <p role="status">{"Loading repository members\u2026"}</p>
      : repositoryMembers.length === 0 && inviteStatus !== "error" ? <p>No eligible repository members.</p>
        : filteredMembers.length === 0 && inviteStatus !== "error" ? <p>No matching repository members.</p>
          : filteredMembers.length > 0 ? <ul className="call-member-results">{filteredMembers.map((member) => {
            const user = member.user || member;
            const memberId = normalizeUserId(member);
            const selected = effectiveSelectedMemberId === memberId;
            const alreadyJoined = joinedParticipantIds.has(memberId);
            const pending = allPendingInviteIds.has(memberId) || ["invited", "ringing"].includes(member.invitationStatus);
            return <li key={memberId}><button
              type="button"
              className={`call-invite-member${selected ? " call-invite-member--selected" : ""}${alreadyJoined || pending ? " call-invite-member--disabled" : ""}`}
              disabled={alreadyJoined || pending}
              aria-pressed={selected}
              onClick={() => selectMember(memberId)}
            >
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="call-invite-member-avatar call-member-avatar" aria-hidden="true">{(user.name || user.username || "?").charAt(0).toUpperCase()}</span>}
              <span className="call-invite-member-details"><strong>{user.username || user.name}</strong>{user.name && user.username && <small>{user.name}</small>}<small>{member.online || member.isOnline ? "Online" : "Offline"}</small></span>
              <span className="call-invite-member-role">{roleLabel(member.role)}</span>
              {(alreadyJoined || pending) && <span className="call-invite-pending">{alreadyJoined ? "Already joined" : "Invited"}</span>}
            </button></li>;
          })}</ul> : null}
    <button type="submit" disabled={inviteDisabled}>{buttonText}</button>
    {inviteMessage && (!selectedMemberId || selectedMember) && <p className={`call-invite-message call-invite-message--${inviteStatus === "error" || inviteStatus === "rate-limited" ? "error" : "success"}`} role={inviteStatus === "error" || inviteStatus === "rate-limited" ? "alert" : "status"}>{inviteMessage}{inviteStatus === "error" && <button type="button" aria-label="Dismiss invitation message" onClick={() => { setInviteStatus("idle"); setInviteMessage(""); }}>Dismiss</button>}</p>}
  </form>;
}
