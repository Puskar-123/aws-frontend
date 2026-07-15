import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiBookOpen, FiEye, FiGitBranch, FiStar, FiTag } from "react-icons/fi";
import { authenticatedFetch, parseResponse } from "../../utils/api";
import { repositoryDescription } from "../repo/repositoryPageUtils";
import "./repositorySidebar.css";

const API_BASE = "https://api.codehub.sbs";

const RepositorySidebar = ({ repository, branch, files = [], apiBase = API_BASE }) => {
  const repositoryId = repository?._id;
  const [data, setData] = useState({ key: "", releases: null, languages: null });
  const key = `${repositoryId}:${branch}`;

  useEffect(() => {
    if (!repositoryId || !branch) return undefined;
    const controller = new AbortController();
    const load = async (path) => {
      const response = await authenticatedFetch(`${apiBase}${path}`, { signal: controller.signal });
      return response.ok ? parseResponse(response) : null;
    };
    Promise.all([
      load(`/repo/${repositoryId}/releases?draft=false&limit=1`),
      load(`/repo/${repositoryId}/insights/languages?branch=${encodeURIComponent(branch)}`),
    ]).then(([releases, languages]) => setData({ key, releases, languages })).catch((error) => {
      if (error.name !== "AbortError") setData({ key, releases: null, languages: null });
    });
    return () => controller.abort();
  }, [apiBase, branch, key, repositoryId]);

  const current = data.key === key ? data : { releases: null, languages: null };
  const social = repository?.social || {};
  const readme = files.find((file) => /(^|\/)readme(?:\.[^/]+)?$/i.test(file.path || file.filename || ""));
  const latestRelease = current.releases?.releases?.[0];
  const releaseCount = current.releases?.pagination?.total;
  const languages = Array.isArray(current.languages?.languages) ? current.languages.languages : [];

  return <aside className="repo-sidebar" aria-label="Repository information">
    <section className="repo-sidebar-card" aria-labelledby="repo-about-title">
      <h2 id="repo-about-title">About</h2>
      <p className="repo-sidebar-description">{repositoryDescription(repository?.description)}</p>
      <nav className="repo-sidebar-links" aria-label="About repository links">
        {readme && <Link to={`/repo/${repositoryId}?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(readme.path || readme.filename)}`}><FiBookOpen aria-hidden="true" />README</Link>}
        <Link to={`/repo/${repositoryId}/insights/activity`}><FiActivity aria-hidden="true" />Activity</Link>
      </nav>
      <dl className="repo-sidebar-stats">
        <div><dt><FiStar aria-hidden="true" />Stars</dt><dd>{social.starCount || 0}</dd></div>
        <div><dt><FiEye aria-hidden="true" />Watching</dt><dd>{social.watcherCount || 0}</dd></div>
        <div><dt><FiGitBranch aria-hidden="true" />Forks</dt><dd>{social.forkCount || 0}</dd></div>
      </dl>
    </section>

    <section className="repo-sidebar-card" aria-labelledby="repo-releases-title">
      <div className="repo-sidebar-heading"><h2 id="repo-releases-title">Releases</h2>{Number.isFinite(releaseCount) && <span>{releaseCount}</span>}</div>
      {latestRelease ? <Link className="repo-sidebar-release" to={`/repo/${repositoryId}/releases/${latestRelease._id}`}><FiTag aria-hidden="true" /><span><strong>{latestRelease.title || latestRelease.tag?.name}</strong><small>{latestRelease.tag?.name || "Latest release"}</small></span></Link> : <p className="repo-sidebar-empty">No published releases.</p>}
      <Link className="repo-sidebar-section-link" to={`/repo/${repositoryId}/releases`}>View releases</Link>
      {current.releases?.canManage && <Link className="repo-sidebar-section-link" to={`/repo/${repositoryId}/releases/new`}>Create a new release</Link>}
    </section>

    {languages.length > 0 && <section className="repo-sidebar-card" aria-labelledby="repo-languages-title">
      <h2 id="repo-languages-title">Languages</h2>
      <ul className="repo-sidebar-languages">{languages.map((language) => <li key={language.name}><div><strong>{language.name}</strong><span>{language.percentage}%</span></div><progress max="100" value={language.percentage} aria-label={`${language.name} ${language.percentage} percent`} /></li>)}</ul>
    </section>}
  </aside>;
};

export default RepositorySidebar;
