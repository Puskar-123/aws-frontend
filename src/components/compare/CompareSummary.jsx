import React from "react";
import { FiAlertTriangle, FiGitCommit, FiMinus, FiPlus } from "react-icons/fi";

const CompareSummary = ({ comparison }) => {
  const { summary } = comparison;
  const identical = summary.filesChanged === 0 && comparison.ahead === 0 && comparison.behind === 0;
  return (
    <section className="compare-summary" aria-label="Comparison summary" aria-live="polite">
      {identical && <p className="compare-summary__message">These branches are identical</p>}
      {!comparison.ancestryAvailable && <p className="compare-summary__warning">Commit ancestry unavailable for this legacy history</p>}
      <div className="compare-summary__stats">
        <span><FiGitCommit aria-hidden="true" /><strong>{comparison.ahead ?? "—"}</strong> commits ahead</span>
        <span><FiGitCommit aria-hidden="true" /><strong>{comparison.behind ?? "—"}</strong> commits behind</span>
        <span><strong>{summary.filesChanged}</strong> files changed</span>
        <span className="is-addition"><FiPlus aria-hidden="true" /><strong>{summary.additions}</strong> additions</span>
        <span className="is-deletion"><FiMinus aria-hidden="true" /><strong>{summary.deletions}</strong> deletions</span>
        {summary.hasConflicts && <span className="is-conflict"><FiAlertTriangle aria-hidden="true" /><strong>{summary.conflictCount}</strong> potential merge conflicts</span>}
      </div>
    </section>
  );
};

export default CompareSummary;
