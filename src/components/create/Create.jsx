import React, { useState } from "react";
import Navbar from "../Navbar";
import "./create.css";
import { useNavigate } from "react-router-dom";

const Create = () => {
  const navigate = useNavigate();

  const [success, setSuccess] = useState("");

  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");

  // README Option
  const [addReadme, setAddReadme] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User not logged in");
      return;
    }

    if (!repoName.trim()) {
      alert("Repository name is required");
      return;
    }

    try {
      const res = await fetch(
        "https://api.codehub.sbs/repo/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: repoName.trim(),
            description,
            visibility,
            owner: userId,
            content: [],
            issues: [],
            addReadme,
          }),
        }
      );

      const data = await res.json();

      console.log("FULL RESPONSE:", data);
      alert(JSON.stringify(data));

      console.log("API RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Failed to create repository");
        return;
      }

      setSuccess("Repository created successfully!");

      // Reset Form
      setRepoName("");
      setDescription("");
      setVisibility("public");
      setAddReadme(false);

      const repoId = data.repositoryID;

      console.log("Created Repository ID:", repoId);

      setTimeout(() => {
        setSuccess("");
        navigate(`/repo/${repoId}`);
      }, 1000);

    } catch (err) {
      console.error(err);
      alert("Server Error");
    }
  };

  return (
    <>
      <Navbar />

      {success && (
        <div className="success-msg">
          {success}
        </div>
      )}

      <div className="create-container">

        <h2>Create a new repository</h2>

        <form
          className="create-form"
          onSubmit={handleSubmit}
        >

          {/* Repository Name */}

          <label>Repository name *</label>

          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            required
          />

          {/* Description */}

          <label>Description</label>

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Visibility */}

          <label>Visibility</label>

          <div className="radio-group">

            <label>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              Public
            </label>

            <label>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
              />
              Private
            </label>

          </div>

          {/* Initialize Repository */}

          <label>Initialize Repository</label>

          <div className="checkbox-group">

            <label>

              <input
                type="checkbox"
                checked={addReadme}
                onChange={(e) =>
                  setAddReadme(e.target.checked)
                }
              />

              Initialize this repository with a README.md

            </label>

          </div>

          {/* Create Button */}

          <button
            type="submit"
            className="create-btn"
          >
            Create Repository
          </button>

        </form>

      </div>
    </>
  );
};

export default Create;
