import React from "react";
import { FiArrowLeft, FiRepeat } from "react-icons/fi";
import BranchSelector from "../repo/BranchSelector";

const CompareBranchSelectors = ({ branches, base, compare, onBase, onCompare, onSwap, canCreatePullRequest, onCreatePullRequest }) => (
  <section className="compare-selectors" aria-label="Branches to compare">
    <div className="compare-selector-field">
      <span className="compare-selector-label">base</span>
      <BranchSelector branches={branches} selectedBranch={base} defaultBranch={branches.find((branch) => branch.isDefault)?.name} loading={false} error="" canManage={false} onSelect={onBase} />
    </div>
    <FiArrowLeft className="compare-direction" aria-label="Compare into base" />
    <div className="compare-selector-field">
      <span className="compare-selector-label">compare</span>
      <BranchSelector branches={branches} selectedBranch={compare} defaultBranch={branches.find((branch) => branch.isDefault)?.name} loading={false} error="" canManage={false} onSelect={onCompare} />
    </div>
    <button type="button" className="compare-swap" onClick={onSwap} disabled={!base || !compare}>
      <FiRepeat aria-hidden="true" /> Swap
    </button>
    <button type="button" className="compare-pr-button" onClick={onCreatePullRequest} disabled={!canCreatePullRequest}>Create pull request</button>
  </section>
);

export default CompareBranchSelectors;
