import React, { useState } from "react";
import { FiAlertCircle, FiGitCommit, FiRefreshCw, FiX } from "react-icons/fi";
import DiffFileList from "./DiffFileList";
import FileDiff from "./FileDiff";

const CommitDiffViewer = ({ commitId, entry, onClose, onRetry }) => {
  const data = entry?.data;
  const files = data?.files || [];
  const commitDate = data?.commit?.time && !Number.isNaN(Date.parse(data.commit.time))
    ? new Date(data.commit.time).toLocaleString()
    : "Date unavailable";
  const [selection, setSelection] = useState({ commitId: "", path: "" });
  const selectedPath = selection.commitId === commitId
    && files.some((file) => file.path === selection.path)
    ? selection.path
    : files[0]?.path || "";
  const selectedFile = files.find((file) => file.path === selectedPath) || null;

  return (
    <section id={`commit-diff-${commitId}`} className="commit-diff" aria-label="Commit changes">
      <div className="commit-diff__topbar">
        <div>
          <FiGitCommit aria-hidden="true" />
          <strong>{data?.commit?.message || "Commit changes"}</strong>
          {data?.commit?.shortHash && <code>{data.commit.shortHash}</code>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close commit changes" title="Close">
          <FiX aria-hidden="true" />
        </button>
      </div>

      {entry?.status === "loading" && (
        <div className="commit-diff-state" role="status">Loading commit changes…</div>
      )}

      {entry?.status === "error" && (
        <div className="commit-diff-state commit-diff-state--error" role="alert">
          <FiAlertCircle aria-hidden="true" />
          <p>{entry.error}</p>
          <button type="button" onClick={onRetry}>
            <FiRefreshCw aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {entry?.status === "ready" && data && (
        <>
          <div className="commit-diff-summary">
            <div>
              <strong>{data.summary.filesChanged}</strong>
              <span>{data.summary.filesChanged === 1 ? "file changed" : "files changed"}</span>
            </div>
            <span className="commit-diff-summary__additions">+{data.summary.additions} additions</span>
            <span className="commit-diff-summary__deletions">−{data.summary.deletions} deletions</span>
            <span>{data.commit.author?.name || "Unknown author"}</span>
            <time dateTime={data.commit.time || undefined}>{commitDate}</time>
            {data.commit.branch && <span>Branch: {data.commit.branch}</span>}
            {data.commit.parent && <code>Parent: {String(data.commit.parent).slice(0, 7)}</code>}
          </div>
          {data.warnings?.map((warning) => (
            <p className="commit-diff__warning" key={warning}>{warning}</p>
          ))}
          {files.length ? (
            <div className="commit-diff-viewer">
              <DiffFileList
                files={files}
                selectedPath={selectedPath}
                onSelect={(path) => setSelection({ commitId, path })}
              />
              <FileDiff file={selectedFile} />
            </div>
          ) : (
            <div className="commit-diff-state">No changed files in this commit</div>
          )}
        </>
      )}
    </section>
  );
};

export default CommitDiffViewer;
