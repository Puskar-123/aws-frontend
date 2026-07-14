import React from "react";
import { FiFileText, FiGitCommit, FiLock, FiUnlock } from "react-icons/fi";

const formatUpdatedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const RepositoryCard = ({ repository, onOpen }) => {
  const visibility = repository.visibility === "private" ? "Private" : "Public";
  const fileCount = Array.isArray(repository.content) ? repository.content.length : null;
  const commitCount = Array.isArray(repository.commits) ? repository.commits.length : null;
  const updatedAt = formatUpdatedDate(repository.updatedAt);

  return (
    <article className="dashboard-repository-card">
      <div className="dashboard-repository-card__topline">
        <button type="button" className="dashboard-repository-card__name" onClick={() => onOpen(repository)}>
          {repository.name || "Untitled repository"}
        </button>
        <span className={`dashboard-badge dashboard-badge--${visibility.toLowerCase()}`}>
          {visibility === "Private" ? <FiLock aria-hidden="true" /> : <FiUnlock aria-hidden="true" />}
          {visibility}
        </span>
      </div>
      <p className="dashboard-repository-card__description">
        {repository.description || "No description"}
      </p>
      <div className="dashboard-repository-card__meta">
        {fileCount !== null && <span><FiFileText aria-hidden="true" />{fileCount} files</span>}
        {commitCount !== null && <span><FiGitCommit aria-hidden="true" />{commitCount} commits</span>}
        {updatedAt && <span>Updated {updatedAt}</span>}
      </div>
      <button type="button" className="dashboard-card-action" onClick={() => onOpen(repository)}>
        Open repository
      </button>
    </article>
  );
};

export default RepositoryCard;
