import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../Navbar";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import ActivityTimeline from "./ActivityTimeline";
import BranchSummary from "./BranchSummary";
import CommitActivityChart from "./CommitActivityChart";
import ContributorTable from "./ContributorTable";
import InsightsRangeSelector from "./InsightsRangeSelector";
import InsightsTabs from "./InsightsTabs";
import IssuePrSummary from "./IssuePrSummary";
import LanguageBreakdown from "./LanguageBreakdown";
import MostChangedFiles from "./MostChangedFiles";
import "./insights.css";

const API_BASE = "https://api.codehub.sbs";
const validRanges = new Set(["7d", "30d", "90d", "1y", "all"]);
const endpoints = {
  overview: ["overview", "commits", "languages", "issues", "pull-requests", "branches", "activity", "files"],
  commits: ["commits", "branches"], contributors: ["contributors"], activity: ["activity"],
};

const InsightsPage = ({ view = "overview" }) => {
  const { id } = useParams(); const [params, setParams] = useSearchParams();
  const range = validRanges.has(params.get("range")) ? params.get("range") : "30d";
  const branch = params.get("branch") || ""; const filter = params.get("type") || "all"; const page = Math.max(1, Number(params.get("page")) || 1);
  const [state, setState] = useState({ loading: true, error: "", data: {} });
  const requestPaths = useMemo(() => endpoints[view] || endpoints.overview, [view]);
  const updateParams = (changes) => setParams((current) => { const next = new URLSearchParams(current); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key)); return next; });
  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const pairs = await Promise.all(requestPaths.map(async (endpoint) => {
        const query = new URLSearchParams({ range });
        if (endpoint === "commits" && branch) query.set("branch", branch);
        if (endpoint === "activity") { query.set("type", filter); query.set("page", String(page)); }
        const response = await authenticatedFetch(`${API_BASE}/repo/${id}/insights/${endpoint}?${query}`, { signal });
        const data = await parseResponse(response);
        if (!response.ok) throw new Error(getResponseError(data, "Unable to load repository insights."));
        return [endpoint, data];
      }));
      setState({ loading: false, error: "", data: Object.fromEntries(pairs) });
    } catch (error) { if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [branch, filter, id, page, range, requestPaths]);
  useEffect(() => { const controller = new AbortController(); Promise.resolve().then(() => load(controller.signal)); return () => controller.abort(); }, [load]);
  const retry = () => load(); const overview = state.data.overview; const commits = state.data.commits;
  return <div className="insights-page"><Navbar /><main className="insights-shell">
    <header className="insights-header"><div><Link to={`/repo/${id}`}>Repository</Link><h1>Repository insights</h1><p>Activity and health metrics calculated from stored repository data.</p></div><InsightsRangeSelector value={range} onChange={(value) => updateParams({ range: value, page: "" })} /></header>
    <InsightsTabs repositoryId={id} active={view} range={range} />
    {state.loading && <div className="insights-state" role="status" aria-live="polite">Loading repository insights...</div>}
    {state.error && <div className="insights-state insights-state--error" role="alert"><p>{state.error}</p><button type="button" onClick={retry}>Retry</button></div>}
    {!state.loading && !state.error && view === "overview" && <>
      <section className="insights-cards" aria-label="Repository summary">{[
        ["Commits", overview?.summary?.commits], ["Contributors", overview?.summary?.contributors], ["Branches", overview?.summary?.branches], ["Open issues", overview?.summary?.openIssues], ["Merged PRs", overview?.summary?.mergedPullRequests], ["Stars", overview?.summary?.stars], ["Forks", overview?.summary?.forks], ["Watchers", overview?.summary?.watchers],
      ].map(([label, value]) => <article key={label}><strong>{Number(value || 0).toLocaleString()}</strong><span>{label}</span></article>)}</section>
      <section className="insights-panel"><div className="insights-section-heading"><div><h2>Commit activity</h2><p>{commits?.totalCommits || 0} commits · {commits?.timezone || "UTC"}</p></div></div><CommitActivityChart data={commits} /></section>
      <div className="insights-grid"><LanguageBreakdown data={state.data.languages} /><IssuePrSummary issues={state.data.issues} pulls={state.data["pull-requests"]} /></div>
      <BranchSummary data={state.data.branches} /><div className="insights-grid"><ActivityTimeline data={state.data.activity} /><MostChangedFiles data={state.data.files} /></div>
    </>}
    {!state.loading && !state.error && view === "commits" && <><section className="insights-panel"><div className="insights-section-heading"><div><h2>Commit activity</h2><p>{commits?.totalCommits || 0} commits · {commits?.timezone || "UTC"}</p></div><label>Branch<select value={branch} onChange={(event) => updateParams({ branch: event.target.value })}><option value="">All branches</option>{(state.data.branches?.branches || []).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label></div><CommitActivityChart data={commits} /></section><BranchSummary data={state.data.branches} /></>}
    {!state.loading && !state.error && view === "contributors" && <ContributorTable data={state.data.contributors} />}
    {!state.loading && !state.error && view === "activity" && <><ActivityTimeline data={state.data.activity} filter={filter} onFilter={(value) => updateParams({ type: value === "all" ? "" : value, page: "" })} /><nav className="insights-pagination" aria-label="Activity pages"><button type="button" disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>Previous</button><span>Page {page}</span><button type="button" disabled={!state.data.activity?.pagination?.hasMore} onClick={() => updateParams({ page: page + 1 })}>Next</button></nav></>}
  </main></div>;
};

export default InsightsPage;
