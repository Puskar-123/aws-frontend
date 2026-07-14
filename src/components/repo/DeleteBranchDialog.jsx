import React, { useEffect, useState } from "react";

const DeleteBranchDialog = ({ branch, onClose, onDelete }) => {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape" && !submitting) onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, submitting]);

  const confirmDelete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try { await onDelete(branch); }
    catch (requestError) { setError(requestError.message || "Unable to delete branch."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="repo-branch-modal-backdrop" role="presentation">
      <section className="repo-branch-modal repo-branch-modal--danger" role="alertdialog" aria-modal="true" aria-labelledby="delete-branch-title">
        <h2 id="delete-branch-title">Delete branch “{branch.name}”?</h2>
        <p>This deletes only the branch reference and cannot be undone.</p>
        {error && <div className="repo-branch-form-error" role="alert">{error}</div>}
        <div className="repo-branch-modal__actions">
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="is-danger" onClick={confirmDelete} disabled={submitting}>{submitting ? "Deleting branch..." : "Delete branch"}</button>
        </div>
      </section>
    </div>
  );
};

export default DeleteBranchDialog;
