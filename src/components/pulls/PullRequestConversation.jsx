import React from "react";
import MergePanel from "./MergePanel";
import PullRequestCommentForm from "./PullRequestCommentForm";

const PullRequestConversation = ({ repositoryId, pullRequest, mergeability, permissions, onComment, onMerge, onClose, onReopen }) => (
  <div className="pull-conversation">
    <div className="pull-timeline">
      <article className="pull-description"><h2>Description</h2><p>{pullRequest.description || "No description provided."}</p></article>
      {(pullRequest.comments || []).map((comment) => <article className="pull-comment" key={comment._id}><header><strong>{comment.author?.username || "Unknown"}</strong></header><p>{comment.body}</p></article>)}
      {permissions.canComment && <PullRequestCommentForm repositoryId={repositoryId} number={pullRequest.number} onCreated={onComment} />}
    </div>
    <aside><MergePanel pullRequest={pullRequest} mergeability={mergeability} canMerge={permissions.canMerge} onMerge={onMerge} />{permissions.canEdit && pullRequest.status === "open" && <button className="pull-secondary" type="button" onClick={onClose}>Close pull request</button>}{permissions.canEdit && pullRequest.status === "closed" && <button className="pull-secondary" type="button" onClick={onReopen}>Reopen pull request</button>}</aside>
  </div>
);

export default PullRequestConversation;
