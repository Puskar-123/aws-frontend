import React, { useState } from "react";
import { FiChevronDown, FiChevronRight, FiCopy, FiExternalLink } from "react-icons/fi";
import SideBySideDiff from "./SideBySideDiff";
import UnifiedDiff from "./UnifiedDiff";

const STATUS = {
  added: ["A", "Added"], modified: ["M", "Modified"], deleted: ["D", "Deleted"], renamed: ["R", "Renamed"],
};

const FileDiffCard = ({ file, repositoryId, base, compare, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [view, setView] = useState("unified");
  const [copied, setCopied] = useState(false);
  const [short, label] = STATUS[file.status] || ["M", "Changed"];
  const copyPath = async () => {
    try { await navigator.clipboard.writeText(file.path); setCopied(true); }
    catch { setCopied(false); }
  };
  return (
    <article className={`compare-file-card${file.conflict ? " has-conflict" : ""}`}>
      <header className="compare-file-card__header">
        <button type="button" className="compare-file-card__expand" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
          <span className={`compare-status compare-status--${file.status}`} aria-label={label}>{short} {label}</span>
          <strong title={file.path}>{file.path}</strong>
          {file.oldPath && <small>from {file.oldPath}</small>}
        </button>
        <div className="compare-file-card__totals"><span>+{file.additions || 0}</span><span>−{file.deletions || 0}</span>{file.conflict && <span className="compare-conflict-badge">C Conflict</span>}</div>
      </header>
      {expanded && (
        <div className="compare-file-card__body">
          <div className="compare-file-card__tools">
            <button type="button" onClick={copyPath}><FiCopy aria-hidden="true" />{copied ? "Copied" : "Copy path"}</button>
            <a href={`/repo/${repositoryId}?branch=${encodeURIComponent(base)}`}><FiExternalLink aria-hidden="true" />View in base</a>
            <a href={`/repo/${repositoryId}?branch=${encodeURIComponent(compare)}`}><FiExternalLink aria-hidden="true" />View in compare</a>
            {!file.isBinary && !file.tooLarge && file.hunks?.length > 0 && <div className="compare-file-card__view-toggle"><button type="button" aria-pressed={view === "unified"} onClick={() => setView("unified")}>Unified</button><button type="button" aria-pressed={view === "split"} onClick={() => setView("split")}>Split</button></div>}
          </div>
          {file.conflict && <p className="compare-conflict-notice">Potential merge conflict: {file.conflictReason === "delete_modify" ? "one branch deleted a file changed by the other" : "both branches modified this file differently"}.</p>}
          {file.isBinary ? <div className="compare-diff-notice">Binary file changed</div>
            : file.tooLarge ? <div className="compare-diff-notice">File is too large for inline diff</div>
              : file.unavailable ? <div className="compare-diff-notice">{file.message || "Historical content is unavailable"}</div>
                : <><div className="compare-desktop-diff">{view === "split" ? <SideBySideDiff file={file} /> : <UnifiedDiff file={file} />}</div><div className="compare-mobile-diff"><UnifiedDiff file={file} /></div></>}
        </div>
      )}
    </article>
  );
};

export default FileDiffCard;
