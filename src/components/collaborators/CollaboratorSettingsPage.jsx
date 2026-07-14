import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import { collaboratorRequest } from "./collaboratorApi";
import "./collaborators.css";

const roles = ["read", "write", "maintainer"];
const label = (value) => value ? value[0].toUpperCase() + value.slice(1) : "";

const CollaboratorSettingsPage = () => {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", collaborators: [], invitations: [], owner: null, canManage: false });
  const [form, setForm] = useState({ username: "", role: "write", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const collaborators = await collaboratorRequest(`/repo/${id}/collaborators`);
      const invitations = collaborators.canManage
        ? await collaboratorRequest(`/repo/${id}/collaborators/invitations`)
        : { invitations: [] };
      setState({ loading: false, error: "", collaborators: collaborators.collaborators || [], invitations: invitations.invitations || [], owner: collaborators.owner, canManage: Boolean(collaborators.canManage) });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const invite = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!form.username.trim()) return setNotice("Enter a username.");
    setSubmitting(true);
    try {
      const data = await collaboratorRequest(`/repo/${id}/collaborators/invitations`, { method: "POST", body: JSON.stringify(form) });
      setState((current) => ({ ...current, invitations: [data.invitation, ...current.invitations] }));
      setForm({ username: "", role: "write", message: "" });
      setNotice("Invitation sent.");
    } catch (error) { setNotice(error.message); }
    finally { setSubmitting(false); }
  };

  const changeRole = async (userId, role) => {
    setNotice("");
    try {
      await collaboratorRequest(`/repo/${id}/collaborators/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setState((current) => ({ ...current, collaborators: current.collaborators.map((item) => item.user._id === userId ? { ...item, role } : item) }));
      setNotice("Role updated.");
    } catch (error) { setNotice(error.message); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.user.username} from this repository?`)) return;
    try {
      await collaboratorRequest(`/repo/${id}/collaborators/${item.user._id}`, { method: "DELETE" });
      setState((current) => ({ ...current, collaborators: current.collaborators.filter((value) => value.user._id !== item.user._id) }));
      setNotice("Collaborator removed.");
    } catch (error) { setNotice(error.message); }
  };

  const cancel = async (invitation) => {
    if (!window.confirm(`Cancel the invitation for ${invitation.invitedUser.username}?`)) return;
    try {
      await collaboratorRequest(`/repo/${id}/collaborators/invitations/${invitation._id}`, { method: "DELETE" });
      setState((current) => ({ ...current, invitations: current.invitations.filter((value) => value._id !== invitation._id) }));
      setNotice("Invitation cancelled.");
    } catch (error) { setNotice(error.message); }
  };

  return <div className="collaborator-page"><Navbar /><main className="collaborator-shell">
    <nav className="collaborator-breadcrumb" aria-label="Breadcrumb"><Link to={`/repo/${id}`}>Repository</Link><span>/</span><span>Settings</span><span>/</span><strong>Collaborators</strong></nav>
    <header><p>Repository Settings</p><h1>Collaborators</h1><span>Manage who can access and contribute to this repository.</span></header>
    {notice && <p className="collaborator-notice" role="status" aria-live="polite">{notice}</p>}
    {state.loading && <p role="status">Loading collaborators...</p>}
    {!state.loading && state.error && <div className="collaborator-error" role="alert">{state.error}<button type="button" onClick={load}>Retry</button></div>}
    {!state.loading && <>
      {state.canManage && <section className="collaborator-panel"><h2>Invite collaborator</h2><form className="collaborator-invite-form" onSubmit={invite}>
        <label>Username<input value={form.username} maxLength={40} required onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="account-b" /></label>
        <label>Role<select aria-label="Invitation role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{roles.map((role) => <option value={role} key={role}>{label(role)}</option>)}</select></label>
        <label className="collaborator-message">Message (optional)<input value={form.message} maxLength={300} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
        <button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send invitation"}</button>
      </form></section>}
      <section className="collaborator-panel"><h2>Current collaborators</h2><ul className="collaborator-list">
        <li><div className="collaborator-avatar" aria-hidden="true">{state.owner?.username?.[0]?.toUpperCase() || "O"}</div><div><strong>{state.owner?.username || "Repository owner"}</strong><span>Owner</span></div><span className="collaborator-role">Owner</span></li>
        {state.collaborators.map((item) => <li key={item.user._id}><div className="collaborator-avatar" aria-hidden="true">{item.user.username?.[0]?.toUpperCase()}</div><div><strong>{item.user.username}</strong><span>Added {new Date(item.addedAt).toLocaleDateString()}</span></div>{state.canManage ? <><select aria-label={`Role for ${item.user.username}`} value={item.role} onChange={(event) => changeRole(item.user._id, event.target.value)}>{roles.map((role) => <option value={role} key={role}>{label(role)}</option>)}</select><button className="collaborator-remove" type="button" onClick={() => remove(item)}>Remove</button></> : <span className="collaborator-role">{label(item.role)}</span>}</li>)}
      </ul></section>
      {state.canManage && <section className="collaborator-panel"><h2>Pending invitations</h2>{state.invitations.length ? <ul className="collaborator-list">{state.invitations.map((item) => <li key={item._id}><div className="collaborator-avatar" aria-hidden="true">{item.invitedUser.username?.[0]?.toUpperCase()}</div><div><strong>{item.invitedUser.username}</strong><span>Invited {new Date(item.createdAt).toLocaleDateString()} · expires {new Date(item.expiresAt).toLocaleDateString()}</span></div><span className="collaborator-role">{label(item.role)}</span><button className="collaborator-remove" type="button" onClick={() => cancel(item)}>Cancel</button></li>)}</ul> : <p className="collaborator-empty">No pending invitations.</p>}</section>}
    </>}
  </main></div>;
};

export default CollaboratorSettingsPage;
