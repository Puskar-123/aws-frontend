import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../Navbar";
import "./repo.css";

const RepoPage = () => {
  const { id } = useParams();

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
  setSelectedFiles(Array.from(e.target.files));
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

          <input
            type="file"
            multiple
            onChange={handleFileSelect}
          />

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

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            style={{
              flex: 1,
              minWidth: "250px",
              padding: "10px",
              borderRadius: "6px",
            }}
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

   {/* FILES */}

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
          <a
            href={`https://api.codehub.sbs/repo/file/${id}/${encodeURIComponent(file.filename)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            📄 {file.filename}
          </a>
        </div>
        ))}
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
                style={{
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "15px",
                  marginBottom: "20px",
                  background: "#1e1e1e",
                }}
              >
                <h4
                  style={{
                    marginBottom: "8px",
                    color: "#4CAF50",
                  }}
                >
                  📝 {commit.message}
                </h4>

                <p
                  style={{
                    fontSize: "13px",
                    color: "#bbb",
                    marginBottom: "10px",
                  }}
                >
                  {new Date(commit.time).toLocaleString()}
                </p>

                <strong>Files:</strong>

                <ul
                  style={{
                    marginTop: "10px",
                    paddingLeft: "20px",
                  }}
                >
                  {commit.files.map((file, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: "6px",
                      }}
                    >
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

// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import Navbar from "../Navbar";
// import "./repo.css";

// const RepoPage = () => {
//   const { id } = useParams();

//   const [repo, setRepo] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // File Upload
//   const [selectedFiles, setSelectedFiles] = useState([]);

//   // Commit
//   const [commitMessage, setCommitMessage] = useState("");
//   const [committing, setCommitting] = useState(false);

//   useEffect(() => {
//     fetchRepo();
//   }, [id]);

//   // ==========================
//   // FETCH REPOSITORY
//   // ==========================
//   const fetchRepo = async () => {
//     try {
//       const res = await fetch(`https://api.codehub.sbs/repo/${id}`);
//       const data = await res.json();

//       console.log("REPO DATA:", data);

//       if (!res.ok) {
//         setRepo(null);
//       } else {
//         setRepo(data);
//       }
//     } catch (err) {
//       console.error(err);
//       setRepo(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ==========================
//   // FILE SELECT
//   // ==========================
//   const handleFileSelect = (e) => {
//     setSelectedFiles(Array.from(e.target.files));
//   };

//   // ==========================
//   // ADD FILES
//   // ==========================
//   const handleAddFiles = async () => {
//     if (selectedFiles.length === 0) {
//       alert("Please select files first.");
//       return;
//     }

//     try {
//       const formData = new FormData();

//       selectedFiles.forEach((file) => {
//         formData.append("files", file);
//       });

//       const res = await fetch(
//         `https://api.codehub.sbs/repo/add/${id}`,
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

//       const data = await res.json();

//       console.log("ADD RESPONSE:", data);

//       if (!res.ok) {
//         alert(data.error || "Failed to add files");
//         return;
//       }

//       alert(data.message);

//       setSelectedFiles([]);
//     } catch (err) {
//       console.error(err);
//       alert("Upload failed");
//     }
//   };

//   // ==========================
//   // COMMIT
//   // ==========================
//   const handleCommit = async () => {
//     if (!commitMessage.trim()) {
//       alert("Please enter a commit message.");
//       return;
//     }

//     try {
//       setCommitting(true);

//       const res = await fetch(
//         `https://api.codehub.sbs/repo/commit/${id}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             message: commitMessage,
//           }),
//         }
//       );

//       const data = await res.json();

//       console.log("COMMIT RESPONSE:", data);

//       if (!res.ok) {
//         alert(data.error || "Commit failed");
//         return;
//       }

//       alert(data.message);

//       setCommitMessage("");
//     } catch (err) {
//       console.error(err);
//       alert("Commit failed");
//     } finally {
//       setCommitting(false);
//     }
//   };

//   // ==========================
//   // PUSH
//   // ==========================
//   const handlePush = async () => {
//     try {
//       const res = await fetch(
//         `https://api.codehub.sbs/repo/push/${id}`,
//         {
//           method: "POST",
//         }
//       );

//       const data = await res.json();

//       console.log("PUSH RESPONSE:", data);

//       if (!res.ok) {
//         alert(data.error || "Push failed");
//         return;
//       }

//       alert("✅ Push successful!");

//       fetchRepo();
//     } catch (err) {
//       console.error(err);
//       alert("Push failed");
//     }
//   };

//   // ==========================
//   // PULL
//   // ==========================
//   const handlePull = async () => {
//     try {
//       const res = await fetch(
//         `https://api.codehub.sbs/repo/pull/${id}`,
//         {
//           method: "POST",
//         }
//       );

//       const data = await res.json();

//       console.log("PULL RESPONSE:", data);

//       if (!res.ok) {
//         alert(data.error || "Pull failed");
//         return;
//       }

//       alert("⬇ Pull successful!");
//       fetchRepo();
//     } catch (err) {
//       console.error(err);
//       alert("Pull failed");
//     }
//   };

//   // ==========================
//   // LOADING
//   // ==========================
//   if (loading) {
//     return <h2 className="loading">Loading...</h2>;
//   }

//   if (!repo) {
//     return <h2 className="error">Repository not found ❌</h2>;
//   }

//   return (
//     <>
//       <Navbar />

//       <div className="repo-container">

//         {/* HEADER */}

//         <div className="repo-header">

//           <h1>{repo.name}</h1>

//           <input
//             type="file"
//             multiple
//             onChange={handleFileSelect}
//           />

//           <button
//             onClick={handleAddFiles}
//             className="push-btn"
//           >
//             📂 Add Files
//           </button>

//         </div>

//         {/* COMMIT SECTION */}

//         <div
//           style={{
//             marginTop: "20px",
//             display: "flex",
//             gap: "10px",
//             alignItems: "center",
//             flexWrap: "wrap",
//           }}
//         >
//           <input
//             type="text"
//             placeholder="Commit message"
//             value={commitMessage}
//             onChange={(e) => setCommitMessage(e.target.value)}
//             style={{
//               flex: 1,
//               minWidth: "250px",
//               padding: "10px",
//               borderRadius: "6px",
//             }}
//           />

//           <button
//             onClick={handleCommit}
//             className="push-btn"
//             disabled={committing}
//           >
//             {committing ? "Committing..." : "📝 Commit"}
//           </button>

//           <button
//             onClick={handlePush}
//             className="push-btn"
//           >
//             🚀 Push
//           </button>

//           <button
//             onClick={handlePull}
//             className="push-btn"
//           >
//             ⬇ Pull
//           </button>
//         </div>

//         {/* DESCRIPTION */}

//         <p className="repo-description">
//           {repo.description || "No description"}
//         </p>

//         {/* VISIBILITY */}

//         <p className="repo-visibility">
//           Visibility:{" "}
//           <strong>
//             {repo.visibility === "public"
//               ? "Public"
//               : "Private"}
//           </strong>
//         </p>

//         <hr />

//         {/* FILES */}

//         <h3>Files</h3>

//         {repo.content?.length === 0 ? (
//           <p className="no-files">
//             No files yet
//           </p>
//         ) : (
//           <div className="file-list">
//             {repo.content.map((file, index) => (
//               <div
//                 key={index}
//                 className="file-item"
//               >
//                 📄 {file.filename}
//               </div>
//             ))}
//           </div>
//         )}

//       </div>
//     </>
//   );
// };

// export default RepoPage;