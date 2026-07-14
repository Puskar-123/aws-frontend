import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import "./branchProtection.css";

const API_BASE = "https://api.codehub.sbs";
const defaults = { branch: "", requirePullRequest: true, requiredApprovals: 1, blockDirectCommits: true, blockForcePush: true, blockDeletion: true, requireResolvedConversations: false, dismissStaleApprovals: false, allowOwnerBypass: true, allowMaintainerBypass: false };
const checks = [
  ["requirePullRequest", "Require pull request before merging"], ["blockDirectCommits", "Block direct commits"],
  ["blockForcePush", "Block force push"], ["blockDeletion", "Block branch deletion"],
  ["requireResolvedConversations", "Require resolved conversations"], ["dismissStaleApprovals", "Dismiss stale approvals"],
  ["allowOwnerBypass", "Allow owner bypass"], ["allowMaintainerBypass", "Allow maintainer bypass"],
];

async function request(path, options = {}) {
  const response = await authenticatedFetch(`${API_BASE}${path}`, options);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(getResponseError(data, "Unable to manage branch protection"));
  return data;
}

const BranchProtectionSettingsPage = () => {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: "", branches: [], protections: [] });
  const [form, setForm] = useState(defaults);
  const [editing, setEditing] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [branchData, protectionData] = await Promise.all([request(`/repo/${id}/branches`), request(`/repo/${id}/branch-protection`)]);
      setState({ loading: false, error: "", branches: branchData.branches || [], protections: protectionData.protections || [] });
      setForm((current) => ({ ...current, branch: current.branch || branchData.defaultBranch || branchData.branches?.[0]?.name || "" }));
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const protectedNames = useMemo(() => new Set(state.protections.map((item) => item.branch)), [state.protections]);
  const edit = (item) => { setEditing(item.branch); setForm({ branch: item.branch, ...item.rules }); setNotice(""); };
  const reset = (protections = state.protections) => {
    const names = new Set(protections.map((item) => item.branch));
    setEditing("");
    setForm({ ...defaults, branch: state.branches.find((branch) => !names.has(branch.name))?.name || "" });
  };
  const save = async (event) => {
    event.preventDefault(); setNotice("");
    const approvals = Number(form.requiredApprovals);
    if (!Number.isInteger(approvals) || approvals < 0 || approvals > 10) return setNotice("Required approvals must be an integer from 0 to 10.");
    setSaving(true);
    try {
      const path = editing ? `/repo/${id}/branch-protection/${encodeURIComponent(editing)}` : `/repo/${id}/branch-protection`;
      const data = await request(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...form, requiredApprovals: approvals }) });
      const protections = editing
        ? state.protections.map((item) => item.branch === editing ? data.protection : item)
        : [...state.protections, data.protection];
      setState((current) => ({ ...current, protections }));
      setNotice(editing ? "Branch protection updated." : "Branch protection created."); reset(protections);
    } catch (error) { setNotice(error.message); } finally { setSaving(false); }
  };
  const remove = async (item) => {
    if (!window.confirm(`Remove protection from ${item.branch}?`)) return;
    try { await request(`/repo/${id}/branch-protection/${encodeURIComponent(item.branch)}`, { method: "DELETE" }); const protections = state.protections.filter((rule) => rule.branch !== item.branch); setState((current) => ({ ...current, protections })); setNotice("Branch protection removed."); reset(protections); }
    catch (error) { setNotice(error.message); }
  };
  return <div className="branch-protection-page"><Navbar /><main className="branch-protection-shell">
    <nav className="branch-protection-breadcrumb" aria-label="Breadcrumb"><Link to={`/repo/${id}`}>Repository</Link><span>/</span><strong>Branch protection</strong></nav>
    <header><p>Repository Settings</p><h1>Branch protection</h1><span>Require pull requests and prevent direct changes to important branches.</span></header>
    {notice && <p className="branch-protection-notice" role="status" aria-live="polite">{notice}</p>}
    {state.loading && <p role="status">Loading branch protection...</p>}
    {state.error && <div className="branch-protection-error" role="alert">{state.error}<button type="button" onClick={load}>Retry</button></div>}
    {!state.loading && !state.error && <>
      <section className="branch-protection-panel"><h2>{editing ? `Edit ${editing}` : "Add rule"}</h2><form onSubmit={save}>
        <label>Branch<select value={form.branch} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, branch: event.target.value })}><option value="" disabled>Select a branch</option>{state.branches.map((branch) => <option key={branch.name} value={branch.name} disabled={!editing && protectedNames.has(branch.name)}>{branch.name}{branch.isDefault ? " (default)" : ""}</option>)}</select></label>
        <label>Required approvals<input type="number" min="0" max="10" step="1" value={form.requiredApprovals} onChange={(event) => setForm({ ...form, requiredApprovals: event.target.value })} /></label>
        <fieldset><legend>Rules</legend>{checks.map(([field, text]) => {
          const unavailable = field === "requireResolvedConversations";
          return <label className="branch-protection-check" key={field}><input type="checkbox" disabled={unavailable} checked={Boolean(form[field])} onChange={(event) => setForm({ ...form, [field]: event.target.checked })} /><span>{text}{unavailable ? " (available when review threads are supported)" : ""}</span></label>;
        })}</fieldset>
        <div className="branch-protection-actions">{editing && <button type="button" className="secondary" onClick={reset}>Cancel</button>}<button type="submit" disabled={saving || !form.branch}>{saving ? "Saving..." : "Save protection rule"}</button></div>
      </form></section>
      <section className="branch-protection-panel"><h2>Protected branches</h2>{state.protections.length === 0 ? <p className="branch-protection-empty">No protected branches.</p> : <ul className="branch-protection-list">{state.protections.map((item) => <li key={item.branch}><div><h3>{item.branch} <span className="protected-badge">Protected</span></h3><p>Require pull request: {item.rules.requirePullRequest ? "Yes" : "No"} · Required approvals: {item.rules.requiredApprovals}</p><p>Block direct commits: {item.rules.blockDirectCommits ? "Yes" : "No"} · Block deletion: {item.rules.blockDeletion ? "Yes" : "No"} · Owner bypass: {item.rules.allowOwnerBypass ? "Yes" : "No"}</p></div><div className="branch-protection-row-actions"><button type="button" onClick={() => edit(item)}>Edit</button><button className="danger" type="button" onClick={() => remove(item)}>Remove</button></div></li>)}</ul>}</section>
    </>}
  </main></div>;
};

export default BranchProtectionSettingsPage;
