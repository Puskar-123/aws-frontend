import React from "react";
import { FiExternalLink, FiFileText, FiGitBranch, FiGitCommit, FiLock, FiTrash2, FiUnlock } from "react-icons/fi";
import { normalizeVisibility } from "../../utils/repository";

const formatUpdatedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const RepositoryCard = ({ repository, deleting = false, onOpen, onDelete, allowDelete = true }) => {
  const visibility = normalizeVisibility(repository.visibility) === "private" ? "Private" : "Public";
  const fileCount = Array.isArray(repository.content) ? repository.content.length : null;
  const commitCount = Array.isArray(repository.commits) ? repository.commits.length : null;
  const updatedAt = formatUpdatedDate(repository.updatedAt);

  return (
    <article className="dashboard-repository-card">
      <div className="dashboard-repository-card__topline">
        <button type="button" className="dashboard-repository-card__name" onClick={() => onOpen(repository)}>
          {repository.currentUserRole && repository.owner?.username ? `${repository.owner.username} / ` : ""}{repository.name || "Untitled repository"}
        </button>
        <div className="dashboard-repository-card__badges">{repository.currentUserRole && <span className="dashboard-badge">Role: {repository.currentUserRole[0].toUpperCase() + repository.currentUserRole.slice(1)}</span>}{repository.forkedFrom && <span className="dashboard-badge"><FiGitBranch aria-hidden="true" />Fork</span>}<span className={`dashboard-badge dashboard-badge--${visibility.toLowerCase()}`}>
          {visibility === "Private" ? <FiLock aria-hidden="true" /> : <FiUnlock aria-hidden="true" />}
          {visibility}
        </span></div>
      </div>
      <p className="dashboard-repository-card__description">
        {repository.description || "No description"}
      </p>
      <div className="dashboard-repository-card__meta">
        {fileCount !== null && <span><FiFileText aria-hidden="true" />{fileCount} files</span>}
        {commitCount !== null && <span><FiGitCommit aria-hidden="true" />{commitCount} commits</span>}
        {updatedAt && <span>Updated {updatedAt}</span>}
      </div>
      <div className="dashboard-repository-actions">
        <button type="button" className="dashboard-open-button" onClick={() => onOpen(repository)}>
          <FiExternalLink aria-hidden="true" />
          Open repository
        </button>
        {allowDelete && <button
          type="button"
          className="dashboard-delete-button"
          disabled={deleting}
          aria-label={`Delete ${repository.name || "repository"}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(repository);
          }}
        >
          <FiTrash2 aria-hidden="true" />
          {deleting ? "Deleting..." : "Delete"}
        </button>}
      </div>
    </article>
  );
};

export default RepositoryCard;
