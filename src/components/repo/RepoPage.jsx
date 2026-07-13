import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../Navbar";
import "./repo.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { encodeRepoPath, normalizeRepoPath } from "../../utils/repoPath";

const API_BASE = "https://api.codehub.sbs";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const readResponseData = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
};

const isProtectedDisplayPath = (filePath) => {
  const basename = String(filePath || "").replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  return basename === ".env"
    || (basename.startsWith(".env.") && basename !== ".env.example")
    || basename.endsWith(".pem")
    || basename.endsWith(".key");
};

const RepoPage = () => {
  const { id } = useParams();
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const folderInputRef = useRef(null);
  console.log("URL id =", id);

  // ==========================
  // STATES
  // ==========================

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repoWarning, setRepoWarning] = useState("");

  // File Upload
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Commit
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);

  // Commit History
  const [history, setHistory] = useState([]);

  // ==========================
  // LOAD DATA
  // ==========================

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);


  const previewFile = useCallback(async (filePath) => {
    try {
      const res = await fetch(
        `${API_BASE}/repo/preview/${id}/${encodeRepoPath(filePath)}`,
        { headers: authHeaders() }
      );
      const data = await readResponseData(res);
      setPreview(data.previewSupported === false
        ? `Binary preview is not supported (${data.contentType || "unknown content type"}).`
        : data.content || "");
      setSelectedFile(data.path || normalizeRepoPath(filePath));
    } catch (err) {
      console.error("Preview Error:", err);
      setPreview(`Unable to preview file: ${err.message}`);
      setSelectedFile(normalizeRepoPath(filePath));
    }
  }, [id]);

  // ==========================
// DELETE FILE
// ==========================

const deleteFile = async (filePath) => {
  const ok = window.confirm(`Delete ${filePath}?`);

  if (!ok) return;

  try {
    const res = await fetch(
      `${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      }
    );
    const data = await readResponseData(res);

    alert(data.message);

    fetchRepo();
    fetchHistory();

    if (selectedFile === normalizeRepoPath(filePath)) {
      setSelectedFile("");
      setPreview("");
    }

  } catch (err) {
    console.error(err);
    alert(`Delete failed: ${err.message}`);
  }
};

// ==========================
// RENAME FILE
// ==========================

const renameFile = async (filePath) => {
  const currentName = normalizeRepoPath(filePath).split("/").at(-1);
  const newName = prompt("Enter a new filename or relative path:", currentName);

  if (!newName || newName === currentName) return;

  try {
    const res = await fetch(
      `${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          newName,
        }),
      }
    );

    const data = await readResponseData(res);

    alert(data.message);

    fetchRepo();
    fetchHistory();

  } catch (err) {
    console.error(err);
    alert(`Rename failed: ${err.message}`);
  }
};

