import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import IssueFilters from "./IssueFilters";
import IssueListItem from "./IssueListItem";
import "./issues.css";

const API_BASE = "https://api.codehub.sbs";

const IssueList = () => {
  const { id } = useParams();
  const [filters, setFilters] = useState({ status: "open", search: "", label: "", priority: "", assignee: "", sort: "updated", page: 1 });
  const [state, setState] = useState({ loading: true, error: "", issues: [], counts: {}, pagination: {} });
  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
      const response = await authenticatedFetch(`${API_BASE}/repo/${id}/issues?${query}`, { signal });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to load issues"));
      setState({ loading: false, error: "", issues: data.issues || [], counts: data.counts || {}, pagination: data.pagination || {} });
    } catch (error) { if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [filters, id]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => load(controller.signal), filters.search ? 250 : 0); return () => { clearTimeout(timer); controller.abort(); }; }, [filters, load]);
  const change = (name, value) => setFilters((current) => ({ ...current, [name]: value, page: name === "page" ? value : 1 }));
  return <div className="issues-page"><Navbar /><main className="issues-container">
    <header className="issues-heading"><div><p><Link to={`/repo/${id}`}>← Repository</Link></p><h1>Issues</h1></div><Link className="issue-primary" to={`/repo/${id}/issues/new`}>New issue</Link></header>
    <IssueFilters filters={filters} counts={state.counts} onChange={change} />
    {state.loading && <div className="issue-state" role="status">Loading issues...</div>}
    {state.error && <div className="issue-state issue-state--error" role="alert">{state.error}</div>}
    {!state.loading && !state.error && <section className="issue-list">{state.issues.length ? state.issues.map((issue) => <IssueListItem key={issue._id} repositoryId={id} issue={issue} />) : <div className="issue-state">No {filters.status} issues found.</div>}</section>}
    {(state.pagination.pages || 0) > 1 && <nav className="issue-pagination" aria-label="Issue pages"><button disabled={filters.page <= 1} onClick={() => change("page", filters.page - 1)}>Previous</button><span>Page {filters.page} of {state.pagination.pages}</span><button disabled={filters.page >= state.pagination.pages} onClick={() => change("page", filters.page + 1)}>Next</button></nav>}
  </main></div>;
};

export default IssueList;
