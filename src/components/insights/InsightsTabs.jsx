import React from "react";
import { Link } from "react-router-dom";

const InsightsTabs = ({ repositoryId, active, range }) => <nav className="insights-tabs" aria-label="Repository insight views">{[
  ["overview", "", "Overview"], ["commits", "/commits", "Commits"], ["contributors", "/contributors", "Contributors"], ["activity", "/activity", "Activity"],
].map(([id, suffix, label]) => <Link key={id} aria-current={active === id ? "page" : undefined} to={`/repo/${repositoryId}/insights${suffix}?range=${range}`}>{label}</Link>)}</nav>;
export default InsightsTabs;
