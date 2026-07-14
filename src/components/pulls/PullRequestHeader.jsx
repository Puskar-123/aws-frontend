import React from "react";
import { Link } from "react-router-dom";
import PullIdentity from "./PullIdentityView";

const PullRequestHeader = ({ repositoryId, pullRequest }) => (
  <header className="pull-detail-header">
    <p><Link to={`/repo/${repositoryId}/pulls`}>← Pull requests</Link></p>
    <h1>{pullRequest.title} <span>#{pullRequest.number}</span></h1>
    <div><span className={`pull-status pull-status--${pullRequest.status}`}>{pullRequest.status}</span><p><PullIdentity identity={pullRequest.author} /> wants to merge <strong>{pullRequest.compareBranch}</strong> into <strong>{pullRequest.baseBranch}</strong></p></div>
  </header>
);

export default PullRequestHeader;
