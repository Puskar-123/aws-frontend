import React from "react";
import PullIdentity from "./PullIdentityView";

const PullRequestReviewActivity = ({ pullRequest }) => {
  const requests = (pullRequest.requestedReviewers || []).filter((item) => item.status !== "removed");
  const threads = pullRequest.reviewThreads || [];
  if (!requests.length && !threads.length) return null;
  return <section className="pull-review-activity"><h2>Code review activity</h2>
    {requests.map((item) => <p key={item._id}><PullIdentity identity={item.requestedBy} /> requested a review from <PullIdentity identity={item.user} />.</p>)}
    {threads.map((thread) => <React.Fragment key={thread._id}><p><PullIdentity identity={thread.createdBy} /> started a conversation on <code>{thread.filePath}</code>{thread.outdated ? " on an older version" : ""}.</p>{thread.resolved && <p><PullIdentity identity={thread.resolvedBy} /> resolved the conversation.</p>}</React.Fragment>)}
  </section>;
};

export default PullRequestReviewActivity;
