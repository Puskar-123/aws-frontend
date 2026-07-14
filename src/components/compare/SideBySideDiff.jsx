import React from "react";

const SideBySideDiff = ({ file }) => {
  const lines = (file.hunks || []).flatMap((hunk) => hunk.lines);
  return (
    <div className="compare-split-diff" aria-label={`Split diff for ${file.path}`}>
      <div className="compare-split-diff__head"><span>Old version</span><span>New version</span></div>
      {lines.map((line, index) => (
        <div className={`compare-split-row compare-split-row--${line.type}`} key={`${line.oldLineNumber}-${line.newLineNumber}-${index}`}>
          <div><span>{line.oldLineNumber ?? ""}</span><code>{line.type === "added" ? "" : line.content || " "}</code></div>
          <div><span>{line.newLineNumber ?? ""}</span><code>{line.type === "removed" ? "" : line.content || " "}</code></div>
        </div>
      ))}
    </div>
  );
};

export default SideBySideDiff;
