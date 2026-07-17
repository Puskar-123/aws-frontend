import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import { collaboratorRequest } from "./collaboratorApi";
import { accessWarning, roleLabel } from "./accessPermissions";
import "./collaborators.css";

const builtInRoles = ["viewer", "issue_manager", "tester", "reviewer", "temporary_contributor", "deployment_manager", "maintainer"];
const descriptions = {
  owner: "Full repository control.", maintainer: "Code, collaboration, releases, and ordinary settings.",
  viewer: "Read-only repository access.", issue_manager: "Manage issues without source access.",
  tester: "Run permitted tests and record pull-request results.", reviewer: "Review and approve without merge access.",
  temporary_contributor: "Time-limited changes on explicitly allowed branches.",
  deployment_manager: "Manage releases and deployment workflows without source access.",
};
const emptyForm = { username: "", role: "viewer", message: "", accessStartsAt: "", accessExpiresAt: "", allowedBranches: "", retainViewerAfterExpiry: false };
const dateText = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not configured";
const normalizedRole = (role) => ({ read: "viewer", write: "temporary_contributor" }[role] || role);
const normalizeUserId = (value) => String(value?.user?._id || value?.user?.id || value?._id || value?.id || value || "").trim().toLowerCase();
export function normalizeDisplayedMembers(owner, rows = []) {
  const ownerId = normalizeUserId(owner); const seen = new Set(); const result = [];
  if (ownerId) { seen.add(ownerId); result.push({ user: owner, role: "owner", status: "active", isOwner: true }); }
  for (const row of rows) { const id = normalizeUserId(row); if (!id || seen.has(id)) continue; seen.add(id); result.push({ ...row, isOwner: row.role === "owner" || row.isOwner }); }
  return result;
}

function RoleBadge({ role, status }) {
  const value = status === "expired" || status === "suspended" ? status : normalizedRole(role);
  return <span className={`collaborator-role collaborator-role--${value}`}>{roleLabel(value)}</span>;
}

