import React from "react";

const PullRequestTabs = ({ active, onChange, commits, files, unavailable = false }) => {
  const tabs = [
    { id: "conversation", label: "Conversation" },
    { id: "commits", label: `Commits ${unavailable ? "—" : commits}` },
    { id: "files", label: `Files changed ${unavailable ? "—" : files}` },
  ];
  return <div className="pull-tabs" role="tablist" aria-label="Pull request views">
    {tabs.map((tab) => <button key={tab.id} type="button" role="tab" tabIndex={active === tab.id ? 0 : -1} aria-selected={active === tab.id} title={unavailable && tab.id !== "conversation" ? "Historical data unavailable for this legacy pull request." : undefined} onClick={() => onChange(tab.id)} onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const elements = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')];
      const current = elements.indexOf(event.currentTarget);
      const next = event.key === "Home" ? 0 : event.key === "End" ? elements.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + elements.length) % elements.length;
      elements[next].focus(); elements[next].click();
    }}>{tab.label}</button>)}
  </div>;
};

export default PullRequestTabs;
