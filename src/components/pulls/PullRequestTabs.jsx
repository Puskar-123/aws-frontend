import React from "react";

const PullRequestTabs = ({ active, onChange, commits, files }) => (
  <div className="pull-tabs" role="tablist" aria-label="Pull request views">
    {[{ id: "conversation", label: "Conversation" }, { id: "commits", label: `Commits ${commits}` }, { id: "files", label: `Files changed ${files}` }].map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)}>{tab.label}</button>)}
  </div>
);

export default PullRequestTabs;
