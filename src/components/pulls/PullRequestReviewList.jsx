import React from "react";
import PullIdentity from "./PullIdentityView";
import ReviewDecisionBadge from "./ReviewDecisionBadge";
import { formatPullDate } from "./pullIdentity";

const PullRequestReviewList = ({ reviews = [], summary }) => {
  const staleIds = new Set((summary?.latestByReviewer || []).filter((review) => review.stale).map((review) => String(review._id)));
  return reviews.map((review) => <article className="pull-review" key={review._id}>
    <header>
      <PullIdentity identity={review.reviewer} />
      <ReviewDecisionBadge decision={review.decision} stale={staleIds.has(String(review._id))} />
      <time dateTime={review.createdAt}>{formatPullDate(review.createdAt)}</time>
    </header>
    {review.body && <p>{review.body}</p>}
  </article>);
};

export default PullRequestReviewList;
