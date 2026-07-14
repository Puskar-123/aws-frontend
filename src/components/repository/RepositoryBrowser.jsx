import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiFolder } from "react-icons/fi";
import {
  buildFileTree,
  findPreferredFilePath,
  flattenTreeFiles,
} from "../../utils/buildFileTree";
import { getFileCategory } from "../../utils/fileType";
import { encodeRepoPath, normalizeRepoPath } from "../../utils/repoPath";
import FileTree from "./FileTree";
import FileViewer from "./FileViewer";
import "./repositoryBrowser.css";

const API_BASE = "https://api.codehub.sbs";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.error || data.message || `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
};

const parentPaths = (filePath) => {
  const segments = filePath.split("/").slice(0, -1);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
};

const RepositoryBrowser = ({
  repositoryId,
  repositoryName,
  files = [],
  branch = "",
  loading = false,
  emptyMessage = "No files in this repository",
  apiBase = API_BASE,
  onRename,
  onDelete,
  onEdit,
  requestedPath = "",
}) => {
  const scopeKey = `${repositoryId}:${branch || "default"}`;
  const tree = useMemo(() => buildFileTree(files), [files]);
  const fileNodes = useMemo(() => flattenTreeFiles(tree), [tree]);
  const availablePaths = useMemo(() => new Set(fileNodes.map((node) => node.path)), [fileNodes]);
  const automaticPath = useMemo(() => findPreferredFilePath(fileNodes), [fileNodes]);
  const [selection, setSelection] = useState({ repositoryId: "", path: "" });
  const [expandedState, setExpandedState] = useState({ repositoryId: "", paths: new Set() });
  const [focusRequest, setFocusRequest] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [previewState, setPreviewState] = useState({ path: "", status: "idle", data: null, error: "" });
  const [downloadState, setDownloadState] = useState({ path: "", status: "idle", error: "" });
  const previewRequestId = useRef(0);
  const downloadInFlight = useRef(false);

  const selectedPath = selection.repositoryId === scopeKey && availablePaths.has(selection.path)
    ? selection.path
    : automaticPath;
  useEffect(() => {
    if (requestedPath && availablePaths.has(requestedPath)) {
      setSelection({ repositoryId: scopeKey, path: requestedPath });
      setExpandedState({ repositoryId: scopeKey, paths: new Set(parentPaths(requestedPath)) });
    }
  }, [availablePaths, requestedPath, scopeKey]);
  const selectedNode = fileNodes.find((node) => node.path === selectedPath) || null;
  const defaultExpandedPaths = useMemo(() => {
    const defaults = new Set(parentPaths(automaticPath));
    const firstFolder = tree.find((node) => node.type === "folder");
    if (!fileNodes.some((node) => node.name.toLowerCase() === "readme.md") && firstFolder) {
      defaults.add(firstFolder.path);
    }
    return defaults;
  }, [automaticPath, fileNodes, tree]);
  const expandedPaths = expandedState.repositoryId === scopeKey
    ? expandedState.paths
    : defaultExpandedPaths;
  const initialCategory = selectedNode
    ? getFileCategory(selectedNode.path, selectedNode.file?.contentType)
    : "binary";

  useEffect(() => {
    if (!selectedNode || initialCategory === "image") return undefined;
    const controller = new AbortController();
    const requestId = ++previewRequestId.current;

    const loadPreview = async () => {
      try {
        const response = await fetch(
          `${apiBase}/repo/preview/${repositoryId}/${encodeRepoPath(selectedNode.path)}${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`,
          { headers: getAuthHeaders(), signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(await getErrorMessage(response, "Unable to preview file"));
        }
        const data = await response.json();
        if (requestId === previewRequestId.current) {
          setPreviewState({ path: selectedNode.path, status: "ready", data, error: "" });
        }
      } catch (error) {
        if (error.name !== "AbortError" && requestId === previewRequestId.current) {
          setPreviewState({ path: selectedNode.path, status: "error", data: null, error: error.message });
        }
      }
    };

    loadPreview();
    return () => controller.abort();
  }, [apiBase, branch, initialCategory, repositoryId, retryCount, selectedNode]);

  const currentPreview = selectedNode && previewState.path === selectedNode.path
    ? previewState
    : { path: selectedPath, status: initialCategory === "image" ? "ready" : "loading", data: null, error: "" };

  const expandParents = useCallback((filePath) => {
    setExpandedState((current) => {
      const base = current.repositoryId === scopeKey ? current.paths : defaultExpandedPaths;
      const next = new Set(base);
      parentPaths(filePath).forEach((folderPath) => next.add(folderPath));
      return { repositoryId: scopeKey, paths: next };
    });
  }, [defaultExpandedPaths, scopeKey]);

  const selectFile = useCallback((filePath) => {
    setSelection({ repositoryId: scopeKey, path: filePath });
    expandParents(filePath);
  }, [expandParents, scopeKey]);

  const toggleFolder = useCallback((folderPath) => {
    setExpandedState((current) => {
      const base = current.repositoryId === scopeKey ? current.paths : defaultExpandedPaths;
      const next = new Set(base);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return { repositoryId: scopeKey, paths: next };
    });
  }, [defaultExpandedPaths, scopeKey]);

  const focusFolder = useCallback((folderPath) => {
    setExpandedState((current) => {
      const base = current.repositoryId === scopeKey ? current.paths : defaultExpandedPaths;
      const next = new Set(base);
      const segments = folderPath.split("/");
      segments.forEach((_, index) => next.add(segments.slice(0, index + 1).join("/")));
      return { repositoryId: scopeKey, paths: next };
    });
    setFocusRequest({ path: folderPath, id: Date.now() });
  }, [defaultExpandedPaths, scopeKey]);

  const downloadFile = useCallback(async (filePath) => {
    if (downloadInFlight.current) return;
    downloadInFlight.current = true;
    setDownloadState({ path: filePath, status: "loading", error: "" });
    try {
      const response = await fetch(
        `${apiBase}/repo/file/${repositoryId}/${encodeRepoPath(filePath)}${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`,
        { headers: getAuthHeaders() },
      );
      if (!response.ok) throw new Error(await getErrorMessage(response, "Download failed"));
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = normalizeRepoPath(filePath).split("/").at(-1);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setDownloadState({ path: filePath, status: "idle", error: "" });
    } catch (error) {
      setDownloadState({ path: filePath, status: "error", error: error.message });
    } finally {
      downloadInFlight.current = false;
    }
  }, [apiBase, branch, repositoryId]);

  const renameFile = useCallback(async (filePath) => {
    const renamedFile = await onRename?.(filePath);
    if (renamedFile?.path) {
      selectFile(normalizeRepoPath(renamedFile.path));
    }
  }, [onRename, selectFile]);

  const deleteFile = useCallback(async (filePath) => {
    await onDelete?.(filePath);
  }, [onDelete]);

  if (loading) {
    return <div className="repo-browser repo-browser--loading" role="status">Loading repository files…</div>;
  }

  return (
    <section className="repo-browser" aria-label={`${repositoryName} repository browser`}>
      <aside className="repo-tree">
        <div className="repo-tree__header">
          <FiFolder aria-hidden="true" />
          <h2>Repository files</h2>
          <span>{fileNodes.length}</span>
        </div>
        <div className="repo-tree__scroll">
          <FileTree
            nodes={tree}
            expandedPaths={expandedPaths}
            selectedPath={selectedPath}
            focusRequest={focusRequest}
            onToggle={toggleFolder}
            onSelect={selectFile}
            emptyMessage={emptyMessage}
          />
        </div>
      </aside>
      <main className="repo-browser__preview">
        <FileViewer
          apiBase={apiBase}
          repositoryId={repositoryId}
          repositoryName={repositoryName}
          branch={branch}
          selectedNode={selectedNode}
          preview={currentPreview}
          getAuthHeaders={getAuthHeaders}
          downloading={downloadState.path === selectedPath && downloadState.status === "loading"}
          downloadError={downloadState.path === selectedPath ? downloadState.error : ""}
          onDownload={downloadFile}
          onEdit={onEdit}
          onRename={onRename ? renameFile : undefined}
          onDelete={onDelete ? deleteFile : undefined}
          onRetry={() => setRetryCount((count) => count + 1)}
          onFolderClick={focusFolder}
        />
      </main>
    </section>
  );
};

export default RepositoryBrowser;
