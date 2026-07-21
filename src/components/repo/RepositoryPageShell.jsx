import React from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiAlertCircle, FiBarChart2, FiCode, FiGitPullRequest, FiHeart, FiMessageCircle, FiSettings, FiTag } from "react-icons/fi";
import { repositoryDescription } from "./repositoryPageUtils";

export const RepoHeader = ({ repository, protectedBranch, actions, mentor, navigation, children }) => <header className="repo-page-header repo-header">
  <div className="repo-header-main">
    <div className="repo-header-info repo-header-information repo-header__identity">
      <div className="repo-title-row repo-header__title-row">
        {repository.owner?.username && <>
          <span className="repo-owner-name repo-owner repo-title__owner">{repository.owner.username}</span>
          <span className="repo-title-separator repo-separator repo-title__separator" aria-hidden="true">/</span>
        </>}
        <h1 className="repo-name repo-title repo-title__name">{repository.name}</h1>
        <span className="repo-visibility repo-visibility-badge">{repository.visibility === "private" ? "Private" : "Public"}</span>
        {protectedBranch && <span className="repo-protected-badge">{protectedBranch} Protected</span>}
      </div>
      <p className="repo-description repo-header__description">{repositoryDescription(repository.description)}</p>
    </div>
    <div className="repo-header-actions repo-header__actions">{actions ?? children}</div>
  </div>
  {mentor && <section className="mentor-request-section" aria-label="Ask a mentor">{mentor}</section>}
  {navigation && <nav className="repo-navigation" aria-label="Repository navigation">{navigation}</nav>}
</header>;

export const RepoTabs = ({ repositoryId, pathname, counts, settingsPath }) => {
  const tabs = [
    ["Code", `/repo/${repositoryId}`, undefined, FiCode], ["Issues", `/repo/${repositoryId}/issues`, counts.issues, FiAlertCircle], ["Pull requests", `/repo/${repositoryId}/pulls`, counts.pulls, FiGitPullRequest], ["Contribute", `/repo/${repositoryId}/contribute`, undefined, FiHeart], ["Chat", `/repo/${repositoryId}/chat`, undefined, FiMessageCircle],
    ["Actions", `/repo/${repositoryId}/actions`, undefined, FiActivity], ["Releases", `/repo/${repositoryId}/releases`, undefined, FiTag], ["Insights", `/repo/${repositoryId}/insights`, undefined, FiBarChart2],
    ...(settingsPath ? [["Settings", settingsPath, undefined, FiSettings]] : []),
  ];
  return <div className="repo-tabs">{tabs.map(([label, path, count, Icon]) => <Link key={label} className={pathname === path || (label === "Settings" && pathname.startsWith(`/repo/${repositoryId}/settings/`)) ? "active" : ""} to={path}>{React.createElement(Icon, { "aria-hidden": true })}{label}{count !== undefined && <span>{count}</span>}</Link>)}</div>;
};

export const RepoContent = ({ loading, error, empty, emptyContent, children, onRetry }) => <section className="repo-content" aria-live="polite">
  {loading ? <div className="repo-content-state repo-content-state--loading" role="status"><span className="repo-content-skeleton" />Loading repository content…</div>
    : error ? <div className="repo-content-state repo-content-state--error" role="alert"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>Retry</button>}</div>
      : empty ? emptyContent : children}
</section>;
