import React from "react";

const DiffLine = ({ line }) => (
  <div className={`commit-diff-line commit-diff-${line.type}`} role="row">
    <span className="commit-diff-line__number" aria-hidden="true">
      {line.oldLineNumber ?? ""}
    </span>
    <span className="commit-diff-line__number" aria-hidden="true">
      {line.newLineNumber ?? ""}
    </span>
    <span className="commit-diff-line__content">{line.content || " "}</span>
  </div>
);

export default React.memo(DiffLine);
