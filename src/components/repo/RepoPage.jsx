import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../Navbar";
import RepositoryBrowser from "../repository/RepositoryBrowser";
import "./repo.css";
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
  const invalidRepositoryId = !id || id === "undefined";
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
  const visibleFiles = useMemo(() => (repo?.content || []).filter((file) =>
    !isProtectedDisplayPath(file.path || file.filename)
  ), [repo?.content]);

  // ==========================
  // LOAD DATA
  // ==========================

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);


  // ==========================
  // FETCH REPOSITORY
  // ==========================

  const fetchRepo = useCallback(async () => {
    if (invalidRepositoryId) {
      console.error("Invalid repository ID:", id);
      return;
    }

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

      }
    } catch (err) {
      console.error(err);
      setRepo(null);
    } finally {
      setLoading(false);
    }
   }, [id, invalidRepositoryId]);
  // ==========================
  // FETCH COMMIT HISTORY
  // ==========================

  const fetchHistory = useCallback(async () => {
  if (invalidRepositoryId) return;

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
  }, [id, invalidRepositoryId]);

  useEffect(() => {
    if (invalidRepositoryId) return;

    const loadRepository = async () => {
      await Promise.all([fetchRepo(), fetchHistory()]);
    };
    loadRepository();
  }, [fetchHistory, fetchRepo, invalidRepositoryId]);

  const deleteFile = async (filePath) => {
    const ok = window.confirm(`Delete ${filePath}?`);
    if (!ok) return false;

    try {
      const res = await fetch(
        `${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`,
        { method: "DELETE", headers: authHeaders() },
      );
      const data = await readResponseData(res);
      alert(data.message);
      await Promise.all([fetchRepo(), fetchHistory()]);
      return true;
    } catch (err) {
      console.error(err);
      alert(`Delete failed: ${err.message}`);
      return false;
    }
  };

  const renameFile = async (filePath) => {
    const currentName = normalizeRepoPath(filePath).split("/").at(-1);
    const newName = prompt("Enter a new filename or relative path:", currentName);
    if (!newName || newName === currentName) return null;

    try {
      const res = await fetch(
        `${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ newName }),
        },
      );
      const data = await readResponseData(res);
      alert(data.message);
      await Promise.all([fetchRepo(), fetchHistory()]);
      return data.file || null;
    } catch (err) {
      console.error(err);
      alert(`Rename failed: ${err.message}`);
      return null;
    }
  };

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

  if (invalidRepositoryId) {
    return <h2 className="error">Repository not found ❌</h2>;
  }

  if (loading) {
    return <h2 className="loading">Loading...</h2>;
  }

  if (!repo) {
    return <h2 className="error">Repository not found ❌</h2>;
  }
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

<RepositoryBrowser
  repositoryId={id}
  repositoryName={repo.name}
  files={visibleFiles}
  onRename={renameFile}
  onDelete={deleteFile}
/>

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
