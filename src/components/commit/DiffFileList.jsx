import React from "react";

const STATUS_LABELS = {
  added: { short: "A", label: "Added" },
  modified: { short: "M", label: "Modified" },
  deleted: { short: "D", label: "Deleted" },
  renamed: { short: "R", label: "Renamed" },
};

const DiffFileList = ({ files, selectedPath, onSelect }) => (
  <nav className="commit-diff-files" aria-label="Changed files">
    <h4>Changed files</h4>
    <div className="commit-diff-files__list">
      {files.map((file) => {
        const status = STATUS_LABELS[file.status] || { short: "M", label: "Changed" };
        return (
          <button
            type="button"
            key={`${file.oldPath || ""}->${file.path}`}
            className={`commit-diff-file-row${selectedPath === file.path ? " commit-diff-file-row--active" : ""}`}
            onClick={() => onSelect(file.path)}
            aria-current={selectedPath === file.path ? "true" : undefined}
          >
            <span
              className={`commit-diff-file-row__status commit-diff-file-row__status--${file.status}`}
              title={status.label}
              aria-label={status.label}
            >
              {status.short}
            </span>
            <span className="commit-diff-file-row__path" title={file.path}>{file.path}</span>
            <span className="commit-diff-file-row__totals">
              <span>+{file.additions || 0}</span>
              <span>−{file.deletions || 0}</span>
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default React.memo(DiffFileList);
