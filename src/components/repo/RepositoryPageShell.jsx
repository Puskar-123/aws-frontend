import React from "react";
import { Link } from "react-router-dom";
import { repositoryDescription } from "./repositoryPageUtils";

export const RepoHeader = ({ repository, protectedBranch, children }) => <header className="repo-header">
  <div className="repo-header__identity">
    <div className="repo-header__title-row">
      <h1 className="repo-title">{repository.owner?.username && <><span className="repo-title__owner">{repository.owner.username}</span><span className="repo-title__separator" aria-hidden="true">/</span></>}<span className="repo-title__name">{repository.name}</span></h1>
      <span className="repo-visibility-badge">{repository.visibility === "private" ? "Private" : "Public"}</span>
      {protectedBranch && <span className="repo-protected-badge">{protectedBranch} Protected</span>}
    </div>
    <p className="repo-header__description">{repositoryDescription(repository.description)}</p>
  </div>
  <div className="repo-header__actions">{children}</div>
</header>;

export const RepoTabs = ({ repositoryId, pathname, counts, settingsPath }) => {
  const tabs = [
    ["Code", `/repo/${repositoryId}`], ["Issues", `/repo/${repositoryId}/issues`, counts.issues], ["Pull requests", `/repo/${repositoryId}/pulls`, counts.pulls],
    ["Actions", `/repo/${repositoryId}/actions`], ["Releases", `/repo/${repositoryId}/releases`], ["Insights", `/repo/${repositoryId}/insights`],
    ...(settingsPath ? [["Settings", settingsPath]] : []),
  ];
  return <nav className="repo-tabs" aria-label="Repository sections">{tabs.map(([label, path, count]) => <Link key={label} className={pathname === path || (label === "Settings" && pathname.startsWith(`/repo/${repositoryId}/settings/`)) ? "active" : ""} to={path}>{label}{count !== undefined && <span>{count}</span>}</Link>)}</nav>;
};

export const RepoContent = ({ loading, error, empty, emptyContent, children, onRetry }) => <section className="repo-content" aria-live="polite">
  {loading ? <div className="repo-content-state repo-content-state--loading" role="status"><span className="repo-content-skeleton" />Loading repository content…</div>
    : error ? <div className="repo-content-state repo-content-state--error" role="alert"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>Retry</button>}</div>
      : empty ? emptyContent : children}
</section>;
