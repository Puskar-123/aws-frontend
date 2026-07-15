import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  FiCopy,
  FiDownload,
  FiEdit2,
  FiEdit3,
  FiFile,
  FiMoreHorizontal,
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
  const [moreOpen, setMoreOpen] = useState(false);
  const copyTimerRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const outside = (event) => { if (!moreRef.current?.contains(event.target)) setMoreOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setMoreOpen(false); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [moreOpen]);

  if (!selectedNode) {
    return <div className="repo-preview-state">Select a file to preview</div>;
  }

  const { path, name, file } = selectedNode;
  const contentType = preview.data?.contentType || file.contentType || "";
  const category = getFileCategory(path, contentType);
  const content = preview.data?.content ?? "";
  const copyStatus = copyState.path === path ? copyState.status : "idle";
  const showSource = sourceState.path === path && sourceState.showSource;
  const effectiveSize = file.size ?? file.fileSize ?? preview.data?.size;
  const fileSize = formatFileSize(effectiveSize);
  const canEdit = Boolean(onEdit)
    && isBrowserEditableFile(path, effectiveSize)
    && (category === "text" || category === "markdown")
    && preview.status === "ready"
    && preview.data?.previewSupported !== false;

  const copyPath = async () => {
    clearTimeout(copyTimerRef.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable");
      await navigator.clipboard.writeText(path);
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
          {canEdit && (
            <button type="button" className="repo-browser-button" onClick={() => onEdit(path)}>
              <FiEdit3 aria-hidden="true" />
              Edit
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
          <div className="repo-file-more" ref={moreRef}>
            <button type="button" className="repo-browser-button" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><FiMoreHorizontal aria-hidden="true" />More</button>
            {moreOpen && <div className="repo-file-more__menu" role="menu">
              {onRename && <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onRename(path); }}><FiEdit2 aria-hidden="true" />Rename</button>}
              <button type="button" role="menuitem" onClick={() => { copyPath(); setMoreOpen(false); }}><FiCopy aria-hidden="true" />{copyStatus === "copied" ? "Path copied" : "Copy path"}</button>
              {onDelete && <button type="button" role="menuitem" className="is-danger" onClick={() => { setMoreOpen(false); onDelete(path); }}><FiTrash2 aria-hidden="true" />Delete</button>}
            </div>}
          </div>
        </div>
      </div>
      {copyStatus === "error" && (
        <p className="repo-file-viewer__notice" role="alert">Clipboard access failed. Check browser permissions and try again.</p>
      )}
      <span className="sr-only" aria-live="polite">{copyStatus === "copied" ? "File path copied" : ""}</span>
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
