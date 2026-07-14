import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRepositoryId } from "../../utils/repository";
import { useAuth } from "../../authContext";
import Navbar from "../Navbar";
import EditProfileModal from "./EditProfileModal";
import HeatMapProfile from "./HeatMap";
import PopularRepositories, { ProfileRepositoryCard } from "./PopularRepositories";
import ProfileHeader from "./ProfileHeader";
import ProfileRepositories from "./ProfileRepositories";
import ProfileTabs from "./ProfileTabs";
import RecentActivity from "./RecentActivity";
import "./profile.css";

const API_BASE = "https://api.codehub.sbs";

const readResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: text }; }
};

const Profile = () => {
  const navigate = useNavigate();
  const { id: routeProfileId } = useParams();
  const { currentUser, setCurrentUser } = useAuth();
  const authenticatedUserId = currentUser || localStorage.getItem("userId");
  const profileUserId = routeProfileId || authenticatedUserId;
  const isOwner = Boolean(authenticatedUserId && String(authenticatedUserId) === String(profileUserId));
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!profileUserId) {
      navigate("/login");
      return undefined;
    }
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/user/profile/${profileUserId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        const data = await readResponse(response);
        if (!response.ok) throw new Error(data.error || data.message || "Unable to load profile");
        setProfile(data);
        setError("");
        setStatus("ready");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load profile");
          setStatus("error");
        }
      }
    };
    loadProfile();
    return () => controller.abort();
  }, [navigate, profileUserId, retryCount]);

  const openRepository = useCallback((repository) => {
    const repositoryId = repository?.repositoryId || getRepositoryId(repository);
    if (!repositoryId) {
      console.error("Repository ID missing", repository);
      return;
    }
    navigate(`/repo/${repositoryId}`);
  }, [navigate]);

  const saveProfile = async (values) => {
    setSaving(true);
    setSaveError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/user/profile/${profileUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || data.message || "Unable to update profile");
      setProfile((current) => ({ ...current, user: { ...current.user, ...data.user } }));
      setEditing(false);
    } catch (requestError) {
      setSaveError(requestError.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setCurrentUser(null);
    navigate("/login");
  };

  if (!profileUserId || !/^[a-f\d]{24}$/i.test(String(profileUserId))) {
    return <><Navbar /><main className="profile-state" role="alert"><h1>Profile unavailable</h1><p>The user ID is invalid.</p></main></>;
  }

  if (status === "loading") {
    return <><Navbar /><main className="profile-state" role="status"><div className="profile-loading-avatar" /><div className="profile-loading-line" /><p>Loading profile...</p></main></>;
  }

  if (status === "error" || !profile) {
    return <><Navbar /><main className="profile-state" role="alert"><h1>Unable to load profile</h1><p>{error}</p><button type="button" className="profile-primary-action" onClick={() => { setStatus("loading"); setRetryCount((count) => count + 1); }}>Retry</button></main></>;
  }

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-shell">
        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} repositoryCount={profile.stats.repositories} starCount={profile.starredRepositories?.length || 0} />
        <div className="profile-layout">
          <ProfileHeader user={profile.user} stats={profile.stats} isOwner={isOwner} onEdit={() => { setSaveError(""); setEditing(true); }} onLogout={logout} />
          <main className="profile-content">
            {activeTab === "overview" && <><HeatMapProfile contributions={profile.contributions} /><PopularRepositories repositories={profile.popularRepositories} onOpen={openRepository} /><RecentActivity activity={profile.recentActivity} username={profile.user.username} onOpenRepository={openRepository} /></>}
            {activeTab === "repositories" && <ProfileRepositories repositories={profile.repositories} showPrivateFilters={isOwner} onOpen={openRepository} />}
            {activeTab === "stars" && (
              <section className="profile-section" aria-labelledby="stars-heading">
                <div className="profile-section__header"><h2 id="stars-heading">Starred repositories</h2></div>
                {profile.starredRepositories?.length ? <div className="profile-repository-grid">{profile.starredRepositories.map((repository) => <ProfileRepositoryCard key={getRepositoryId(repository)} repository={repository} onOpen={openRepository} />)}</div> : <div className="profile-empty-state">No starred repositories yet.</div>}
              </section>
            )}
          </main>
        </div>
      </div>
      {editing && <EditProfileModal user={profile.user} saving={saving} serverError={saveError} onClose={() => !saving && setEditing(false)} onSave={saveProfile} />}
    </div>
  );
};

export default Profile;
