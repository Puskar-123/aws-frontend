import React from "react";

const FileEditorToolbar = ({ dirty, saving, onCancel, onSave }) => (
  <div className="file-editor-toolbar">
    <span className="file-editor-status" role="status">
      {saving ? "Saving changes…" : dirty ? "Unsaved changes" : "No unsaved changes"}
    </span>
    <div className="file-editor-toolbar__actions">
      <button type="button" className="file-editor-button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button type="button" className="file-editor-button file-editor-button--primary" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  </div>
);

export default FileEditorToolbar;
