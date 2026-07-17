import React, { useCallback, useEffect, useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

const API_BASE = "https://api.codehub.sbs";
const PullRequestTestResults = ({ repositoryId, number, canView, canSubmit }) => {
  const [state, setState] = useState({ loading: true, results: [], error: "" });
  const [form, setForm] = useState({ status: "passed", summary: "" }); const [saving, setSaving] = useState(false);
  const request = useCallback(async (options) => {
    const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}/test-results`, options);
    const data = await parseResponse(response); if (!response.ok) throw new Error(getResponseError(data, "Unable to load test results")); return data;
  }, [number, repositoryId]);
  const load = useCallback(async () => {
    if (!canView) return;
    try { const data = await request(); setState({ loading: false, results: data.results || [], error: "" }); }
    catch (error) { setState({ loading: false, results: [], error: error.message }); }
  }, [canView, request]);
  useEffect(() => { load(); }, [load]);
  if (!canView) return null;
  const submit = async (event) => {
    event.preventDefault(); if (!form.summary.trim()) return; setSaving(true);
    try { await request({ method: "POST", body: JSON.stringify(form) }); setForm({ status: "passed", summary: "" }); await load(); }
    catch (error) { setState((current) => ({ ...current, error: error.message })); } finally { setSaving(false); }
  };
  return <section className="pull-test-results"><h2>Testing</h2>{state.loading && <p>Loading test results...</p>}{state.error && <p className="pull-error" role="alert">{state.error}</p>}
    {canSubmit && <form onSubmit={submit}><label>Result<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="passed">Passed</option><option value="failed">Failed</option></select></label><label>Testing notes<textarea maxLength="1000" required value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label><button className="pull-primary" disabled={saving}>{saving ? "Saving..." : "Submit test result"}</button></form>}
    {state.results.length ? <ul>{state.results.map((result) => <li key={result._id}><strong className={`test-result--${result.status}`}>{result.status}</strong><span>{result.summary}</span><small>{result.tester?.username || "Tester"} · {new Date(result.createdAt).toLocaleString()}</small></li>)}</ul> : !state.loading && <p>No manual test results yet.</p>}
  </section>;
};
export default PullRequestTestResults;
