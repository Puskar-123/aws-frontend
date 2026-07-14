import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { authenticatedFetch, getAuthToken, getResponseError, parseResponse } from "../../utils/api";
import CompareCommits from "../compare/CompareCommits";
import Navbar from "../Navbar";
import PullRequestConversation from "./PullRequestConversation";
import PullRequestHeader from "./PullRequestHeader";
import PullRequestTabs from "./PullRequestTabs";
import PullRequestFiles from "./PullRequestFiles";
import "./pulls.css";

const API_BASE = "https://api.codehub.sbs";

const PullRequestPage = () => {
  const { id, number } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const active = ["conversation", "commits", "files"].includes(requestedTab) ? requestedTab : "conversation";
  const setActive = (tab) => setSearchParams(tab === "conversation" ? {} : { tab });
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const load = useCallback(async (signal) => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE}/repo/${id}/pulls/${number}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to load pull request"));
      setState({ loading: false, error: "", data });
    } catch (error) { if (error.name !== "AbortError") setState({ loading: false, error: error.message, data: null }); }
  }, [id, number]);
  useEffect(() => { const controller = new AbortController(); Promise.resolve().then(() => load(controller.signal)); return () => controller.abort(); }, [load]);

  const action = async (name) => {
    setState((current) => ({ ...current, error: "" }));
    const response = await authenticatedFetch(`${API_BASE}/repo/${id}/pulls/${number}/${name}`, { method: "POST" });
    const data = await parseResponse(response);
    if (!response.ok) { const message = getResponseError(data, `Unable to ${name} pull request`); setState((current) => ({ ...current, error: message })); throw new Error(message); }
    await load();
  };

  if (state.loading) return <div className="pull-page"><Navbar /><main className="pull-container"><div className="pull-state" role="status">Loading pull request...</div></main></div>;
  if (state.error && !state.data) return <div className="pull-page"><Navbar /><main className="pull-container"><div className="pull-state pull-state--error" role="alert">{state.error}</div></main></div>;
  const { pullRequest, comparison, mergeability, permissions, reviewSummary, historicalUnavailable } = state.data;
  const commits = comparison?.commits || [];
  const files = comparison?.files || [];
  return <div className="pull-page"><Navbar /><main className="pull-container">
    <PullRequestHeader repositoryId={id} pullRequest={pullRequest} protection={mergeability?.branchProtection} />
    {state.error && <div className="pull-error" role="alert">{state.error}</div>}
    {comparison && comparison.ancestryAvailable === false && <div className="pull-warning">Commit ancestry unavailable for this legacy history</div>}
    {historicalUnavailable && <div className="pull-warning">Historical comparison unavailable for this legacy pull request.</div>}
    <PullRequestTabs active={active} onChange={setActive} commits={commits.length} files={files.length} unavailable={historicalUnavailable} />
    <div role="tabpanel">
      {active === "conversation" && <PullRequestConversation repositoryId={id} pullRequest={pullRequest} mergeability={mergeability} permissions={permissions} reviewSummary={reviewSummary} currentHead={comparison?.compare?.head || ""} onComment={(comment) => setState((current) => ({ ...current, data: { ...current.data, pullRequest: { ...current.data.pullRequest, comments: [...current.data.pullRequest.comments, comment] } } }))} onReview={() => load()} onMerge={() => action("merge")} onClose={() => action("close")} onReopen={() => action("reopen")} />}
      {active === "commits" && (historicalUnavailable ? <div className="pull-state">Historical commits are unavailable.</div> : <CompareCommits commits={commits} />)}
      {active === "files" && (historicalUnavailable ? <div className="pull-state">Historical file changes are unavailable.</div> : <PullRequestFiles repositoryId={id} pullRequest={pullRequest} permissions={permissions} initialFiles={files} initialSummary={comparison?.summary || {}} onReview={() => load()} />)}
    </div>
  </main></div>;
};

export default PullRequestPage;
