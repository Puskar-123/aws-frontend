import React, { useState } from "react";
import { FiGitBranch, FiGitCommit } from "react-icons/fi";
import BranchSelector from "./BranchSelector";
import CreateBranchModal from "./CreateBranchModal";
import DeleteBranchDialog from "./DeleteBranchDialog";

const BranchToolbar = (props) => {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const canCompare = props.branches.length > 1;
  return (
    <>
      <div className="repo-branch-toolbar">
        <BranchSelector
          branches={props.branches}
          selectedBranch={props.selectedBranch}
          defaultBranch={props.defaultBranch}
          loading={props.loading}
          error={props.error}
          canManageBranches={props.canManageBranches}
          onSelect={props.onSelect}
          onCreate={() => setCreating(true)}
          onDelete={setDeleting}
        />
        <div className="repo-branch-metrics">
          <span className="repo-branch-count"><FiGitBranch aria-hidden="true" /><strong>{props.branches.length}</strong> {props.branches.length === 1 ? "branch" : "branches"}</span>
          <span className="repo-commit-count"><FiGitCommit aria-hidden="true" /><strong>{props.commitCount}</strong> {props.commitCount === 1 ? "commit" : "commits"}</span>
        </div>
        <button
          type="button"
          className="repo-compare-button"
          disabled={!canCompare}
          title={canCompare ? "Compare branches" : "Create another branch to compare changes"}
          onClick={props.onCompare}
        >Compare</button>
      </div>
      {props.message && <div className="repo-branch-message" role="status">{props.message}</div>}
      {creating && <CreateBranchModal branches={props.branches} selectedBranch={props.selectedBranch} onClose={() => setCreating(false)} onCreate={async (values) => { await props.onCreate(values); setCreating(false); }} />}
      {deleting && <DeleteBranchDialog branch={deleting} onClose={() => setDeleting(null)} onDelete={async (branch) => { await props.onDelete(branch); setDeleting(null); }} />}
    </>
  );
};

export default BranchToolbar;
