import React from "react";

const IssueLabels = ({ labels = [] }) => <span className="issue-labels">{labels.map((label) => <span className="issue-label" key={label.name}><span aria-hidden="true" className="issue-label-dot" />{label.name}</span>)}</span>;

export default IssueLabels;
