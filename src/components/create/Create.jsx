import React, { useEffect, useState } from "react";
import { FiBookOpen, FiGlobe, FiInfo, FiLock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import "./create.css";

const API_BASE = "https://api.codehub.sbs";

const Create = () => {
  const navigate = useNavigate();
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [addReadme, setAddReadme] = useState(false);
  const [ownerName, setOwnerName] = useState("Current user");
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return undefined;
    const controller = new AbortController();

    const loadOwner = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/user/profile/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        const data = await parseResponse(response);
        if (response.ok && data?.user?.username) setOwnerName(data.user.username);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setOwnerName("Current user");
      }
    };

    loadOwner();
    return () => controller.abort();
  }, []);

  const handleNameChange = (event) => {
    setRepoName(event.target.value);
    setNameError("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setNameError("");

    const userId = localStorage.getItem("userId");
    const trimmedName = repoName.trim();

    if (!userId) {
      setError("Your session could not be found. Please sign in again.");
      return;
    }
    if (!trimmedName) {
      setNameError("Repository name is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/repo/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: userId,
          name: trimmedName,
          description,
          visibility,
          addReadme: Boolean(addReadme),
        }),
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        setError(getResponseError(data, "Repository creation failed. Please try again."));
        return;
      }

      const repositoryId = data.repository?._id || data.repository?.id;
      if (!repositoryId) {
        console.error("Repository ID missing from create response", data);
        setError("Repository was created, but its ID was not returned.");
        return;
      }

      navigate(`/repo/${repositoryId}`);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <Navbar />
      <main className="create-container">
        <header className="create-header">
          <h1 className="create-heading">Create a new repository</h1>
          <p className="create-subtitle">A repository contains all project files and revision history.</p>
        </header>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
          {error && <div id="create-form-error" className="create-error create-error--form" role="alert">{error}</div>}

          <section className="create-section" aria-labelledby="repository-details-heading">
            <div className="create-section__heading">
              <h2 id="repository-details-heading">Repository details</h2>
              <p>Choose a clear name and add an optional description.</p>
            </div>

            <div className="create-field">
              <label className="create-label" htmlFor="repository-name">Owner / Repository name <span aria-hidden="true">*</span></label>
              <div className="create-owner-row">
                <div className="create-owner" title={ownerName}>{ownerName}</div>
                <span className="create-owner-divider" aria-hidden="true">/</span>
                <input
                  id="repository-name"
                  name="name"
                  className="create-input"
                  type="text"
                  value={repoName}
                  onChange={handleNameChange}
                  autoComplete="off"
                  required
                  aria-invalid={Boolean(nameError) || undefined}
                  aria-describedby={`repository-name-helper${nameError ? " repository-name-error" : ""}`}
                />
              </div>
              <p id="repository-name-helper" className="create-helper">Great repository names are short and memorable.</p>
              {nameError && <p id="repository-name-error" className="create-error">{nameError}</p>}
            </div>

            <div className="create-field">
              <label className="create-label" htmlFor="repository-description">Description <span className="create-optional">(optional)</span></label>
              <textarea id="repository-description" name="description" className="create-textarea" value={description} onChange={(event) => { setDescription(event.target.value); setError(""); }} rows="4" />
            </div>
          </section>

          <fieldset className="create-section create-fieldset">
            <legend>Visibility</legend>
            <div className="create-visibility-options">
              <label className={`create-visibility-card${visibility === "public" ? " is-selected" : ""}`}>
                <input type="radio" name="visibility" value="public" checked={visibility === "public"} onChange={() => { setVisibility("public"); setError(""); }} />
                <FiGlobe aria-hidden="true" />
                <span><strong>Public</strong><small>Anyone on the internet can see this repository.</small></span>
              </label>
              <label className={`create-visibility-card${visibility === "private" ? " is-selected" : ""}`}>
                <input type="radio" name="visibility" value="private" checked={visibility === "private"} onChange={() => { setVisibility("private"); setError(""); }} />
                <FiLock aria-hidden="true" />
                <span><strong>Private</strong><small>Only you and authorized users can access this repository.</small></span>
              </label>
            </div>
          </fieldset>

          <section className="create-section" aria-labelledby="initialize-heading">
            <div className="create-section__heading">
              <h2 id="initialize-heading">Initialize repository</h2>
              <p>Add starter content so the repository is ready to clone.</p>
            </div>
            <label className="create-readme-option">
              <input type="checkbox" checked={addReadme} onChange={(event) => { setAddReadme(event.target.checked); setError(""); }} />
              <FiBookOpen aria-hidden="true" />
              <span><strong>Add a README file</strong><small>Use it to describe your project and how to get started.</small></span>
            </label>
          </section>

          <section className="create-section create-cli" aria-labelledby="cli-heading">
            <FiInfo aria-hidden="true" />
            <div>
              <h2 id="cli-heading">Continue from the command line</h2>
              <p>After creating the repository, initialize your local project with:</p>
              <code>codehub init --repo &lt;repository-id&gt;</code>
            </div>
          </section>

          <div className="create-actions">
            <button type="button" className="create-cancel" onClick={() => navigate("/")} disabled={loading}>Cancel</button>
            <button type="submit" className="create-submit" disabled={loading} aria-busy={loading}>
              {loading ? "Creating repository..." : "Create repository"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Create;
