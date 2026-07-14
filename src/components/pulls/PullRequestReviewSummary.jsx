import React from "react";
import PullIdentity from "./PullIdentityView";
import ReviewDecisionBadge from "./ReviewDecisionBadge";

const PullRequestReviewSummary = ({ summary }) => {
  if (!summary) return null;
  const countLabel = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
  return <section className="review-summary" aria-label="Review summary">
    <h2>Reviews</h2>
    <p>{countLabel(summary.approved, "approval")} · {countLabel(summary.changesRequested, "change request")} · {countLabel(summary.commented, "comment")}</p>
    {(summary.latestByReviewer || []).map((review) => <div className="review-summary-row" key={review._id || `${review.reviewer?._id}-${review.createdAt}`}>
      <PullIdentity identity={review.reviewer} />
      <ReviewDecisionBadge decision={review.decision} stale={review.stale} />
    </div>)}
  </section>;
};

export default PullRequestReviewSummary;
