import React from "react";

const UnifiedDiff = ({ file }) => {
  if (!file.hunks?.length) return <div className="compare-diff-notice">No textual patch is available.</div>;
  return (
    <div className="compare-unified-diff" role="table" aria-label={`Unified diff for ${file.path}`}>
      {file.hunks.map((hunk, index) => (
        <React.Fragment key={`${hunk.oldStart}-${hunk.newStart}-${index}`}>
          <div className="diff-hunk">@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</div>
          {hunk.lines.map((line, lineIndex) => (
            <div className={`diff-line diff-line-${line.type}`} role="row" key={`${line.oldLineNumber}-${line.newLineNumber}-${lineIndex}`}>
              <span className="diff-line-number" aria-hidden="true">{line.oldLineNumber ?? ""}</span>
              <span className="diff-line-number" aria-hidden="true">{line.newLineNumber ?? ""}</span>
              <code>{line.content || " "}</code>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default UnifiedDiff;
