import React from "react";
import { Link } from "react-router-dom";
import IssueLabels from "./IssueLabels";

const IssueListItem = ({ repositoryId, issue }) => <article className="issue-list-item">
  <span className={`issue-state-icon issue-state-icon--${issue.status}`} aria-label={issue.status}>{issue.status === "open" ? "●" : "✓"}</span>
  <div><h2><Link to={`/repo/${repositoryId}/issues/${issue.number}`}>{issue.title}</Link> <small>#{issue.number}</small></h2>
    <p>opened by {issue.author?.username || issue.author?.name || "Deleted user"} · {issue.commentCount || 0} comments</p>
    <div className="issue-list-tags"><IssueLabels labels={issue.labels} />{issue.priority !== "none" && <span className={`issue-priority issue-priority--${issue.priority}`}>{issue.priority} priority</span>}</div>
  </div>
</article>;

export default IssueListItem;
