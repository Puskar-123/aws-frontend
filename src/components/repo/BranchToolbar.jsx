import React, { useState } from "react";
import { FiClock, FiGitBranch, FiGitCommit, FiSearch } from "react-icons/fi";
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
          isAuthenticated={props.isAuthenticated}
          onSelect={props.onSelect}
          onCreate={() => setCreating(true)}
          onDelete={setDeleting}
        />
        <div className="repo-branch-metrics">
          <span className="repo-branch-count"><FiGitBranch aria-hidden="true" /><strong>{props.branches.length}</strong> {props.branches.length === 1 ? "branch" : "branches"}</span>
          <span className="repo-commit-count"><FiGitCommit aria-hidden="true" /><strong>{props.commitCount}</strong> {props.commitCount === 1 ? "commit" : "commits"}</span>
        </div>
        <div className="repo-branch-actions">
          {props.files?.length > 0 && <label className="repo-go-to-file"><FiSearch aria-hidden="true" /><span className="sr-only">Go to file</span><select aria-label="Go to file" value="" onChange={(event) => props.onGoToFile?.(event.target.value)}><option value="">Go to file</option>{props.files.map((file) => { const path = file.path || file.filename; return <option key={path} value={path}>{path}</option>; })}</select></label>}
          {props.commitCount > 0 && props.onHistory && <button type="button" className="repo-toolbar-button" onClick={props.onHistory}><FiClock aria-hidden="true" />History</button>}
          {canCompare && <button type="button" className="repo-toolbar-button" onClick={props.onCompare}>Compare</button>}
        </div>
      </div>
      {props.message && <div className="repo-branch-message" role="status">{props.message}</div>}
      {props.protection?.protected && <div className={`repo-protection-message${props.protection.canBypass ? " is-bypass" : ""}`} role="status">
        <span>{props.protection.canBypass
          ? `${props.selectedBranch} is protected. You are allowed to bypass these rules for direct changes.`
          : `Direct changes are blocked on protected branch ${props.selectedBranch}. Create a new branch and open a pull request.`}</span>
        {!props.protection.canBypass && <button type="button" onClick={() => setCreating(true)}>Create new branch</button>}
      </div>}
      {creating && <CreateBranchModal branches={props.branches} selectedBranch={props.selectedBranch} onClose={() => setCreating(false)} onCreate={async (values) => { await props.onCreate(values); setCreating(false); }} />}
      {deleting && <DeleteBranchDialog branch={deleting} onClose={() => setDeleting(null)} onDelete={async (branch) => { await props.onDelete(branch); setDeleting(null); }} />}
    </>
  );
};

export default BranchToolbar;
