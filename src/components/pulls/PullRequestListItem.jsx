import React from "react";
import { Link } from "react-router-dom";

const PullRequestListItem = ({ repositoryId, pullRequest }) => {
  const opened = pullRequest.createdAt && !Number.isNaN(Date.parse(pullRequest.createdAt))
    ? new Date(pullRequest.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    : "date unavailable";
  return (
    <article className="pull-list-item">
      <span className={`pull-status pull-status--${pullRequest.status}`}>{pullRequest.status}</span>
      <div>
        <h2><Link to={`/repo/${repositoryId}/pulls/${pullRequest.number}`}>{pullRequest.title}</Link> <small>#{pullRequest.number}</small></h2>
        <p>{pullRequest.author?.username || "Unknown"} wants to merge into <strong>{pullRequest.baseBranch}</strong> from <strong>{pullRequest.compareBranch}</strong></p>
        <small>Opened on {opened} · {pullRequest.commentCount || 0} comments</small>
      </div>
    </article>
  );
};

export default PullRequestListItem;
