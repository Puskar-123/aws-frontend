import React from "react";
import IssueIdentity from "./IssueIdentity";

const IssueHeader = ({ issue }) => <header className="issue-detail-header"><h1>{issue.title} <span>#{issue.number}</span></h1><div><span className={`issue-status issue-status--${issue.status}`}>{issue.status}</span><p><IssueIdentity user={issue.author} /> opened this issue</p></div></header>;

export default IssueHeader;
