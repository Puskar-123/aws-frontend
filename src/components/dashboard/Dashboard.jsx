import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiBookOpen, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { authenticatedFetch, parseResponse } from "../../utils/api";
import {
  filterRepositories,
  getRepositoryId,
  normalizeVisibility,
  removeRepositoryById,
} from "../../utils/repository";
import Navbar from "../Navbar";
import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats";
import GettingStarted from "./GettingStarted";
import RepositoryGrid from "./RepositoryGrid";
import "./dashboard.css";

const API_BASE = "https://api.codehub.sbs";

const readRepositories = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.repositories) ? data.repositories : [];
};

const readStatistics = (data) => {
  const statistics = data?.statistics;
  const fields = ["repositories", "publicRepositories", "privateRepositories", "commits"];
  if (!statistics || fields.some((field) => !Number.isSafeInteger(statistics[field]) || statistics[field] < 0)) {
    throw new Error("Repository statistics are missing or invalid");
  }
  return statistics;
};

const deleteErrorMessage = (status, data) => {
  if (data?.error || data?.message) return data.error || data.message;
  const messages = {
    400: "The repository ID is invalid.",
    401: "Please sign in again before deleting this repository.",
    403: "You are not allowed to delete this repository.",
    404: "The repository could not be found.",
  };
  return messages[status] || "Unable to delete the repository. Please try again.";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [repositories, setRepositories] = useState([]);
  const [sharedRepositories, setSharedRepositories] = useState([]);
  const [exploreRepositories, setExploreRepositories] = useState([]);
  const [username, setUsername] = useState("Developer");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [status, setStatus] = useState("loading");
  const [statistics, setStatistics] = useState(null);
  const [deletingRepoId, setDeletingRepoId] = useState(null);
  const deleteInFlightRef = React.useRef(false);

  const fetchRepositories = useCallback(async () => {
    if (!userId) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/user/${userId}`);
      if (response.status === 404) {
        setRepositories([]);
        throw new Error("Repository statistics were not found");
      }
      if (!response.ok) throw new Error("Failed to fetch repositories");
      const data = await parseResponse(response);
      setRepositories(Array.isArray(data?.myRepositories) ? data.myRepositories : readRepositories(data));
      setSharedRepositories(Array.isArray(data?.sharedRepositories) ? data.sharedRepositories : []);
      setStatistics(readStatistics(data));
      setStatus("ready");
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setRepositories([]);
      setSharedRepositories([]);
      setStatistics(null);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    const repositoryRequest = window.setTimeout(fetchRepositories, 0);

    if (!userId) return () => window.clearTimeout(repositoryRequest);
    const loadSupportingData = async () => {
      const [profileResult, suggestionsResult] = await Promise.allSettled([
        authenticatedFetch(`${API_BASE}/user/profile/${userId}`),
        authenticatedFetch(`${API_BASE}/repo/explore?sort=recent&page=1&limit=10`),
      ]);

      if (profileResult.status === "fulfilled" && profileResult.value.ok) {
        const profile = await parseResponse(profileResult.value);
        const profileUsername = profile?.user?.username || profile?.username;
        if (profileUsername) setUsername(profileUsername);
      }

      if (suggestionsResult.status === "fulfilled" && suggestionsResult.value.ok) {
        setExploreRepositories(readRepositories(await parseResponse(suggestionsResult.value)));
      }
    };

    loadSupportingData().catch((error) => {
      console.error("Error loading dashboard supporting data:", error);
    });

    return () => window.clearTimeout(repositoryRequest);
  }, [fetchRepositories, userId]);

  const filteredRepositories = useMemo(
    () => filterRepositories(repositories, searchQuery, visibility),
    [repositories, searchQuery, visibility],
  );

  const repositoryIds = useMemo(
    () => new Set(repositories.map(getRepositoryId).filter(Boolean).map(String)),
    [repositories],
  );
  const publicSuggestions = useMemo(
    () => exploreRepositories.filter((repository) => {
      const repositoryId = getRepositoryId(repository);
      return repositoryId
        && !repositoryIds.has(String(repositoryId))
        && normalizeVisibility(repository.visibility) === "public";
    }).slice(0, 4),
    [exploreRepositories, repositoryIds],
  );

  const openRepository = useCallback((repository) => {
    const repoId = getRepositoryId(repository);
    if (!repoId) {
      console.error("Repository ID missing", repository);
      return;
    }
    navigate(`/repo/${repoId}`);
  }, [navigate]);

  const deleteRepository = useCallback(async (repository) => {
    const repositoryId = getRepositoryId(repository);
    if (!repositoryId) {
      console.error("Repository ID missing", repository);
      window.alert("This repository cannot be deleted because its ID is missing.");
      return;
    }
    if (deleteInFlightRef.current) return;

    const confirmed = window.confirm(
      `Delete "${repository.name || "Untitled repository"}"?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    deleteInFlightRef.current = true;
    setDeletingRepoId(repositoryId);
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/delete/${repositoryId}`, {
        method: "DELETE",
      });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(deleteErrorMessage(response.status, data));

      setRepositories((current) => removeRepositoryById(current, repositoryId));
      await fetchRepositories();
      window.alert(data.message || `Repository "${repository.name}" deleted.`);
    } catch (error) {
      console.error("Repository deletion failed:", error);
      window.alert(error.message || "Unable to delete the repository. Please try again.");
    } finally {
      deleteInFlightRef.current = false;
      setDeletingRepoId(null);
    }
  }, [fetchRepositories]);

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-shell">
        <DashboardHeader username={username} />
        <DashboardStats statistics={statistics} loading={status === "loading"} error={status === "error"} onRetry={fetchRepositories} />

        <div className="dashboard-layout">
          <main className="dashboard-repositories" aria-labelledby="repositories-heading">
            <div className="dashboard-section-header">
              <div>
                <h2 id="repositories-heading">Your repositories</h2>
                <p>Browse and manage your ContalSystem projects.</p>
              </div>
              <button className="dashboard-text-button" type="button" onClick={() => navigate("/create")}>
                New
              </button>
            </div>

            <div className="dashboard-repository-tools">
              <label className="dashboard-search">
                <span className="dashboard-visually-hidden">Search your repositories</span>
                <FiSearch aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search your repositories..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <div className="dashboard-filters" aria-label="Filter repositories by visibility">
                {["all", "public", "private"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={visibility === filter ? "is-active" : ""}
                    aria-pressed={visibility === filter}
                    onClick={() => setVisibility(filter)}
                  >
                    {filter[0].toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <RepositoryGrid
              repositories={filteredRepositories}
              loading={status === "loading"}
              error={status === "error"}
              hasFilters={Boolean(searchQuery.trim()) || visibility !== "all"}
              onOpen={openRepository}
              onDelete={deleteRepository}
              deletingRepoId={deletingRepoId}
              onRetry={fetchRepositories}
            />

            <section className="dashboard-shared" aria-labelledby="shared-repositories-heading">
              <div className="dashboard-section-header">
                <div><h2 id="shared-repositories-heading">Shared with me</h2><p>Repositories where you are an accepted collaborator.</p></div>
              </div>
              {status !== "loading" && sharedRepositories.length === 0 ? <p className="dashboard-shared-empty">No repositories have been shared with you.</p> : <RepositoryGrid repositories={sharedRepositories} loading={status === "loading"} error={false} hasFilters={false} onOpen={openRepository} onDelete={() => {}} deletingRepoId={null} onRetry={fetchRepositories} allowDelete={false} />}
            </section>
          </main>

          <aside className="dashboard-sidebar" aria-label="Dashboard resources">
            <GettingStarted />
            <section className="dashboard-panel dashboard-explore" aria-labelledby="explore-heading">
              <div className="dashboard-panel__heading">
                <FiBookOpen aria-hidden="true" />
                <h2 id="explore-heading">Explore repositories</h2>
              </div>
              {publicSuggestions.length > 0 ? (
                <ul className="dashboard-suggestion-list">
                  {publicSuggestions.map((repository) => {
                    const repoId = getRepositoryId(repository);
                    const owner = repository.owner?.username || repository.owner?.name;
                    return (
                      <li key={repoId}>
                        <button type="button" onClick={() => openRepository(repository)}>
                          <span>{owner ? `${owner} / ` : ""}<strong>{repository.name}</strong></span>
                          <small>{repository.description || "No description"}</small>
                          <em>Public</em>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="dashboard-panel__muted">
                  Discover public projects from the ContalSystem community as they become available.
                </p>
              )}
              <button type="button" className="dashboard-explore-all" onClick={() => navigate("/explore")}>View all repositories →</button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
