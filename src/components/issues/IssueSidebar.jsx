import React from "react";
import IssueIdentity from "./IssueIdentity";
import IssueLabels from "./IssueLabels";

const IssueSidebar = ({ issue }) => <aside className="issue-sidebar">
  <section><h2>Assignees</h2>{issue.assignees?.length ? issue.assignees.map((user) => <IssueIdentity key={user?._id || "deleted"} user={user} />) : <p>No one assigned</p>}</section>
  <section><h2>Labels</h2>{issue.labels?.length ? <IssueLabels labels={issue.labels} /> : <p>No labels</p>}</section>
  <section><h2>Priority</h2><p className={`issue-priority issue-priority--${issue.priority}`}>{issue.priority === "none" ? "No priority" : `${issue.priority} priority`}</p></section>
  <section><h2>Linked pull requests</h2>{issue.linkedPullRequests?.length ? issue.linkedPullRequests.map((pull) => <p key={pull._id}>#{pull.number} {pull.title} · {pull.status}</p>) : <p>None yet</p>}</section>
</aside>;

export default IssueSidebar;
