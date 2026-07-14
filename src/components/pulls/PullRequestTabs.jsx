import React from "react";

const PullRequestTabs = ({ active, onChange, commits, files, unavailable = false }) => (
  <div className="pull-tabs" role="tablist" aria-label="Pull request views">
    {[{ id: "conversation", label: "Conversation" }, { id: "commits", label: `Commits ${unavailable ? "—" : commits}` }, { id: "files", label: `Files changed ${unavailable ? "—" : files}` }].map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} title={unavailable && tab.id !== "conversation" ? "Historical data unavailable for this legacy pull request." : undefined} onClick={() => onChange(tab.id)}>{tab.label}</button>)}
  </div>
);

export default PullRequestTabs;
