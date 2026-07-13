import React, { useEffect, useRef, useState } from "react";
import { FiExternalLink, FiImage } from "react-icons/fi";
import { encodeRepoPath } from "../../utils/repoPath";

const responseError = async (response) => {
  try {
    const data = await response.json();
    return data.error || data.message || `Image request failed (${response.status})`;
  } catch {
    return `Image request failed (${response.status})`;
  }
};

const ImagePreview = ({ apiBase, repositoryId, filePath, filename, getAuthHeaders }) => {
  const [imageState, setImageState] = useState({ path: "", status: "loading", url: "", error: "" });
  const [loadErrorPath, setLoadErrorPath] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    let objectUrl = "";

    const loadImage = async () => {
      try {
        const response = await fetch(
          `${apiBase}/repo/file/${repositoryId}/${encodeRepoPath(filePath)}`,
          { headers: getAuthHeaders(), signal: controller.signal },
        );
        if (!response.ok) throw new Error(await responseError(response));
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (currentRequest === requestId.current) {
          setImageState({ path: filePath, status: "ready", url: objectUrl, error: "" });
        }
      } catch (error) {
        if (error.name !== "AbortError" && currentRequest === requestId.current) {
          setImageState({ path: filePath, status: "error", url: "", error: error.message });
        }
      }
    };

    loadImage();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiBase, filePath, getAuthHeaders, repositoryId]);

  const currentState = imageState.path === filePath
    ? imageState
    : { status: "loading", url: "", error: "" };
  const imageFailedToRender = loadErrorPath === filePath;

  if (currentState.status === "loading") {
    return <div className="repo-preview-state" role="status">Loading image…</div>;
  }

  if (currentState.status === "error" || imageFailedToRender) {
    return (
      <div className="repo-preview-state repo-preview-state--error" role="alert">
        <FiImage aria-hidden="true" />
        <p>{currentState.error || "The image could not be displayed."}</p>
      </div>
    );
  }

  return (
    <div className="repo-image-preview">
      <div className="repo-image-preview__canvas">
        <img
          src={currentState.url}
          alt={`Preview of ${filename}`}
          onError={() => setLoadErrorPath(filePath)}
        />
      </div>
      <a
        className="repo-browser-button"
        href={currentState.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FiExternalLink aria-hidden="true" />
        Open image
      </a>
    </div>
  );
};

export default ImagePreview;