const downloadFile = async (filePath) => {
  try {
    const response = await fetch(
      `${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`,
      { headers: authHeaders() }
    );
    if (!response.ok) {
      await readResponseData(response);
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = normalizeRepoPath(filePath).split("/").at(-1);
    link.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    alert(`Download failed: ${error.message}`);
  }
};
  // ==========================
  // FETCH REPOSITORY
  // ==========================

  const fetchRepo = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/repo/${id}`,
        { headers: authHeaders() }
      );
      const data = await readResponseData(res);

      console.log("REPO DATA:", data);

      if (!res.ok) {
        setRepo(null);
      } else {
        setRepo(data);
        setRepoWarning((data.warnings || []).join(" "));

        // Automatically open README.md
        const readme = data.content?.find((file) => {
          const normalized = file.path?.replace(/\\/g, "/").toLowerCase();
          return file.filename?.toLowerCase() === "readme.md"
            || normalized === "readme.md"
            || normalized?.endsWith("/readme.md");
        });
        if (readme) {
          previewFile(readme.path);
        }
      }
    } catch (err) {
      console.error(err);
      setRepo(null);
    } finally {
      setLoading(false);
    }
   }, [id, previewFile]);
  // ==========================
  // FETCH COMMIT HISTORY
  // ==========================

  const fetchHistory = useCallback(async () => {
  try {
    const res = await fetch(
      `${API_BASE}/repo/history/${id}`,
      { headers: authHeaders() }
    );

    const data = await readResponseData(res);

    console.log("HISTORY:", data);

    if (res.ok) {
      setHistory(data.commits || []);
    }
  } catch (err) {
    console.error(err);
  }
  }, [id]);

  useEffect(() => {
    fetchRepo();
    fetchHistory();
  }, [fetchHistory, fetchRepo]);
  // ==========================
// FILE SELECT
// ==========================

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files);

  console.log("Selected Files:");

  files.forEach((file) => {
    console.log({
      name: file.name,
      relativePath: file.webkitRelativePath,
      size: file.size,
    });
  });

  setSelectedFiles(files);
};

  // ==========================
  // ADD FILES
  // ==========================

  const handleAddFiles = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select files first.");
      return;
    }

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("files", file);

        formData.append(
          "paths",
          file.webkitRelativePath || file.name
        );
      });

      const res = await fetch(
        `${API_BASE}/repo/add/${id}`,
        {
          method: "POST",
          body: formData,
          headers: authHeaders(),
        }
      );

      const data = await readResponseData(res);

      console.log("ADD RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Failed to add files");
        return;
      }

      alert(data.message);

      setSelectedFiles([]);

      // Refresh repository
      fetchRepo();

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  // ==========================
  // COMMIT
  // ==========================

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      alert("Please enter a commit message.");
      return;
    }

    try {
      setCommitting(true);

      const res = await fetch(
        `${API_BASE}/repo/commit/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            message: commitMessage,
          }),
        }
      );

      const data = await readResponseData(res);

      console.log("COMMIT RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Commit failed");
        return;
      }

      alert(data.message);

      setCommitMessage("");

      fetchRepo();
      fetchHistory();

    } catch (err) {
      console.error(err);
      alert("Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  // ==========================
  // PUSH
  // ==========================

  const handlePush = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/repo/push/${id}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const data = await readResponseData(res);

      console.log("PUSH RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Push failed");
        return;
      }

      alert("✅ Push successful!");

      fetchRepo();
      fetchHistory();

    } catch (err) {
      console.error(err);
      alert("Push failed");
    }
  };

  // ==========================
  // PULL
  // ==========================

  const handlePull = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/repo/pull/${id}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      const data = await readResponseData(res);

      console.log("PULL RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Pull failed");
        return;
      }

      alert("⬇ Pull successful!");

      fetchRepo();
      fetchHistory();

    } catch (err) {
      console.error(err);
      alert("Pull failed");
    }
  };

  // ==========================
  // LOADING
  // ==========================

  if (loading) {
    return <h2 className="loading">Loading...</h2>;
  }

  if (!repo) {
    return <h2 className="error">Repository not found ❌</h2>;
  }
  const visibleFiles = (repo.content || []).filter((file) =>
    !isProtectedDisplayPath(file.path || file.filename)
  );
    return (
    <>
      <Navbar />

      <div className="repo-container">

      {/* ========================== */}
      {/* HEADER */}
      {/* ========================== */}

    <div className="repo-header">

      <h1>{repo.name}</h1>

      <label className="upload-btn">
        📁 Upload Project Folder

        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
        />
      </label>

      <button
        onClick={handleAddFiles}
        className="push-btn"
      >
        📂 Add Files
      </button>

      </div>

{/* ========================== */}
{/* COMMIT SECTION */}
{/* ========================== */}

  <div className="commit-section">
  <input
    type="text"
    placeholder="Commit message"
    value={commitMessage}
    onChange={(e) => setCommitMessage(e.target.value)}
    className="commit-input"
/>

    <button
      onClick={handleCommit}
      className="push-btn"
      disabled={committing}
    >
      {committing ? "Committing..." : "📝 Commit"}
    </button>

    <button
      onClick={handlePush}
      className="push-btn"
    >
      🚀 Push
    </button>

    <button
      onClick={handlePull}
      className="push-btn"
    >
      ⬇ Pull
    </button>

  </div>

  {/* ========================== */}
  {/* DESCRIPTION */}
  {/* ========================== */}

  <p className="repo-description">
    {repo.description || "No description"}
  </p>

  {repoWarning && <p className="error">⚠ {repoWarning}</p>}

  {/* ========================== */}
  {/* VISIBILITY */}
  {/* ========================== */}

  <p className="repo-visibility">
    Visibility:{" "}
    <strong>
      {repo.visibility === "public"
        ? "Public"
        : "Private"}
    </strong>
  </p>

  <hr />
 {/* ========================== */}
{/* FILES */}
{/* ========================== */}

<h3>Files</h3>

{visibleFiles.length === 0 ? (
  <p className="no-files">
    No files yet
  </p>
) : (
  <div className="file-list">
    {visibleFiles.map((file) => (
      <div
        key={file.path}
        className="file-item"
      >
        <span
          className="file-name"
          onClick={() => previewFile(file.path)}
        >
          📄 {file.path}
        </span>

        <div className="file-actions">

          <button
            className="rename-btn"
            onClick={() => renameFile(file.path)}
          >
            ✏ Rename
          </button>

          <button
            className="delete-btn"
            onClick={() => deleteFile(file.path)}
          >
            🗑 Delete
          </button>

          <button
            type="button"
            onClick={() => downloadFile(file.path)}
            className="download-link"
          >
            ⬇ Download
          </button>

        </div>
      </div>
    ))}
  </div>
)}

{/* ========================== */}
{/* FILE PREVIEW */}
{/* ========================== */}

{selectedFile && (
  <div className="preview-box">
    <h3>📄 {selectedFile}</h3>

    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {preview}
    </ReactMarkdown>
  </div>
  )}

<hr />

  {/* ========================== */}
  {/* COMMIT HISTORY */}
  {/* ========================== */}

  <h3>🕒 Commit History</h3>

  {history.length === 0 ? (
    <p className="no-files">
      No commits yet.
    </p>
  ) : (
    history
      .slice()
      .reverse()
      .map((commit, index) => (
        <div
          key={index}
          className="commit-card"
        >
          <h4 className="commit-title">
            📝 {commit.message}
          </h4>

          <p className="commit-time">
            {new Date(commit.time).toLocaleString()}
          </p>

          <strong>Files:</strong>

          <ul className="commit-files">
            {commit.files.map((file, i) => (
              <li key={i}>
                📄 {file.filename}
              </li>
            ))}
          </ul>
        </div>
      ))
    )}

  </div>   
      </>         
    );
  };

  export default RepoPage;
