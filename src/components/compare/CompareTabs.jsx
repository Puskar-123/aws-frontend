import React from "react";

const CompareTabs = ({ active, onChange, commitCount, fileCount }) => (
  <div className="compare-tabs" role="tablist" aria-label="Comparison details">
    <button type="button" role="tab" aria-selected={active === "commits"} onClick={() => onChange("commits")}>Commits <span>{commitCount}</span></button>
    <button type="button" role="tab" aria-selected={active === "files"} onClick={() => onChange("files")}>Files changed <span>{fileCount}</span></button>
  </div>
);

export default CompareTabs;
