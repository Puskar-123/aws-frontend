import React, { useCallback, useEffect, useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import PullIdentity from "./PullIdentityView";

const API_BASE = "https://api.codehub.sbs";

const RequestedReviewers = ({ repositoryId, number, canManage }) => {
  const [state, setState] = useState({ loading: true, error: "", requested: [], candidates: [] });
  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}/reviewers`);
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to load reviewers"));
      setState({ loading: false, error: "", requested: data.requestedReviewers || [], candidates: data.candidates || [] });
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [repositoryId, number]);
  useEffect(() => { load(); }, [load]);
  const request = async (userId) => {
    const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}/reviewers`, { method: "POST", body: JSON.stringify({ userId }) });
    const data = await parseResponse(response);
    if (!response.ok) return setState((current) => ({ ...current, error: getResponseError(data, "Unable to request reviewer") }));
    await load();
  };
  const remove = async (userId) => {
    const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}/reviewers/${userId}`, { method: "DELETE" });
    const data = await parseResponse(response);
    if (!response.ok) return setState((current) => ({ ...current, error: getResponseError(data, "Unable to remove reviewer") }));
    await load();
  };
  return <section className="requested-reviewers"><h2>Reviewers</h2>{state.loading && <p role="status">Loading reviewers...</p>}{state.error && <p className="pull-error" role="alert">{state.error}</p>}{!state.loading && state.requested.length === 0 && <p>No reviewers requested.</p>}{state.requested.map((item) => <div className="requested-reviewer" key={item._id || item.user?._id}><PullIdentity identity={item.user} /><span>{String(item.status || "requested").replaceAll("_", " ")}</span>{canManage && <button type="button" aria-label={`Remove reviewer ${item.user?.username || "user"}`} onClick={() => remove(item.user?._id)}>×</button>}</div>)}{canManage && state.candidates.length > 0 && <label>Request reviewer<select defaultValue="" onChange={(event) => { if (event.target.value) request(event.target.value); event.target.value = ""; }}><option value="">Select reviewer</option>{state.candidates.map((user) => <option key={user._id} value={user._id}>{user.username || user.name} ({user.role})</option>)}</select></label>}</section>;
};

export default RequestedReviewers;
