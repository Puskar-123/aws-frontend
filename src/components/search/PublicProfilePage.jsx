import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../authContext";
import Navbar from "../Navbar";
import RepositorySearchCard from "../explore/RepositorySearchCard";
import { discoveryRequest } from "../explore/exploreApi";
import "./search.css";

const PublicProfilePage = () => {
  const { username } = useParams(); const navigate = useNavigate(); const auth = useAuth();
  const [profile, setProfile] = useState(null); const [repositories, setRepositories] = useState([]); const [pagination, setPagination] = useState(null); const [page, setPage] = useState(1); const [state, setState] = useState({ loading: true, error: "" });
  useEffect(() => {
    if (auth?.user?.username?.toLowerCase() === username?.toLowerCase()) { navigate("/profile", { replace: true }); return undefined; }
    const controller = new AbortController(); setState({ loading: true, error: "" });
    Promise.all([
      discoveryRequest(`/users/${encodeURIComponent(username)}`, { signal: controller.signal }),
      discoveryRequest(`/users/${encodeURIComponent(username)}/repositories?page=${page}&limit=20&sort=recent`, { signal: controller.signal }),
    ]).then(([userData, repositoryData]) => { setProfile(userData); setRepositories(repositoryData.repositories || []); setPagination(repositoryData.pagination); setState({ loading: false, error: "" }); })
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, error: error.message }); });
    return () => controller.abort();
  }, [auth?.user?.username, navigate, page, username]);
  if (state.loading) return <><Navbar /><main className="public-profile-state" role="status">Loading public profile...</main></>;
  if (state.error || !profile) return <><Navbar /><main className="public-profile-state public-profile-state--error" role="alert">{state.error || "User not found"}</main></>;
  const user = profile.user;
  return <div className="public-profile-page"><Navbar /><main className="public-profile-container">
    <aside className="public-profile-sidebar"><div className="public-profile-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.username}'s avatar`} /> : <span aria-hidden="true">{(user.name || user.username).slice(0, 2).toUpperCase()}</span>}</div><h1>{user.name || user.username}</h1><p className="public-profile-username">@{user.username}</p>{user.bio && <p>{user.bio}</p>}<dl><div><dt>Public repositories</dt><dd>{profile.publicRepositoryCount || 0}</dd></div><div><dt>Stars received</dt><dd>{profile.totalStarsReceived || 0}</dd></div></dl></aside>
    <section className="public-profile-repositories"><h2>Public repositories</h2>{repositories.length ? <div className="explore-results">{repositories.map((item) => <RepositorySearchCard key={item._id} repository={item} />)}</div> : <p className="search-state">No public repositories.</p>}{pagination?.pages > 1 && <nav className="search-pagination" aria-label="Public repository pages"><button type="button" disabled={!pagination.hasPreviousPage} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button type="button" disabled={!pagination.hasNextPage} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}</section>
  </main></div>;
};
export default PublicProfilePage;
