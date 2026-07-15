import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import { actionRequest, formatDuration, statusLabel } from "./actionApi";
import "./actions.css";

const ActionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: "all", branch: "", event: "", workflow: "", search: "", page: 1 });
  const [state, setState] = useState({ loading: true, error: "", runs: [], workflows: [], branches: [], pagination: {}, counts: {}, canManage: false });
  const [dispatching, setDispatching] = useState(null); const [dispatchBranch, setDispatchBranch] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== "all"));
      const [runs, workflows, branches] = await Promise.all([actionRequest(`/repo/${id}/actions/runs?${query}`, { signal }), actionRequest(`/repo/${id}/actions/workflows`, { signal }), actionRequest(`/repo/${id}/branches`, { signal })]);
      setState({ loading: false, error: "", runs: runs.runs || [], workflows: workflows.workflows || [], branches: branches.branches || [], pagination: runs.pagination || {}, counts: runs.counts || {}, canManage: Boolean(runs.canManage) });
      setDispatchBranch((current) => current || branches.defaultBranch || branches.branches?.[0]?.name || "");
    } catch (error) { if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [filters, id]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => load(controller.signal), filters.search ? 250 : 0); return () => { clearTimeout(timer); controller.abort(); }; }, [filters.search, load]);
  const change = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: name === "page" ? value : 1 }));
  const dispatch = async () => { if (!dispatching) return; setBusy(true); try { const data = await actionRequest(`/repo/${id}/actions/workflows/${dispatching._id}/dispatch`, { method: "POST", body: JSON.stringify({ branch: dispatchBranch, workflowPath: dispatching.path }) }); setDispatching(null); navigate(`/repo/${id}/actions/runs/${data.run._id}`); } catch (error) { setState((current) => ({ ...current, error: error.message })); } finally { setBusy(false); } };
  const statuses = ["all", "queued", "running", "success", "failure", "cancelled", "timed_out"];
  return <div className="actions-page"><Navbar /><main className="actions-shell">
    <header className="actions-heading"><div><p><Link to={`/repo/${id}`}>← Repository</Link></p><h1>Actions</h1><span>Workflow automation and status checks</span></div>{state.canManage && state.workflows.some((item) => item.enabled && item.validationStatus === "valid" && item.triggers?.includes("workflow_dispatch")) && <button className="actions-primary" onClick={() => setDispatching(state.workflows.find((item) => item.enabled && item.validationStatus === "valid" && item.triggers?.includes("workflow_dispatch")))}>Run workflow</button>}</header>
    {state.error && <div className="actions-state actions-state--error" role="alert">{state.error}<button onClick={() => load()}>Retry</button></div>}
    <div className="actions-layout"><aside className="actions-sidebar"><button className={!filters.workflow ? "is-active" : ""} onClick={() => change("workflow", "")}>All workflows</button>{state.workflows.map((workflow) => <button key={workflow._id} className={filters.workflow === workflow._id ? "is-active" : ""} onClick={() => change("workflow", workflow._id)} title={(workflow.validationErrors || []).join("\n")}>{workflow.name}{workflow.validationStatus === "invalid" && <span>Invalid: {workflow.validationErrors?.[0] || "validation failed"}</span>}</button>)}</aside><section className="actions-content">
      <div className="actions-filters"><input aria-label="Search workflow runs" type="search" placeholder="Search workflow, commit, or branch" value={filters.search} onChange={(event) => change("search", event.target.value)} /><select aria-label="Workflow status" value={filters.status} onChange={(event) => change("status", event.target.value)}>{statuses.map((status) => <option value={status} key={status}>{status === "all" ? "All statuses" : statusLabel(status)}</option>)}</select><select aria-label="Branch" value={filters.branch} onChange={(event) => change("branch", event.target.value)}><option value="">All branches</option>{state.branches.map((branch) => <option key={branch.name}>{branch.name}</option>)}</select><select aria-label="Event" value={filters.event} onChange={(event) => change("event", event.target.value)}><option value="">All events</option><option value="push">Push</option><option value="pull_request">Pull request</option><option value="workflow_dispatch">Manual</option></select></div>
      {state.loading && <div className="actions-state" role="status">Loading workflow runs...</div>}
      {!state.loading && !state.runs.length && <div className="actions-state"><h2>No workflow runs yet</h2><p>Add a valid <code>.codehub/workflows/*.yml</code> file and push a commit.</p></div>}
      {!state.loading && <div className="actions-runs">{state.runs.map((run) => <article key={run._id} className={`actions-run is-${run.status}`}><span className="actions-status-icon" aria-label={statusLabel(run.status)}>{run.status === "success" ? "✓" : run.status === "failure" ? "×" : run.status === "running" ? "●" : "○"}</span><div><h2><Link to={`/repo/${id}/actions/runs/${run._id}`}>{run.workflowName}</Link> <small>#{run.attempt}</small></h2><p>{run.commitMessage || "No commit message"}</p><div className="actions-run-meta"><span>{run.branch}</span><span>{run.trigger}</span><span>{run.actor?.username || "Deleted user"}</span><span>{statusLabel(run.status)}</span><span>{formatDuration(run.durationMs)}</span><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString()}</time></div></div></article>)}</div>}
      {(state.pagination.pages || 0) > 1 && <nav className="actions-pagination"><button disabled={filters.page <= 1} onClick={() => change("page", filters.page - 1)}>Previous</button><span>Page {filters.page} of {state.pagination.pages}</span><button disabled={filters.page >= state.pagination.pages} onClick={() => change("page", filters.page + 1)}>Next</button></nav>}
    </section></div>
    {dispatching && <div className="actions-modal-backdrop" role="presentation"><section className="actions-modal" role="dialog" aria-modal="true" aria-labelledby="dispatch-title"><h2 id="dispatch-title">Run {dispatching.name}</h2><label>Branch<select value={dispatchBranch} onChange={(event) => setDispatchBranch(event.target.value)}>{state.branches.map((branch) => <option key={branch.name}>{branch.name}</option>)}</select></label><p>This queues a safe mock run. Repository commands remain disabled.</p><div><button className="actions-secondary" onClick={() => setDispatching(null)}>Cancel</button><button className="actions-primary" disabled={busy} onClick={dispatch}>{busy ? "Queueing…" : "Run workflow"}</button></div></section></div>}
  </main></div>;
};
export default ActionsPage;
