import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../Navbar";
import RepositorySearchCard from "../explore/RepositorySearchCard";
import { discoveryRequest } from "../explore/exploreApi";
import UserSearchCard from "./UserSearchCard";
import "./search.css";

const SearchResultsPage = () => {
  const [params, setParams] = useSearchParams(); const query = params.get("q") || ""; const type = params.get("type") || "all"; const page = Math.max(1, Number(params.get("page")) || 1);
  const [data, setData] = useState({ repositories: [], users: [], pagination: {} }); const [state, setState] = useState({ loading: false, error: "" });
  const update = (changes) => setParams((current) => { const next = new URLSearchParams(current); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); return next; });
  useEffect(() => {
    if (!query.trim()) { setData({ repositories: [], users: [], pagination: {} }); setState({ loading: false, error: "" }); return undefined; }
    const controller = new AbortController(); setState({ loading: true, error: "" });
    discoveryRequest(`/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}&page=${page}&limit=20`, { signal: controller.signal })
      .then((result) => { setData(result); setState({ loading: false, error: "" }); })
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, error: error.message }); });
    return () => controller.abort();
  }, [page, query, type]);
  const hasResults = data.repositories?.length || data.users?.length; const activePagination = type === "users" ? data.pagination?.users : data.pagination?.repositories;
  return <div className="search-page"><Navbar /><main className="search-container"><h1>{query ? <>Search results for “{query}”</> : "Search ContalSystem"}</h1>
    <nav className="search-tabs" aria-label="Search result types">{["all", "repositories", "users"].map((item) => <button key={item} type="button" className={type === item ? "active" : ""} aria-pressed={type === item} onClick={() => update({ type: item === "all" ? "" : item, page: "" })}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
    {!query.trim() && <p className="search-state">Start typing to search repositories and users.</p>}
    {state.loading && <p className="search-state" role="status">Searching public repositories and users...</p>}
    {state.error && <p className="search-state search-state--error" role="alert">{state.error}</p>}
    {!state.loading && query && !state.error && !hasResults && <p className="search-state">No results found for “{query}”.</p>}
    {!state.loading && !state.error && data.repositories?.length > 0 && <section className="search-section"><h2>Repositories</h2><div className="explore-results">{data.repositories.map((item) => <RepositorySearchCard key={item._id} repository={item} />)}</div></section>}
    {!state.loading && !state.error && data.users?.length > 0 && <section className="search-section"><h2>Users</h2><div className="search-user-list">{data.users.map((item) => <UserSearchCard key={item._id} user={item} />)}</div></section>}
    {activePagination?.pages > 1 && <nav className="search-pagination" aria-label="Search result pages"><button type="button" disabled={!activePagination.hasPreviousPage} onClick={() => update({ page: String(page - 1) })}>Previous</button><span>Page {page} of {activePagination.pages}</span><button type="button" disabled={!activePagination.hasNextPage} onClick={() => update({ page: String(page + 1) })}>Next</button></nav>}
  </main></div>;
};
export default SearchResultsPage;
