import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../authContext";
import { normalizeUserId } from "../../context/callParticipantUtils";
import { getRepositoryCallMembers } from "../../services/callApi";

const roleLabel = (value) => String(value || "member").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const invitationMessage = (error) => ({
  CALL_MEMBER_NOT_FOUND: "Repository member not found.",
  CALL_MEMBER_INACTIVE: "This user no longer has active repository access.",
  CALL_MEMBER_ACCESS_EXPIRED: "This user's temporary repository access has expired.",
  CALL_ALREADY_PARTICIPANT: "This user is already in the call.",
  CALL_ALREADY_INVITED: "This user has already been invited.",
  CALL_INVITATION_ALREADY_PENDING: "This user already has a pending invitation.",
  CALL_PARTICIPANT_LIMIT: "This call has reached the four-participant limit.",
  CALL_FORBIDDEN: "You do not have permission to invite participants.",
  CALL_NOT_ACTIVE: "This call is no longer accepting invitations.",
  CALL_INVITE_RATE_LIMITED: error?.message || "Please wait before sending another invitation.",
}[error?.code] || error?.message || "The invitation could not be sent. Try again.");

const initialInviteState = { status: "idle", memberId: "", message: "" };

export default function CallMemberInvite({ activeCall, invite }) {
  const auth = useAuth();
  const selfId = normalizeUserId(auth?.currentUser || auth?.user || auth?.authenticatedUser);
  const repositoryId = normalizeUserId(activeCall.repository);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedInviteMemberId, setSelectedInviteMemberId] = useState("");
  const [inviteState, setInviteState] = useState(initialInviteState);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [referenceTime] = useState(() => Date.now());
  const requestRef = useRef(0);
  const inviteRequestInFlightRef = useRef(false);
  const retryUntilRef = useRef(0);

  const participantFromList = (activeCall.participants || []).find((participant) => normalizeUserId(participant) === selfId);
  const currentParticipant = activeCall.currentParticipant || participantFromList || null;
  const participantRole = String(currentParticipant?.role || "").toLowerCase();
  const participantStatus = String(currentParticipant?.status || "").toLowerCase();
  const initiatedByCurrentUser = Boolean(selfId) && normalizeUserId(activeCall.initiatedBy) === selfId;
  const joinedHost = participantRole === "host" && participantStatus === "joined";
  const legacyRecoveredHost = !currentParticipant && initiatedByCurrentUser && activeCall.status === "active";
  const canInvite = Boolean(repositoryId) && activeCall.callType === "repository" && activeCall.status === "active"
    && activeCall.acceptingParticipants !== false && (joinedHost || legacyRecoveredHost);
  const activeParticipants = (activeCall.participants || []).filter((row) => ["invited", "ringing", "joined"].includes(row.status));
  const participantIds = useMemo(() => new Set(activeParticipants.map(normalizeUserId)), [activeParticipants]);
  const occupied = activeParticipants.length;
  const remaining = Math.max(0, (activeCall.maxParticipants || 4) - occupied);

  const available = useMemo(() => members.filter((member) => {
    const memberId = normalizeUserId(member);
    const status = String(member.status || member.accessStatus || member.membershipStatus || "").toLowerCase();
    const expiry = member.temporaryAccessExpiresAt || member.expiresAt || member.accessExpiresAt;
    const expired = Boolean(expiry && new Date(expiry).getTime() <= referenceTime);
    return memberId !== selfId && !participantIds.has(memberId)
      && !["joined", "invited", "ringing"].includes(String(member.invitationStatus || "").toLowerCase())
      && !member.expired && member.isActive !== false
      && !new Set(["suspended", "removed", "declined", "pending", "inactive", "expired", "not_started"]).has(status)
      && !expired;
  }), [members, participantIds, referenceTime, selfId]);
  const eligible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return available.filter((member) => !term
      || String(member.username || member.user?.username || "").toLowerCase().includes(term)
      || String(member.name || member.user?.name || "").toLowerCase().includes(term));
  }, [available, search]);
  const selectedMember = members.find((member) => normalizeUserId(member) === selectedInviteMemberId);
  const selectedAlreadyJoined = (activeCall.participants || []).some((row) => normalizeUserId(row) === selectedInviteMemberId && row.status === "joined");
  const selectedAlreadyInvited = (activeCall.participants || []).some((row) => normalizeUserId(row) === selectedInviteMemberId && ["invited", "ringing"].includes(row.status));

  useEffect(() => {
    if (!retrySeconds) return undefined;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryUntilRef.current - Date.now()) / 1000));
      setRetrySeconds(seconds);
      if (!seconds) {
        clearInterval(timer);
        setInviteState((current) => current.status === "error" ? initialInviteState : current);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [retrySeconds]);

  useEffect(() => {
    if (import.meta.env.DEV && inviteState.status !== "idle") console.debug("[Call] invitation", { callId: activeCall._id, selectedInviteMemberId, status: inviteState.status });
  }, [activeCall._id, inviteState.status, selectedInviteMemberId]);

  const show = () => {
    const request = ++requestRef.current;
    setOpen(true);
    setLoading(true);
    setMembers([]);
    setInviteState(initialInviteState);
    getRepositoryCallMembers(repositoryId, activeCall._id)
      .then((data) => { if (request === requestRef.current) setMembers(data.members || []); })
      .catch(() => { if (request === requestRef.current) setInviteState({ status: "error", memberId: "", message: "The repository members could not be loaded. Try again." }); })
      .finally(() => { if (request === requestRef.current) setLoading(false); });
  };
  const close = () => {
    requestRef.current += 1;
    inviteRequestInFlightRef.current = false;
    setOpen(false);
    setSearch("");
    setSelectedInviteMemberId("");
    setInviteState(initialInviteState);
    setRetrySeconds(0);
  };
  const selectMember = (memberId) => {
    if (inviteRequestInFlightRef.current) return;
    setSelectedInviteMemberId(memberId);
    setInviteState(initialInviteState);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (inviteRequestInFlightRef.current || !selectedInviteMemberId || !selectedMember || !remaining || selectedAlreadyJoined || selectedAlreadyInvited || retrySeconds) return;
    const submittedMemberId = selectedInviteMemberId;
    const submittedName = selectedMember.user?.username || selectedMember.username || selectedMember.user?.name || selectedMember.name || "repository member";
    inviteRequestInFlightRef.current = true;
    setInviteState({ status: "sending", memberId: submittedMemberId, message: "" });
    try {
      const response = await invite(submittedMemberId);
      const invitedName = response?.inviteeDisplayName || submittedName;
      setInviteState({ status: "sent", memberId: submittedMemberId, message: `Invitation sent to ${invitedName}.` });
    } catch (error) {
      const wait = Math.max(0, Number(error.retryAfterSeconds || 0));
      if (wait) {
        retryUntilRef.current = Date.now() + wait * 1000;
        setRetrySeconds(wait);
      }
      setInviteState({ status: "error", memberId: submittedMemberId, message: invitationMessage(error) });
    } finally {
      inviteRequestInFlightRef.current = false;
    }
  };

  if (!canInvite) return null;
  if (!open) return <button type="button" aria-label="Invite repository member" onClick={show} disabled={!remaining}>{remaining ? "Invite participants" : "Call full"}</button>;
  const buttonLabel = !remaining ? "Call full"
    : selectedAlreadyJoined ? "Already joined"
      : selectedAlreadyInvited ? "Already invited"
        : retrySeconds ? `Try again in ${retrySeconds}s`
          : inviteState.status === "sending" ? "Sending…"
            : inviteState.status === "sent" && inviteState.memberId === selectedInviteMemberId ? "Invited" : "Invite";
  const inviteDisabled = !selectedInviteMemberId || !selectedMember || loading || !remaining || selectedAlreadyJoined || selectedAlreadyInvited
    || retrySeconds > 0 || inviteState.status === "sending" || (inviteState.status === "sent" && inviteState.memberId === selectedInviteMemberId);

  return <form className="call-member-invite" onSubmit={submit}>
    <div className="call-member-invite-heading"><strong>Invite participants</strong><button type="button" onClick={close}>Close</button></div>
    <p>{remaining} of {(activeCall.maxParticipants || 4) - 1} invitation slots available</p>
    <label>Search repository members<input autoComplete="off" placeholder="Search repository members" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedInviteMemberId(""); setInviteState(initialInviteState); }} /></label>
    {loading ? <p role="status">Loading repository members…</p>
      : available.length === 0 && inviteState.status !== "error" ? <p>No eligible repository members.</p>
        : eligible.length === 0 && inviteState.status !== "error" ? <p>No matching repository members.</p>
          : eligible.length > 0 ? <ul className="call-member-results">{eligible.map((member) => {
            const user = member.user || member;
            const memberId = normalizeUserId(member);
            const expiry = member.temporaryAccessExpiresAt;
            const selected = selectedInviteMemberId === memberId;
            return <li key={memberId}><button type="button" className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => selectMember(memberId)}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="call-member-avatar" aria-hidden="true">{(user.name || user.username || "?").charAt(0).toUpperCase()}</span>}
              <span><strong>{user.username}</strong>{user.name && <small>{user.name}</small>}<small>{member.online ? "Online" : "Offline"}{expiry ? ` · Access expires ${new Date(expiry).toLocaleString()}` : ""}</small></span>
              <span className={`collaborator-role collaborator-role--${member.role}`}>{roleLabel(member.role)}</span>
            </button></li>;
          })}</ul> : null}
    <button type="submit" disabled={inviteDisabled}>{buttonLabel}</button>
    {inviteState.message && <p className={`call-invite-message call-invite-message--${inviteState.status === "error" ? "error" : "success"}`} role={inviteState.status === "error" ? "alert" : "status"}>{inviteState.message}{inviteState.status === "error" && !retrySeconds && <button type="button" aria-label="Dismiss invitation message" onClick={() => setInviteState(initialInviteState)}>Dismiss</button>}</p>}
  </form>;
}
