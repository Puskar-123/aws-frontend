import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../Navbar";
import "./repo.css";

const RepoPage = () => {
  const { id } = useParams();

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepo();
  }, [id]);

  const fetchRepo = async () => {
    try {
      const res = await fetch(`https://api.codehub.sbs/repo/${id}`);
      const data = await res.json();

      console.log("REPO DATA:", data);

      setRepo(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // 🚀 PUSH FUNCTION
  const handlePush = async () => {
    try {
      const res = await fetch(`https://api.codehub.sbs/repo/push/${id}`, {
        method: "POST",
      });

      const data = await res.json();

      console.log("PUSH RESPONSE:", data);
// https://api.codehub.sbs
      if (!res.ok) {
        alert(data.error || "Push failed");
        return;
      }

      alert("✅ Push successful!");

      fetchRepo(); // reload files

    } catch (err) {
      console.error(err);
      alert("Push error");
    }
  };

  if (loading) return <h2 className="loading">Loading...</h2>;

  if (!repo) return <h2 className="error">Repository not found ❌</h2>;

  return (
    <>
      <Navbar />

      <div className="repo-container">

        {/* HEADER */}
        <div className="repo-header">
          <h1>{repo.name}</h1>

          <button onClick={handlePush} className="push-btn">
            🚀 Push
          </button>
        </div>

        {/* DESCRIPTION */}
        <p className="repo-description">
          {repo.description || "No description"}
        </p>

        {/* VISIBILITY */}
        <p className="repo-visibility">
          Visibility:{" "}
          <strong>
            {repo.visibility === "public" ? "Public" : "Private"}
          </strong>
        </p>

        <hr />

        {/* FILE SECTION */}
        <h3>Files</h3>

        {repo.content?.length === 0 ? (
          <p className="no-files">No files yet</p>
        ) : (
          <div className="file-list">
            {repo.content.map((file, i) => (
              <div key={i} className="file-item">
                📄 {file.filename}
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
};

export default RepoPage;