import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../Navbar";
import "./repo.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const RepoPage = () => {
  const { id } = useParams();
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  console.log("URL id =", id);

  // ==========================
  // STATES
  // ==========================

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);

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
    fetchRepo();
    fetchHistory();
  }, [id]);


    const previewFile = async (filename) => {
    console.log("Clicked:", filename);

      try {
        const res = await fetch(
          `https://api.codehub.sbs/repo/preview/${id}/${encodeURIComponent(filename)}`
        );

        console.log("Status:", res.status);

        const data = await res.json();

        console.log("Preview Response:", data);

        setPreview(data.content);
        setSelectedFile(filename);
      } catch (err) {
        console.error("Preview Error:", err);
      }
    };

  // ==========================
// DELETE FILE
// ==========================

const deleteFile = async (filename) => {
  const ok = window.confirm(`Delete ${filename}?`);

  if (!ok) return;

  try {
    const res = await fetch(
      `https://api.codehub.sbs/repo/file/${id}/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
      }
    );

    const data = await res.json();

    alert(data.message);

    fetchRepo();
    fetchHistory();

    if (selectedFile === filename) {
      setSelectedFile("");
      setPreview("");
    }

  } catch (err) {
    console.error(err);
  }
};

// ==========================
// RENAME FILE
// ==========================

const renameFile = async (filename) => {
  const newName = prompt("Enter new filename:", filename);

  if (!newName || newName === filename) return;

  try {
    const res = await fetch(
      `https://api.codehub.sbs/repo/file/${id}/${encodeURIComponent(filename)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newName,
        }),
      }
    );

    const data = await res.json();

    alert(data.message);

    fetchRepo();
    fetchHistory();

  } catch (err) {
    console.error(err);
  }
};
  // ==========================
  // FETCH REPOSITORY
  // ==========================

  const fetchRepo = async () => {
    try {
      const res = await fetch(
        `https://api.codehub.sbs/repo/${id}`
      );

      const data = await res.json();

      console.log("REPO DATA:", data);

      if (!res.ok) {
        setRepo(null);
      } else {
        setRepo(data);

        // Automatically open README.md
        const readme = data.content?.find(
          (file) => file.filename.toLowerCase() === "readme.md"
        );
        console.log("README found:", readme);
        if (readme) {
          previewFile(readme.filename);
        }
      }
    } catch (err) {
      console.error(err);
      setRepo(null);
    } finally {
      setLoading(false);
    }
   };
  // ==========================
  // FETCH COMMIT HISTORY
  // ==========================

  const fetchHistory = async () => {
  try {
    const res = await fetch(
      `https://api.codehub.sbs/repo/history/${id}`
    );

    const data = await res.json();

    console.log("HISTORY:", data);

    if (res.ok) {
      setHistory(data.commits || []);
    }
  } catch (err) {
    console.error(err);
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
        `https://api.codehub.sbs/repo/add/${id}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

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
        `https://api.codehub.sbs/repo/commit/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: commitMessage,
          }),
        }
      );

      const data = await res.json();

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
        `https://api.codehub.sbs/repo/push/${id}`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

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
        `https://api.codehub.sbs/repo/pull/${id}`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

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
            type="file"
            webkitdirectory=""
            directory=""
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

{repo.content?.length === 0 ? (
  <p className="no-files">
    No files yet
  </p>
) : (
  <div className="file-list">
    {repo.content.map((file, index) => (
      <div
        key={index}
        className="file-item"
      >
        <span
          className="file-name"
          onClick={() => previewFile(file.filename)}
        >
          📄 {file.filename}
        </span>

        <div className="file-actions">

          <button
            className="rename-btn"
            onClick={() => renameFile(file.filename)}
          >
            ✏ Rename
          </button>

          <button
            className="delete-btn"
            onClick={() => deleteFile(file.filename)}
          >
            🗑 Delete
          </button>

          <a
            href={`https://api.codehub.sbs/repo/file/${id}/${encodeURIComponent(file.filename)}`}
            download
            className="download-link"
          >
            ⬇ Download
          </a>

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
