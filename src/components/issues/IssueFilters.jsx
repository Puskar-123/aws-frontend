import React from "react";

const IssueFilters = ({ filters, counts, onChange }) => <div className="issue-filters">
  <div className="issue-status-tabs" role="group" aria-label="Issue status">
    <button className={filters.status === "open" ? "is-active" : ""} onClick={() => onChange("status", "open")}>Open {counts.open || 0}</button>
    <button className={filters.status === "closed" ? "is-active" : ""} onClick={() => onChange("status", "closed")}>Closed {counts.closed || 0}</button>
  </div>
  <label className="issue-search"><span className="sr-only">Search issues</span><input value={filters.search} onChange={(event) => onChange("search", event.target.value)} placeholder="Search issues..." /></label>
  <label><span className="sr-only">Label</span><input value={filters.label} onChange={(event) => onChange("label", event.target.value)} placeholder="Label" /></label>
  <label><span className="sr-only">Priority</span><select value={filters.priority} onChange={(event) => onChange("priority", event.target.value)}><option value="">All priorities</option>{["critical", "high", "medium", "low", "none"].map((value) => <option key={value}>{value}</option>)}</select></label>
  <label><span className="sr-only">Assignee ID</span><input value={filters.assignee} onChange={(event) => onChange("assignee", event.target.value)} placeholder="Assignee ID" /></label>
  <label><span className="sr-only">Sort issues</span><select value={filters.sort} onChange={(event) => onChange("sort", event.target.value)}><option value="updated">Recently updated</option><option value="created">Newest</option><option value="comments">Most commented</option></select></label>
</div>;

export default IssueFilters;
