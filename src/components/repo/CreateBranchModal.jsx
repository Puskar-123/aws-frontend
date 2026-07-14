import React, { useEffect, useState } from "react";
import { validateBranchName } from "./branchUtils";

const CreateBranchModal = ({ branches, selectedBranch, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [sourceBranch, setSourceBranch] = useState(selectedBranch);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, submitting]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const validationError = validateBranchName(name);
    if (validationError) { setError(validationError); return; }
    if (branches.some((branch) => branch.name === name.trim())) { setError("A branch with this name already exists."); return; }
    setSubmitting(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), sourceBranch });
    } catch (requestError) {
      setError(requestError.message || "Unable to create branch.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="repo-branch-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <section className="repo-branch-modal" role="dialog" aria-modal="true" aria-labelledby="create-branch-title">
        <h2 id="create-branch-title">Create a new branch</h2>
        <p>New branches start from the selected source branch.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="branch-name">Branch name</label>
          <input id="branch-name" autoFocus value={name} onChange={(event) => { setName(event.target.value); setError(""); }} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "branch-create-error" : "branch-name-help"} />
          <small id="branch-name-help">Example: feature/profile</small>
          <label htmlFor="source-branch">Source branch</label>
          <select id="source-branch" value={sourceBranch} onChange={(event) => setSourceBranch(event.target.value)}>
            {branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
          </select>
          {error && <div id="branch-create-error" className="repo-branch-form-error" role="alert">{error}</div>}
          <div className="repo-branch-modal__actions">
            <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="is-primary" disabled={submitting}>{submitting ? "Creating branch..." : "Create branch"}</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreateBranchModal;
