import React, { Suspense, lazy } from "react";
import IssueCommentForm from "./IssueCommentForm";
import IssueIdentity from "./IssueIdentity";

const MarkdownPreview = lazy(() => import("../repository/MarkdownPreview"));

const date = (value) => value ? new Date(value).toLocaleString() : "Date unavailable";

const IssueConversation = ({ repositoryId, issue, canComment, onComment }) => <div className="issue-timeline">
  <Suspense fallback={<p className="issue-markdown-loading">Loading content…</p>}>
    <article className="issue-message"><header><IssueIdentity user={issue.author} /><time>{date(issue.createdAt)}</time></header><div className="issue-message-body"><MarkdownPreview content={issue.body || "No description provided."} /></div></article>
    {(issue.comments || []).map((comment) => <article className="issue-message" key={comment._id}><header><IssueIdentity user={comment.author} /><time>{date(comment.createdAt)}</time></header><div className="issue-message-body"><MarkdownPreview content={comment.body} /></div></article>)}
  </Suspense>
  {canComment && <IssueCommentForm repositoryId={repositoryId} number={issue.number} onCreated={onComment} />}
</div>;

export default IssueConversation;
