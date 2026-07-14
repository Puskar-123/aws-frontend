import React, { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import Navbar from "../Navbar";
import ExplorePagination from "./ExplorePagination";
import RepositorySearchCard from "./RepositorySearchCard";
import { discoveryRequest } from "./exploreApi";
import "./explore.css";

const LANGUAGES = ["JavaScript", "TypeScript", "Python", "Java", "C", "C++", "Go", "Rust", "PHP", "Ruby", "Shell", "CSS", "HTML"];
const ExplorePage = () => {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get("q") || "");
  const [data, setData] = useState({ repositories: [], pagination: null });
  const [state, setState] = useState({ loading: true, error: "" });
  const [retry, setRetry] = useState(0);
  const query = params.get("q") || ""; const sort = params.get("sort") || "recent"; const language = params.get("language") || ""; const page = Math.max(1, Number(params.get("page")) || 1);
  const update = (changes) => setParams((current) => { const next = new URLSearchParams(current); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); return next; });

  useEffect(() => { setDraft(query); }, [query]);
  useEffect(() => {
    const controller = new AbortController(); setState({ loading: true, error: "" });
    const search = new URLSearchParams({ sort, page: String(page), limit: "20" }); if (query) search.set("q", query); if (language) search.set("language", language);
    discoveryRequest(`/repo/explore?${search}`, { signal: controller.signal })
      .then((result) => { setData(result); setState({ loading: false, error: "" }); })
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, error: error.message }); });
    return () => controller.abort();
  }, [language, page, query, retry, sort]);

  return <div className="explore-page"><Navbar /><main className="explore-container">
    <header><h1>Explore repositories</h1><p>Discover public projects from the CodeHub community.</p></header>
    <form className="explore-search" onSubmit={(event) => { event.preventDefault(); update({ q: draft.trim(), page: "" }); }}><label htmlFor="explore-query">Search public repositories or users</label><div><FiSearch aria-hidden="true" /><input id="explore-query" type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search public repositories or users..." /><button type="submit">Search</button></div></form>
    <div className="explore-filters"><label>Sort<select value={sort} onChange={(event) => update({ sort: event.target.value, page: "" })}><option value="recent">Recently updated</option><option value="stars">Most stars</option><option value="forks">Most forks</option><option value="watchers">Most watched</option><option value="name">Name</option></select></label><label>Language<select value={language} onChange={(event) => update({ language: event.target.value, page: "" })}><option value="">All languages</option>{LANGUAGES.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    {state.loading && <p className="explore-state" role="status">Loading public repositories...</p>}
    {state.error && <div className="explore-state explore-state--error" role="alert"><p>Unable to load repositories. {state.error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
    {!state.loading && !state.error && !data.repositories.length && <p className="explore-state">No public repositories found.</p>}
    {!state.loading && !state.error && <section className="explore-results" aria-live="polite" aria-label="Public repository results">{data.repositories.map((repository) => <RepositorySearchCard key={repository._id} repository={repository} />)}</section>}
    <ExplorePagination pagination={data.pagination} onPage={(next) => update({ page: String(next) })} />
  </main></div>;
};
export default ExplorePage;
