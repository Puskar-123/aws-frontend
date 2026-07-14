import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiBookOpen, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import DashboardHeader from "./DashboardHeader";
import DashboardStats from "./DashboardStats";
import GettingStarted from "./GettingStarted";
import RepositoryGrid from "./RepositoryGrid";
import "./dashboard.css";

const API_BASE = "https://api.codehub.sbs";

const readRepositories = (data) => {
  const repositories = data?.repositories || data;
  return Array.isArray(repositories) ? repositories : [];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [repositories, setRepositories] = useState([]);
  const [suggestedRepositories, setSuggestedRepositories] = useState([]);
  const [username, setUsername] = useState("Developer");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [status, setStatus] = useState("loading");

  const fetchRepositories = useCallback(async () => {
    if (!userId) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(`${API_BASE}/repo/user/${userId}`);
      if (response.status === 404) {
        setRepositories([]);
        setStatus("ready");
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch repositories");
      setRepositories(readRepositories(await response.json()));
      setStatus("ready");
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setRepositories([]);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    const repositoryRequest = window.setTimeout(fetchRepositories, 0);

    if (!userId) return () => window.clearTimeout(repositoryRequest);
    const loadSupportingData = async () => {
      const [profileResult, suggestionsResult] = await Promise.allSettled([
        fetch(`${API_BASE}/user/profile/${userId}`),
        fetch(`${API_BASE}/repo/all`),
      ]);

      if (profileResult.status === "fulfilled" && profileResult.value.ok) {
        const profile = await profileResult.value.json();
        if (profile?.username) setUsername(profile.username);
      }

      if (suggestionsResult.status === "fulfilled" && suggestionsResult.value.ok) {
        setSuggestedRepositories(readRepositories(await suggestionsResult.value.json()));
      }
    };

    loadSupportingData().catch((error) => {
      console.error("Error loading dashboard supporting data:", error);
    });

    return () => window.clearTimeout(repositoryRequest);
  }, [fetchRepositories, userId]);

  const filteredRepositories = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return repositories.filter((repository) => {
      const matchesQuery = !normalizedQuery
        || repository.name?.toLowerCase().includes(normalizedQuery)
        || repository.description?.toLowerCase().includes(normalizedQuery);
      const matchesVisibility = visibility === "all"
        || (repository.visibility || "public").toLowerCase() === visibility;
      return matchesQuery && matchesVisibility;
    });
  }, [repositories, searchQuery, visibility]);

  const repositoryIds = useMemo(
    () => new Set(repositories.map((repository) => repository._id || repository.id).filter(Boolean)),
    [repositories],
  );
  const publicSuggestions = useMemo(
    () => suggestedRepositories.filter((repository) => {
      const repositoryId = repository._id || repository.id;
      return repositoryId && !repositoryIds.has(repositoryId) && repository.visibility !== "private";
    }).slice(0, 4),
    [repositoryIds, suggestedRepositories],
  );

  const openRepository = useCallback((repository) => {
    const repoId = repository?._id || repository?.id;
    if (!repoId) {
      console.error("Repository ID missing", repository);
      return;
    }
    navigate(`/repo/${repoId}`);
  }, [navigate]);

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-shell">
        <DashboardHeader username={username} />
        <DashboardStats repositories={repositories} loading={status === "loading"} />

        <div className="dashboard-layout">
          <main className="dashboard-repositories" aria-labelledby="repositories-heading">
            <div className="dashboard-section-header">
              <div>
                <h2 id="repositories-heading">Your repositories</h2>
                <p>Browse and manage your CodeHub projects.</p>
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
              onRetry={fetchRepositories}
            />
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
                    const repoId = repository._id || repository.id;
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
                  Discover public projects from the CodeHub community as they become available.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
