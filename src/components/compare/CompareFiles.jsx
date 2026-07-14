import React, { useMemo, useState } from "react";
import FileDiffCard from "./FileDiffCard";

const FILTERS = ["all", "added", "modified", "deleted", "renamed", "conflicts"];

const CompareFiles = ({ files, summary, repositoryId, base, compare }) => {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => files.filter((file) =>
    filter === "all" || (filter === "conflicts" ? file.conflict : file.status === filter)
  ), [files, filter]);
  if (!files.length) return <div className="compare-empty">No file changes between these branches.</div>;
  return (
    <section className="compare-files" aria-label="Changed files">
      <div className="compare-files__toolbar">
        <strong>Files changed {summary.filesChanged}</strong><span className="is-addition">+{summary.additions}</span><span className="is-deletion">−{summary.deletions}</span>
        <label>Filter <select value={filter} onChange={(event) => setFilter(event.target.value)}>{FILTERS.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
      </div>
      {!filtered.length && <div className="compare-empty">No files match this filter.</div>}
      {filtered.map((file, index) => <FileDiffCard key={`${file.oldPath || ""}->${file.path}`} file={file} repositoryId={repositoryId} base={base} compare={compare} defaultExpanded={index === 0} />)}
    </section>
  );
};

export default CompareFiles;
