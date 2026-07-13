import React from "react";
import { FiAlertCircle, FiFileText, FiLock } from "react-icons/fi";
import DiffLine from "./DiffLine";

const FileDiff = ({ file }) => {
  if (!file) {
    return <div className="commit-diff-state">Select a changed file</div>;
  }

  const unavailable = file.protected || file.binary || file.tooLarge || file.unavailable;
  return (
    <section className="commit-file-diff" aria-label={`Diff for ${file.path}`}>
      <header className="commit-file-diff__header">
        <FiFileText aria-hidden="true" />
        <div>
          {file.status === "renamed" && file.oldPath && (
            <span className="commit-file-diff__old-path">{file.oldPath} → </span>
          )}
          <strong>{file.path}</strong>
        </div>
        <span className="commit-file-diff__totals">
          <span>+{file.additions || 0}</span>
          <span>−{file.deletions || 0}</span>
        </span>
      </header>

      {unavailable ? (
        <div className="commit-diff-state commit-diff-state--notice">
          {file.protected ? <FiLock aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}
          <p>{file.message || "Inline diff is unavailable for this file."}</p>
        </div>
      ) : file.hunks?.length ? (
        <div className="commit-diff-viewer__scroll" role="table" aria-label={`${file.path} unified diff`}>
          <div className="commit-diff-code">
            {file.hunks.map((hunk) => (
              <React.Fragment key={`${hunk.oldStart}-${hunk.newStart}`}>
                <div className="commit-diff-hunk" role="row">
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </div>
                {hunk.lines.map((line, index) => (
                  <DiffLine
                    key={`${line.oldLineNumber ?? "n"}-${line.newLineNumber ?? "n"}-${index}`}
                    line={line}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="commit-diff-state">No textual line changes</div>
      )}
    </section>
  );
};

export default React.memo(FileDiff);
