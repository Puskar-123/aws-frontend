import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import { downloadReleaseFile, releaseRequest } from "./releaseApi";
import "./releases.css";

const ReleaseBadges = ({ release }) => <span className="release-badges">
  {release.latest && <span className="release-badge release-badge--latest">Latest</span>}
  {release.draft && <span className="release-badge">Draft</span>}
  {release.prerelease && <span className="release-badge release-badge--pre">Pre-release</span>}
</span>;

const ReleaseListPage = () => {
  const { id } = useParams();
  const [view, setView] = useState("releases");
  const [status, setStatus] = useState("published");
  const [search, setSearch] = useState("");
  const [prerelease, setPrerelease] = useState("all");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: "", releases: [], tags: [], pagination: {}, counts: {}, canManage: false });
  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const query = new URLSearchParams({ page: String(page), limit: "10" });
      if (search.trim()) query.set("search", search.trim());
      if (status === "drafts") query.set("draft", "true"); else if (status === "published") query.set("draft", "false");
      if (prerelease !== "all") query.set("prerelease", prerelease);
      const [releases, tags] = await Promise.all([
        releaseRequest(`/repo/${id}/releases?${query}`, { signal }),
        releaseRequest(`/repo/${id}/tags?search=${encodeURIComponent(search)}&page=${page}&limit=20`, { signal }),
      ]);
      setState({ loading: false, error: "", releases: releases.releases || [], tags: tags.tags || [], pagination: view === "tags" ? tags.pagination || {} : releases.pagination || {}, counts: releases.counts || {}, canManage: Boolean(releases.canManage) });
    } catch (error) { if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [id, page, prerelease, search, status, view]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => load(controller.signal), search ? 250 : 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load, search]);
  const switchView = (next) => { setView(next); setPage(1); };
  const source = async (tag) => { try { await downloadReleaseFile(`/repo/${id}/tags/${encodeURIComponent(tag)}/source.zip`, `${tag}.zip`); } catch (error) { setState((current) => ({ ...current, error: error.message })); } };
  return <div className="releases-page"><Navbar /><main className="releases-container">
    <header className="release-heading"><div><p><Link to={`/repo/${id}`}>← Repository</Link></p><h1>Releases</h1></div>{state.canManage && <Link className="release-primary" to={`/repo/${id}/releases/new`}>Create a new release</Link>}</header>
    <div className="release-view-tabs"><button className={view === "releases" ? "is-active" : ""} onClick={() => switchView("releases")}>Releases</button><button className={view === "tags" ? "is-active" : ""} onClick={() => switchView("tags")}>Tags</button></div>
    <div className="release-controls"><input aria-label="Search releases and tags" type="search" placeholder="Search releases and tags" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />{view === "releases" && <><select aria-label="Release status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="published">Published ({state.counts.published || 0})</option>{state.canManage && <option value="all">All releases</option>}{state.canManage && <option value="drafts">Drafts ({state.counts.drafts || 0})</option>}</select><select aria-label="Release type" value={prerelease} onChange={(event) => { setPrerelease(event.target.value); setPage(1); }}><option value="all">All types</option><option value="false">Stable</option><option value="true">Pre-release</option></select></>}</div>
    {state.loading && <div className="release-state" role="status">Loading {view}...</div>}
    {state.error && <div className="release-state release-state--error" role="alert">{state.error}</div>}
    {!state.loading && !state.error && view === "releases" && <section className="release-list">{state.releases.length ? state.releases.map((release) => <article className="release-card" key={release._id}><div className="release-card__icon">🏷</div><div><h2><Link to={`/repo/${id}/releases/${release._id}`}>{release.title}</Link> <ReleaseBadges release={release} /></h2><p className="release-tag">{release.tag?.name} · {release.publishedAt ? `published ${new Date(release.publishedAt).toLocaleDateString()}` : `created ${new Date(release.createdAt).toLocaleDateString()}`} by {release.createdBy?.username || "Deleted user"}</p><p>{release.body ? `${release.body.slice(0, 180)}${release.body.length > 180 ? "…" : ""}` : "No release notes."}</p><span className="release-asset-count">{release.assets?.length || 0} assets</span></div></article>) : <div className="release-state">No releases match these filters.</div>}</section>}
    {!state.loading && !state.error && view === "tags" && <section className="release-list">{state.tags.length ? state.tags.map((tag) => <article className="release-tag-card" key={tag._id}><div><h2>{tag.name}</h2><p>{tag.message || tag.target?.message || "No tag message"}</p><code>{String(tag.targetCommitHash).slice(0, 12)}</code>{tag.release && <Link to={`/repo/${id}/releases/${tag.release._id}`}>View release</Link>}</div><button className="release-secondary" onClick={() => source(tag.name)}>Source code (zip)</button></article>) : <div className="release-state">No tags found.</div>}</section>}
    {(state.pagination.pages || 0) > 1 && <nav className="release-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {state.pagination.pages}</span><button disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
  </main></div>;
};

export default ReleaseListPage;
