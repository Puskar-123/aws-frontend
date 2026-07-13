import React from "react";
import { FiChevronDown, FiChevronRight, FiGitBranch, FiGitCommit } from "react-icons/fi";

const validSummary = (summary) => summary
  && Number.isFinite(summary.filesChanged)
  && Number.isFinite(summary.additions)
  && Number.isFinite(summary.deletions);

const commitFileCount = (commit) => {
  if (validSummary(commit.summary)) return commit.summary.filesChanged;
  const paths = new Set();
  (commit.files || []).forEach((file) => paths.add(file.path || file.filename));
  (commit.deletedFiles || []).forEach((filePath) => paths.add(filePath));
  return paths.size;
};

const CommitCard = ({ commit, commitId, expanded, onToggle }) => {
  const hash = String(commit.hash || commit._id || commitId);
  const author = commit.author?.name || "Unknown";
  const date = commit.time && !Number.isNaN(Date.parse(commit.time))
    ? new Date(commit.time).toLocaleString()
    : "Date unavailable";
  const fileCount = commitFileCount(commit);
  const summaryAvailable = validSummary(commit.summary);

  return (
    <article className={`commit-card${expanded ? " commit-card--expanded" : ""}`}>
      <div className="commit-card__body">
        <FiGitCommit className="commit-card__icon" aria-hidden="true" />
        <div className="commit-card__details">
          <h3>{commit.message || "No commit message"}</h3>
          <p className="commit-card__metadata">
            <code>{hash.slice(0, 7)}</code>
            <span aria-hidden="true">·</span>
            <span>{author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={commit.time || undefined}>{date}</time>
          </p>
          {commit.branch && (
            <p className="commit-card__branch">
              <FiGitBranch aria-hidden="true" />
              {commit.branch}
            </p>
          )}
          <div className="commit-card__summary">
            <span>{fileCount} {fileCount === 1 ? "file" : "files"} changed</span>
            {summaryAvailable && (
              <>
                <span className="commit-card__additions">+{commit.summary.additions}</span>
                <span className="commit-card__deletions">−{commit.summary.deletions}</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="commit-card__toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`commit-diff-${commitId}`}
        >
          {expanded ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
          {expanded ? "Hide changes" : "View changes"}
        </button>
      </div>
    </article>
  );
};

export default React.memo(CommitCard);
