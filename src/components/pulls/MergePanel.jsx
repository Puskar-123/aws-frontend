import React, { useState } from "react";
import PullIdentity from "./PullIdentityView";
import { displayName, formatPullDate } from "./pullIdentity";

const MergePanel = ({ pullRequest, mergeability, reviewSummary, canMerge, onMerge }) => {
  const [submitting, setSubmitting] = useState(false);
  if (pullRequest.status === "merged") return <section className="merge-panel merge-panel--done" aria-live="polite"><h2>Pull request merged</h2><p><PullIdentity identity={pullRequest.mergedBy} /> merged commit <code>{pullRequest.mergeCommit?.slice(0, 12) || "unavailable"}</code> into <strong>{pullRequest.baseBranch}</strong>.</p><dl className="merge-details"><div><dt>Merged</dt><dd>{formatPullDate(pullRequest.mergedAt)}</dd></div></dl></section>;
  if (pullRequest.status === "closed") return <section className="merge-panel" aria-live="polite"><h2>Pull request closed</h2><p>Reopen this pull request before merging.</p></section>;
  if (mergeability.hasConflicts) return <section className="merge-panel merge-panel--blocked"><h2>Merge blocked</h2><p>This branch has conflicts that must be resolved before merging.</p></section>;
  if (mergeability.blockedByReviews) {
    const reviewers = (reviewSummary?.latestByReviewer || []).filter((review) => review.decision === "changes_requested").map((review) => displayName(review.reviewer));
    return <section className="merge-panel merge-panel--blocked" aria-live="polite"><h2>Merge blocked</h2><p>{reviewers.length ? `Changes were requested by ${reviewers.join(", ")}.` : "Changes were requested."} The blocking reviewer must update their review before merging.</p></section>;
  }
  return <section className="merge-panel"><h2>{mergeability.canMerge ? "Ready to merge" : "Merge unavailable"}</h2><p>{mergeability.canMerge ? "This branch has no conflicts with the base branch." : mergeability.reason}</p>{canMerge && mergeability.canMerge && <button className="pull-primary" type="button" disabled={submitting} onClick={async () => { if (!window.confirm("Merge this pull request?")) return; setSubmitting(true); try { await onMerge(); } finally { setSubmitting(false); } }}>{submitting ? "Merging..." : "Merge pull request"}</button>}</section>;
};

export default MergePanel;
