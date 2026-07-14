import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  FiCopy,
  FiDownload,
  FiEdit2,
  FiEdit3,
  FiFile,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import {
  formatFileSize,
  getFileCategory,
  getReadableFileType,
  isBrowserEditableFile,
} from "../../utils/fileType";
import Breadcrumb from "./Breadcrumb";
import ImagePreview from "./ImagePreview";

const CodePreview = lazy(() => import("./CodePreview"));
const MarkdownPreview = lazy(() => import("./MarkdownPreview"));

const FileViewer = ({
  apiBase,
  repositoryId,
  repositoryName,
  branch,
  selectedNode,
  preview,
  getAuthHeaders,
  downloading,
  downloadError,
  onDownload,
  onEdit,
  onRename,
  onDelete,
  onRetry,
  onFolderClick,
}) => {
  const [copyState, setCopyState] = useState({ path: "", status: "idle" });
  const [sourceState, setSourceState] = useState({ path: "", showSource: false });
  const copyTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  if (!selectedNode) {
    return <div className="repo-preview-state">Select a file to preview</div>;
  }

  const { path, name, file } = selectedNode;
  const contentType = preview.data?.contentType || file.contentType || "";
  const category = getFileCategory(path, contentType);
  const content = preview.data?.content ?? "";
  const canCopy = (category === "text" || category === "markdown")
    && preview.status === "ready"
    && preview.data?.previewSupported !== false
    && content.length > 0;
  const copyStatus = copyState.path === path ? copyState.status : "idle";
  const showSource = sourceState.path === path && sourceState.showSource;
  const effectiveSize = file.size ?? file.fileSize ?? preview.data?.size;
  const fileSize = formatFileSize(effectiveSize);
  const canEdit = Boolean(onEdit)
    && isBrowserEditableFile(path, effectiveSize)
    && (category === "text" || category === "markdown")
    && preview.status === "ready"
    && preview.data?.previewSupported !== false;

  const copyContent = async () => {
    if (!canCopy) return;
    clearTimeout(copyTimerRef.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable");
      await navigator.clipboard.writeText(content);
      setCopyState({ path, status: "copied" });
      copyTimerRef.current = setTimeout(() => {
        setCopyState((current) => current.path === path
          ? { path, status: "idle" }
          : current);
      }, 1800);
    } catch {
      setCopyState({ path, status: "error" });
    }
  };

  const renderContent = () => {
    if (category === "image") {
      return (
        <ImagePreview
          apiBase={apiBase}
          repositoryId={repositoryId}
          filePath={path}
          filename={name}
          branch={branch}
          getAuthHeaders={getAuthHeaders}
        />
      );
    }

    if (preview.status === "loading") {
      return <div className="repo-preview-state" role="status">Loading preview…</div>;
    }

    if (preview.status === "error") {
      return (
        <div className="repo-preview-state repo-preview-state--error" role="alert">
          <p>{preview.error}</p>
          <button type="button" className="repo-browser-button" onClick={onRetry}>
            <FiRefreshCw aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }

    if (preview.data?.previewSupported === false || category === "binary") {
      return (
        <div className="repo-preview-state repo-preview-state--unsupported">
          <FiFile aria-hidden="true" />
          <h3>{name}</h3>
          <p>{getReadableFileType(path, contentType)}</p>
          <p>Inline preview is unavailable for this file type. You can still download the file.</p>
        </div>
      );
    }

    if (category === "markdown" && !showSource) return <MarkdownPreview content={content} />;
    return <CodePreview content={content} filePath={path} />;
  };

  return (
    <div className="repo-file-viewer">
      <Breadcrumb
        repositoryName={repositoryName}
        filePath={path}
        onFolderClick={onFolderClick}
      />
      <div className="repo-file-toolbar">
        <div className="repo-file-toolbar__identity" title={path}>
          <FiFile aria-hidden="true" />
          <strong>{path}</strong>
          {fileSize && <span>{fileSize}</span>}
        </div>
        <div className="repo-file-toolbar__actions">
          {category === "markdown" && preview.status === "ready" && (
            <button
              type="button"
              className="repo-browser-button"
              onClick={() => setSourceState({ path, showSource: !showSource })}
              aria-pressed={showSource}
            >
              {showSource ? "Rendered" : "View source"}
            </button>
          )}
          {(category === "text" || category === "markdown") && (
            <button
              type="button"
              className="repo-browser-button"
              onClick={copyContent}
              disabled={!canCopy}
              aria-label={`Copy ${path}`}
              title="Copy original file contents"
            >
              <FiCopy aria-hidden="true" />
              {copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy"}
            </button>
          )}
          {canEdit && (
            <button type="button" className="repo-browser-button" onClick={() => onEdit(path)}>
              <FiEdit3 aria-hidden="true" />
              Edit
            </button>
          )}
          {onRename && (
            <button type="button" className="repo-browser-button" onClick={() => onRename(path)}>
              <FiEdit2 aria-hidden="true" />
              Rename
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="repo-browser-button repo-browser-button--danger"
              onClick={() => onDelete(path)}
            >
              <FiTrash2 aria-hidden="true" />
              Delete
            </button>
          )}
          <button
            type="button"
            className="repo-browser-button"
            onClick={() => onDownload(path)}
            disabled={downloading}
          >
            <FiDownload aria-hidden="true" />
            {downloading ? "Downloading…" : "Download"}
          </button>
        </div>
      </div>
      {copyStatus === "error" && (
        <p className="repo-file-viewer__notice" role="alert">Clipboard access failed. Check browser permissions and try again.</p>
      )}
      {downloadError && <p className="repo-file-viewer__notice" role="alert">{downloadError}</p>}
      <div className="repo-file-viewer__content">
        <Suspense fallback={<div className="repo-preview-state" role="status">Loading viewer…</div>}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
};

export default FileViewer;
