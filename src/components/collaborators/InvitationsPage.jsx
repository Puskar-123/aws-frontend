import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Navbar";
import { collaboratorRequest } from "./collaboratorApi";
import "./collaborators.css";

const InvitationsPage = () => {
  const [state, setState] = useState({ loading: true, error: "", invitations: [] });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try { const data = await collaboratorRequest("/invitations"); setState({ loading: false, error: "", invitations: data.invitations || [] }); }
    catch (error) { setState({ loading: false, error: error.message, invitations: [] }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const respond = async (invitation, action) => {
    setBusy(invitation._id); setNotice("");
    try {
      await collaboratorRequest(`/invitations/${invitation._id}/${action}`, { method: "PATCH" });
      setState((current) => ({ ...current, invitations: current.invitations.filter((item) => item._id !== invitation._id) }));
      setNotice(`Invitation ${action === "accept" ? "accepted" : "declined"}.`);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };
  return <div className="collaborator-page"><Navbar /><main className="invitation-shell"><header><p>CodeHub access</p><h1>Repository invitations</h1><span>Review invitations to collaborate on repositories.</span></header>{notice && <p className="collaborator-notice" aria-live="polite">{notice}</p>}{state.loading && <p role="status">Loading invitations...</p>}{state.error && <div className="collaborator-error" role="alert">{state.error}<button type="button" onClick={load}>Retry</button></div>}{!state.loading && !state.error && !state.invitations.length && <section className="collaborator-panel collaborator-empty"><h2>No pending invitations</h2><p>New repository invitations will appear here.</p></section>}{state.invitations.map((item) => <article className="invitation-card" key={item._id}><p>Repository invitation</p><h2>{item.invitedBy?.username || "A repository owner"} invited you to collaborate on:</h2><Link to={`/repo/${item.repository._id}`}>{item.repository.owner?.username ? `${item.repository.owner.username} / ` : ""}<strong>{item.repository.name}</strong></Link><dl><div><dt>Role</dt><dd>{item.role[0].toUpperCase() + item.role.slice(1)}</dd></div><div><dt>Expires</dt><dd>{new Date(item.expiresAt).toLocaleDateString()}</dd></div></dl>{item.message && <blockquote>{item.message}</blockquote>}<div className="invitation-actions"><button type="button" disabled={busy === item._id} onClick={() => respond(item, "accept")}>Accept</button><button className="secondary" type="button" disabled={busy === item._id} onClick={() => respond(item, "decline")}>Decline</button></div></article>)}</main></div>;
};

export default InvitationsPage;
