import React from "react";
import MergePanel from "./MergePanel";
import PullIdentity from "./PullIdentityView";
import PullRequestCommentForm from "./PullRequestCommentForm";
import PullRequestReviewForm from "./PullRequestReviewForm";
import PullRequestReviewList from "./PullRequestReviewList";
import PullRequestReviewSummary from "./PullRequestReviewSummary";
import { formatPullDate } from "./pullIdentity";

const PullRequestConversation = ({ repositoryId, pullRequest, mergeability, permissions, reviewSummary, onComment, onReview, onMerge, onClose, onReopen }) => (
  <div className="pull-conversation">
    <div className="pull-timeline">
      <article className="pull-description"><h2>Description</h2><p>{pullRequest.description || "No description provided."}</p></article>
      {(pullRequest.comments || []).map((comment) => <article className="pull-comment" key={comment._id}><header><PullIdentity identity={comment.author} /><time dateTime={comment.createdAt}>{formatPullDate(comment.createdAt)}</time></header><p>{comment.body}</p></article>)}
      <PullRequestReviewList reviews={pullRequest.reviews} summary={reviewSummary} />
      {permissions.canComment && <PullRequestCommentForm repositoryId={repositoryId} number={pullRequest.number} onCreated={onComment} />}
      {permissions.canComment && pullRequest.status === "open" && <PullRequestReviewForm repositoryId={repositoryId} number={pullRequest.number} canDecide={permissions.canReviewDecision} isAuthor={permissions.isAuthor} onCreated={onReview} />}
    </div>
    <aside><PullRequestReviewSummary summary={reviewSummary} /><MergePanel pullRequest={pullRequest} mergeability={mergeability} reviewSummary={reviewSummary} canMerge={permissions.canMerge} onMerge={onMerge} />{permissions.canEdit && pullRequest.status === "open" && <button className="pull-secondary" type="button" onClick={onClose}>Close pull request</button>}{permissions.canEdit && pullRequest.status === "closed" && <button className="pull-secondary" type="button" onClick={onReopen}>Reopen pull request</button>}</aside>
  </div>
);

export default PullRequestConversation;
