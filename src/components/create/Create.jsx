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

  const handleSubmit = async (e) => {
  e.preventDefault();

  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("User not logged in");
    return;
  }

  try {
    const res = await fetch("http://13.51.176.106/repo/create", {
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
      }),
    });

    const data = await res.json();  

      console.log("API RESPONSE:", data);

      // ❌ handle error
      if (!res.ok) {
        alert(data.error || "Failed to create repo");
        return;
      }

      // ✅ success
      setSuccess("Repository created successfully!");

      // 🚀 USE ID INSTEAD OF NAME
      setTimeout(() => {
        navigate(`/repo/${data.repositoryID}`);
      }, 1000);

    setRepoName("");
    setDescription("");
    setVisibility("public");

  } catch (err) {
    console.error("ERROR:", err);
    alert("Server error");
  }
};

  return (
    <>
      <Navbar />

      {success && <div className="success-msg">{success}</div>}

      <div className="create-container">
        <h2>Create a new repository</h2>

        <form className="create-form" onSubmit={handleSubmit}>
          
          <label>Repository name *</label>
          <input
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            required
          />

          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label>Visibility</label>

          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}  // ✅ FIX HERE
              />
              Public
            </label>

            <label>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")} // ✅ FIX HERE
              />
              Private
            </label>
          </div>

          <button type="submit" className="create-btn">
            Create repository
          </button>
        </form>
      </div>
    </>
  );
};

export default Create;