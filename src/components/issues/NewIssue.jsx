import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import "./issues.css";

const API_BASE = "https://api.codehub.sbs";

const NewIssue = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", body: "", priority: "none", label: "" });
  const [state, setState] = useState({ submitting: false, error: "" });
  const submit = async (event) => { event.preventDefault(); if (!form.title.trim()) { setState({ submitting: false, error: "Title is required" }); return; } setState({ submitting: true, error: "" });
    try { const labels = form.label.trim() ? [{ name: form.label.trim(), color: "6e7681" }] : []; const response = await authenticatedFetch(`${API_BASE}/repo/${id}/issues`, { method: "POST", body: JSON.stringify({ title: form.title, body: form.body, priority: form.priority, labels }) }); const data = await parseResponse(response); if (!response.ok) throw new Error(getResponseError(data, "Unable to create issue")); navigate(`/repo/${id}/issues/${data.issue.number}`); }
    catch (error) { setState({ submitting: false, error: error.message }); }
  };
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return <div className="issues-page"><Navbar /><main className="issues-container issues-container--form"><p><Link to={`/repo/${id}/issues`}>← Issues</Link></p><h1>New issue</h1><form className="issue-form" onSubmit={submit}>
    <label>Title<input value={form.title} maxLength="200" onChange={(event) => update("title", event.target.value)} /></label>
    <label>Description<textarea rows="12" maxLength="20000" value={form.body} onChange={(event) => update("body", event.target.value)} placeholder="Describe the problem, expected behavior, and steps to reproduce" /></label>
    <div className="issue-form-row"><label>Priority<select value={form.priority} onChange={(event) => update("priority", event.target.value)}>{["none", "low", "medium", "high", "critical"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Label<input value={form.label} maxLength="50" onChange={(event) => update("label", event.target.value)} placeholder="bug" /></label></div>
    {state.error && <div className="issue-error" role="alert">{state.error}</div>}<button className="issue-primary" disabled={state.submitting}>{state.submitting ? "Submitting..." : "Submit new issue"}</button>
  </form></main></div>;
};

export default NewIssue;
