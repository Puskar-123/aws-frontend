import React, { useEffect, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { discoveryRequest } from "../explore/exploreApi";
import "./search.css";

const GlobalSearch = () => {
  const navigate = useNavigate(); const root = useRef(null); const requestId = useRef(0);
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const [results, setResults] = useState({ repositories: [], users: [] }); const [loading, setLoading] = useState(false);
  useEffect(() => {
    const value = query.replace(/\s+/g, " ").trim();
    if (!value) { setResults({ repositories: [], users: [] }); setLoading(false); setOpen(false); return undefined; }
    const controller = new AbortController(); const current = ++requestId.current; setLoading(true);
    const timer = window.setTimeout(() => discoveryRequest(`/search?q=${encodeURIComponent(value)}&type=all&limit=5`, { signal: controller.signal })
      .then((data) => { if (current === requestId.current) { setResults(data); setLoading(false); setOpen(true); } })
      .catch((error) => { if (error.name !== "AbortError" && current === requestId.current) { setResults({ repositories: [], users: [] }); setLoading(false); setOpen(true); } }), 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => {
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") { setOpen(false); setMobileOpen(false); } };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const submit = (event) => { event.preventDefault(); const value = query.replace(/\s+/g, " ").trim(); if (!value) return; setOpen(false); setMobileOpen(false); navigate(`/search?q=${encodeURIComponent(value)}`); };
  const hasResults = results.repositories?.length || results.users?.length;
  return <div className={`global-search${mobileOpen ? " global-search--mobile-open" : ""}`} ref={root}>
    <button type="button" className="global-search__mobile-toggle" aria-label={mobileOpen ? "Close search" : "Open search"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <FiX aria-hidden="true" /> : <FiSearch aria-hidden="true" />}</button>
    <form onSubmit={submit} role="search"><label htmlFor="global-search-input">Search repositories and users</label><FiSearch aria-hidden="true" /><input id="global-search-input" type="search" value={query} onFocus={() => query.trim() && setOpen(true)} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(event); }} placeholder="Search repositories and users..." aria-expanded={open} aria-controls="global-search-suggestions" autoComplete="off" /></form>
    {open && <div className="global-search__suggestions" id="global-search-suggestions">
      {loading && <p role="status">Searching…</p>}
      {!loading && !hasResults && <p>No public results found.</p>}
      {!loading && results.repositories?.length > 0 && <section><h2>Repositories</h2>{results.repositories.slice(0, 3).map((item) => <Link key={item._id} to={`/repo/${item._id}`} onClick={() => setOpen(false)}><strong>{item.owner?.username} / {item.name}</strong><span>{item.description || "No description"}</span></Link>)}</section>}
      {!loading && results.users?.length > 0 && <section><h2>Users</h2>{results.users.slice(0, 3).map((item) => <Link key={item._id} to={`/users/${encodeURIComponent(item.username)}`} onClick={() => setOpen(false)}><strong>@{item.username}</strong><span>{item.displayName || item.bio}</span></Link>)}</section>}
      <button type="button" className="global-search__all" onClick={submit}>View all results</button>
    </div>}
  </div>;
};
export default GlobalSearch;
