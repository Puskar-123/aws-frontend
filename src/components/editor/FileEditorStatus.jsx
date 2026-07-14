import React from "react";

const FileEditorStatus = ({ loading, error }) => {
  if (loading) return <div className="file-editor-message" role="status">Loading file editor…</div>;
  if (error) return <div className="file-editor-message file-editor-message--error" role="alert">{error}</div>;
  return null;
};

export default FileEditorStatus;
