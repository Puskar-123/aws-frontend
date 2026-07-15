import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { actionRequest, statusLabel } from "./actionApi";

const PullRequestChecks = ({ repositoryId, number }) => {
  const [state, setState] = useState({ loading: true, error: "", checks: [], summary: {} });
  useEffect(() => { const controller = new AbortController(); actionRequest(`/repo/${repositoryId}/pulls/${number}/checks`, { signal: controller.signal }).then((data) => setState({ loading: false, error: "", checks: data.checks || [], summary: data.summary || {} })).catch((error) => { if (error.name !== "AbortError") setState({ loading: false, error: error.message, checks: [], summary: {} }); }); return () => controller.abort(); }, [number, repositoryId]);
  return <section className="pr-checks"><h2>Checks</h2>{state.loading && <p>Loading checks...</p>}{state.error && <p className="pr-checks-error">{state.error}</p>}{!state.loading && !state.checks.length && <p>No checks reported for the current head.</p>}{state.checks.length > 0 && <><p>{state.summary.success || 0} passed · {state.summary.failure || 0} failed · {state.summary.pending || 0} pending</p><ul>{state.checks.map((check) => <li key={check._id} className={`is-${check.conclusion || check.status}`}><span>{check.conclusion === "success" ? "✓" : check.status === "completed" ? "×" : "○"}</span><Link to={check.detailsUrl}>{check.name}</Link><small>{check.conclusion ? statusLabel(check.conclusion) : check.status === "in_progress" ? "Running" : "Queued"}</small></li>)}</ul></> }</section>;
};
export default PullRequestChecks;
