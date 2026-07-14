import React from "react";

const labels = { approved: "Approved", changes_requested: "Changes requested", commented: "Commented" };

const ReviewDecisionBadge = ({ decision, stale = false }) => (
  <span className={`review-badge review-badge--${decision}${stale ? " is-stale" : ""}`}>
    {labels[decision] || decision}{stale ? " (stale)" : ""}
  </span>
);

export default ReviewDecisionBadge;
