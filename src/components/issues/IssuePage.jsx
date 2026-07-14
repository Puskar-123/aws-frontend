import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import IssueConversation from "./IssueConversation";
import IssueHeader from "./IssueHeader";
import IssueSidebar from "./IssueSidebar";
import "./issues.css";

const API_BASE = "https://api.codehub.sbs";

const IssuePage = () => {
  const { id, number } = useParams();
  const [state, setState] = useState({ loading: true, error: "", issue: null, permissions: {} });
  const [acting, setActing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", priority: "none" });
  const load = useCallback(async (signal) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${id}/issues/${number}`, { signal });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to load issue"));
      setState({ loading: false, error: "", issue: data.issue, permissions: data.permissions || {} });
    } catch (error) {
      if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }, [id, number]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);

  const transition = async (action) => {
    setActing(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${id}/issues/${number}/${action}`, { method: "POST" });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, `Unable to ${action} issue`));
      setState((current) => ({ ...current, issue: data.issue, error: "" }));
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
    finally { setActing(false); }
  };
  const beginEdit = () => { setDraft({ title: state.issue.title, body: state.issue.body || "", priority: state.issue.priority || "none" }); setEditing(true); };
  const saveEdit = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) { setState((current) => ({ ...current, error: "Title is required" })); return; }
    setActing(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${id}/issues/${number}`, { method: "PATCH", body: JSON.stringify(draft) });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to update issue"));
      setState((current) => ({ ...current, issue: data.issue, error: "" })); setEditing(false);
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
    finally { setActing(false); }
  };

  if (state.loading) return <div className="issues-page"><Navbar /><main className="issue-state" role="status">Loading issue...</main></div>;
  if (!state.issue) return <div className="issues-page"><Navbar /><main className="issue-state issue-state--error" role="alert">{state.error || "Issue not found"}</main></div>;
  return <div className="issues-page"><Navbar /><main className="issues-container">
    <p><Link to={`/repo/${id}/issues`}>← Issues</Link></p><IssueHeader issue={state.issue} />
    {state.error && <div className="issue-error" role="alert">{state.error}</div>}
    {editing && <form className="issue-form issue-edit-form" onSubmit={saveEdit}>
      <label>Title<input value={draft.title} maxLength="200" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
      <label>Description<textarea rows="8" maxLength="20000" value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} /></label>
      <label>Priority<select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>{["none", "low", "medium", "high", "critical"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="issue-edit-actions"><button type="button" className="issue-secondary" onClick={() => setEditing(false)}>Cancel</button><button className="issue-primary" disabled={acting}>{acting ? "Saving..." : "Save changes"}</button></div>
    </form>}
    <div className="issue-detail-layout"><IssueConversation repositoryId={id} issue={state.issue} canComment={state.permissions.canComment} onComment={(comment) => setState((current) => ({ ...current, issue: { ...current.issue, comments: [...(current.issue.comments || []), comment] } }))} /><div><IssueSidebar issue={state.issue} />{state.permissions.canEdit && <><button className="issue-secondary" disabled={acting} onClick={() => transition(state.issue.status === "open" ? "close" : "reopen")}>{acting ? "Updating..." : state.issue.status === "open" ? "Close issue" : "Reopen issue"}</button>{!editing && <button className="issue-secondary" onClick={beginEdit}>Edit issue</button>}</>}</div></div>
  </main></div>;
};

export default IssuePage;
