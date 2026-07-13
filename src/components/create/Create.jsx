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

  // NEW
  const [addReadme, setAddReadme] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User not logged in");
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
            name: repoName,
            description,
            visibility,
            owner: userId,
            content: [],
            issues: [],
            addReadme, // NEW
          }),
        }
      );

      const data = await res.json();

      console.log("API RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Failed to create repo");
        return;
      }

      setSuccess("Repository created successfully!");

      setTimeout(() => {
        navigate(`/repo/${data.repositoryID}`);
      }, 1000);

      setRepoName("");
      setDescription("");
      setVisibility("public");
      setAddReadme(false);

    } catch (err) {
      console.error(err);
      alert("Server error");
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

          <label>Repository name *</label>

          <input
            type="text"
            value={repoName}
            onChange={(e) =>
              setRepoName(e.target.value)
            }
            required
          />

          <label>Description</label>

          <input
            type="text"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <label>Visibility</label>

          <div className="radio-group">

            <label>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() =>
                  setVisibility("public")
                }
              />

              Public
            </label>

            <label>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() =>
                  setVisibility("private")
                }
              />

              Private
            </label>

          </div>

          {/* NEW README OPTION */}

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