const CollaboratorSettingsPage = () => {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", collaborators: [], invitations: [], owner: null, canManage: false, currentUserRole: null });
  const [form, setForm] = useState(emptyForm); const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(""); const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all");
  const [showMatrix, setShowMatrix] = useState(false);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const members = await collaboratorRequest(`/repo/${id}/members`);
      const invitations = members.canManage ? await collaboratorRequest(`/repo/${id}/collaborators/invitations`) : { invitations: [] };
      setState({ loading: false, error: "", collaborators: normalizeDisplayedMembers(members.owner, members.members || members.collaborators || []), invitations: invitations.invitations || [], owner: members.owner,
        canManage: Boolean(members.canManage), currentUserRole: members.currentUserRole || null });
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const invite = async (event) => {
    event.preventDefault(); setNotice("");
    if (!form.username.trim()) return setNotice("Enter a username.");
    const body = { username: form.username.trim(), role: form.role, message: form.message };
    if (form.role === "temporary_contributor") {
      const branches = form.allowedBranches.split(",").map((item) => item.trim()).filter(Boolean);
      if (!form.accessExpiresAt || new Date(form.accessExpiresAt) <= new Date()) return setNotice("Choose a future expiration date and time.");
      if (!branches.length) return setNotice("Add at least one allowed branch.");
      Object.assign(body, { accessStartsAt: form.accessStartsAt || undefined, accessExpiresAt: new Date(form.accessExpiresAt).toISOString(), allowedBranches: branches, retainViewerAfterExpiry: form.retainViewerAfterExpiry });
    }
    setSubmitting(true);
    try {
      const data = await collaboratorRequest(`/repo/${id}/members/invite`, { method: "POST", body: JSON.stringify(body) });
      setState((current) => ({ ...current, invitations: [data.invitation, ...current.invitations] })); setForm(emptyForm); setNotice("Invitation sent.");
    } catch (error) { setNotice(error.message); } finally { setSubmitting(false); }
  };

  const changeRole = async (item, role) => {
    if (role === "temporary_contributor") { setNotice("Use the access form when converting a member to Temporary Contributor."); return; }
    try {
      await collaboratorRequest(`/repo/${id}/members/${item.user._id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setState((current) => ({ ...current, collaborators: current.collaborators.map((member) => member.user._id === item.user._id ? { ...member, role, status: "active" } : member) })); setNotice("Role updated.");
    } catch (error) { setNotice(error.message); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.user.username} from this repository?`)) return;
    try { await collaboratorRequest(`/repo/${id}/members/${item.user._id}`, { method: "DELETE" }); setState((current) => ({ ...current, collaborators: current.collaborators.filter((value) => value.user._id !== item.user._id) })); setNotice("Collaborator removed."); }
    catch (error) { setNotice(error.message); }
  };
  const cancel = async (invitation) => {
    if (!window.confirm(`Cancel the invitation for ${invitation.invitedUser.username}?`)) return;
    try { await collaboratorRequest(`/repo/${id}/collaborators/invitations/${invitation._id}`, { method: "DELETE" }); setState((current) => ({ ...current, invitations: current.invitations.filter((value) => value._id !== invitation._id) })); setNotice("Invitation cancelled."); }
    catch (error) { setNotice(error.message); }
  };

  const members = useMemo(() => state.collaborators.filter((item) => {
    const warning = accessWarning(item); const value = `${item.user?.username || ""} ${item.user?.name || ""}`.toLowerCase();
    const matchesSearch = value.includes(search.trim().toLowerCase());
    const matchesFilter = filter === "all" || (filter === "expired" ? warning === "Expired" : filter === "suspended" ? item.status === "suspended" : normalizedRole(item.role) === filter);
    return matchesSearch && matchesFilter;
  }), [state.collaborators, search, filter]);
  const assignable = state.currentUserRole === "maintainer" ? builtInRoles.filter((role) => role !== "maintainer") : builtInRoles;

  return <div className="collaborator-page"><Navbar /><main className="collaborator-shell">
    <nav className="collaborator-breadcrumb" aria-label="Breadcrumb"><Link to={`/repo/${id}`}>Repository</Link><span>/</span><span>Settings</span><span>/</span><strong>Collaborators</strong></nav>
    <header><p>Repository Settings</p><h1>Collaborators</h1><span>Repository-specific roles, temporary access, and audit visibility.</span></header>
    {notice && <p className="collaborator-notice" role="status" aria-live="polite">{notice}</p>}
    {state.loading && <p role="status">Loading collaborators...</p>}
    {!state.loading && state.error && <div className="collaborator-error" role="alert">{state.error}<button type="button" onClick={load}>Retry</button></div>}
    {!state.loading && <>
      {state.canManage && <section className="collaborator-panel"><div className="collaborator-panel-heading"><h2>Invite collaborator</h2><button type="button" className="collaborator-link-button" onClick={() => setShowMatrix((value) => !value)}>Permission matrix</button></div>
        {showMatrix && <div className="permission-matrix" role="dialog" aria-label="Repository role permission matrix">{Object.entries(descriptions).map(([role, description]) => <article key={role}><RoleBadge role={role} /><p>{description}</p></article>)}</div>}
        <form className="collaborator-invite-form" onSubmit={invite}>
          <label>Username<input value={form.username} maxLength={40} required onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="account-b" /></label>
          <label>Role<select aria-label="Invitation role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{assignable.map((role) => <option value={role} key={role}>{roleLabel(role)}</option>)}</select><small>{descriptions[form.role]}</small></label>
          {form.role === "temporary_contributor" && <fieldset className="temporary-access-fields"><legend>Temporary access</legend>
            <label>Access starts<input type="datetime-local" value={form.accessStartsAt} onChange={(event) => setForm({ ...form, accessStartsAt: event.target.value })} /></label>
            <label>Access expires<input type="datetime-local" required value={form.accessExpiresAt} onChange={(event) => setForm({ ...form, accessExpiresAt: event.target.value })} /></label>
            <label className="collaborator-message">Allowed branches<input value={form.allowedBranches} required onChange={(event) => setForm({ ...form, allowedBranches: event.target.value })} placeholder="feature/payment-page, feature/checkout" /><small>Comma-separated exact branch names. Protected branches remain blocked.</small></label>
            <label className="collaborator-checkbox"><input type="checkbox" checked={form.retainViewerAfterExpiry} onChange={(event) => setForm({ ...form, retainViewerAfterExpiry: event.target.checked })} />Retain Viewer access after expiry</label>
          </fieldset>}
          <label className="collaborator-message">Message (optional)<input value={form.message} maxLength={300} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
          <button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send invitation"}</button>
        </form></section>}
      <section className="collaborator-panel"><div className="collaborator-panel-heading"><h2>Current collaborators</h2><div className="collaborator-filters"><input aria-label="Search members" placeholder="Search members" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Filter members" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All members</option>{builtInRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}<option value="expired">Expired access</option><option value="suspended">Suspended access</option></select></div></div>
        <ul className="collaborator-list">
          {members.map((item) => { const warning = accessWarning(item); return <li key={normalizeUserId(item)}><div className="collaborator-avatar" aria-hidden="true">{item.user.username?.[0]?.toUpperCase() || "O"}</div><div><strong>{item.user.username || "Repository owner"}</strong><span>{descriptions[normalizedRole(item.role)]}</span>{!item.isOwner && <span>Joined {dateText(item.joinedAt || item.addedAt)}</span>}{item.accessExpiresAt && <span>Expires {dateText(item.accessExpiresAt)}</span>}{item.allowedBranches?.length > 0 && <span>Branches: {item.allowedBranches.join(", ")}</span>}{warning && <span className="collaborator-warning">{warning}</span>}</div>
            {item.isOwner ? <RoleBadge role="owner" /> : state.canManage ? <><select aria-label={`Role for ${item.user.username}`} value={item.role} onChange={(event) => changeRole(item, event.target.value)}><option hidden value="read">Read</option><option hidden value="write">Write</option>{assignable.map((role) => <option value={role} key={role}>{roleLabel(role)}</option>)}</select><button className="collaborator-remove" type="button" onClick={() => remove(item)}>Remove</button></> : <RoleBadge role={item.role} status={warning === "Expired" ? "expired" : item.status} />}</li>; })}
        </ul></section>
      {state.canManage && <section className="collaborator-panel"><h2>Pending invitations</h2>{state.invitations.length ? <ul className="collaborator-list">{state.invitations.map((item) => <li key={item._id}><div className="collaborator-avatar" aria-hidden="true">{item.invitedUser.username?.[0]?.toUpperCase()}</div><div><strong>{item.invitedUser.username}</strong><span>Invited {dateText(item.createdAt)} · invitation expires {dateText(item.expiresAt)}</span></div><RoleBadge role={item.repositoryRole || item.role} /><button className="collaborator-remove" type="button" onClick={() => cancel(item)}>Cancel</button></li>)}</ul> : <p className="collaborator-empty">No pending invitations.</p>}</section>}
    </>}
  </main></div>;
};
export { RoleBadge };
export default CollaboratorSettingsPage;
