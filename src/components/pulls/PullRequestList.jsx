import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuthToken, getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import PullRequestListItem from "./PullRequestListItem";
import "./pulls.css";

const API_BASE = "https://api.codehub.sbs";
const STATUSES = ["open", "closed", "merged", "all"];

const PullRequestList = () => {
  const { id } = useParams();
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  useEffect(() => {
    const controller = new AbortController();
    const token = getAuthToken();
    Promise.resolve().then(() => setState((current) => ({ ...current, loading: true, error: "" })));
    fetch(`${API_BASE}/repo/${id}/pulls?status=${status}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    }).then(async (response) => {
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to load pull requests"));
      setState({ loading: false, error: "", items: data.pullRequests || [] });
    }).catch((error) => { if (error.name !== "AbortError") setState({ loading: false, error: error.message, items: [] }); });
    return () => controller.abort();
  }, [id, status]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return state.items;
    return state.items.filter((pull) => pull.title.toLowerCase().includes(query) || String(pull.number) === query.replace(/^#/, ""));
  }, [search, state.items]);

  return <div className="pull-page"><Navbar /><main className="pull-container">
    <header className="pull-list-header"><div><p><Link to={`/repo/${id}`}>Repository</Link></p><h1>Pull requests</h1></div><Link className="pull-primary" to={`/repo/${id}/compare`}>New pull request</Link></header>
    <div className="pull-list-controls" role="group" aria-label="Pull request filters">
      {STATUSES.map((value) => <button key={value} type="button" className={status === value ? "is-active" : ""} onClick={() => setStatus(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      <label><span className="sr-only">Search pull requests</span><input type="search" placeholder="Search pull requests" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    </div>
    {state.loading && <div className="pull-state" role="status">Loading pull requests...</div>}
    {state.error && <div className="pull-state pull-state--error" role="alert">{state.error}</div>}
    {!state.loading && !state.error && !filtered.length && <div className="pull-state">No {status === "all" ? "" : status} pull requests found.</div>}
    {!state.loading && !state.error && <section className="pull-list" aria-label="Pull requests">{filtered.map((pull) => <PullRequestListItem key={pull.number} repositoryId={id} pullRequest={pull} />)}</section>}
  </main></div>;
};

export default PullRequestList;
