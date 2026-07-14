import React, { useState } from "react";
import { FiBriefcase, FiCalendar, FiLink, FiMapPin } from "react-icons/fi";
import { formatJoinedDate } from "../../utils/date";
import { getProfileInitials } from "./profileUtils";

const ProfileHeader = ({ user, stats, isOwner, onEdit, onLogout }) => {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");
  const initials = getProfileInitials(user.name, user.username);
  const joined = formatJoinedDate(user.createdAt);

  return (
    <aside className="profile-sidebar" aria-labelledby="profile-name">
      <div className="profile-avatar" aria-label={`${user.username} avatar`}>
        {user.avatarUrl && failedAvatarUrl !== user.avatarUrl
          ? <img src={user.avatarUrl} alt={`${user.name || user.username}'s avatar`} onError={() => setFailedAvatarUrl(user.avatarUrl)} />
          : <span aria-hidden="true">{initials}</span>}
      </div>
      <h1 id="profile-name">{user.name || user.username}</h1>
      <p className="profile-username">@{user.username}</p>
      {user.bio && <p className="profile-bio">{user.bio}</p>}
      <ul className="profile-details">
        {user.company && <li><FiBriefcase aria-hidden="true" />{user.company}</li>}
        {user.location && <li><FiMapPin aria-hidden="true" />{user.location}</li>}
        {user.website && (
          <li><FiLink aria-hidden="true" /><a href={user.website} target="_blank" rel="noopener noreferrer">{user.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></li>
        )}
        <li><FiCalendar aria-hidden="true" /><span>{joined}</span></li>
      </ul>
      <div className="profile-follow-counts">
        <span><strong>{user.followersCount || 0}</strong> followers</span>
        <span><strong>{user.followingCount || 0}</strong> following</span>
      </div>
      <dl className="profile-summary-stats">
        <div><dt>Repositories</dt><dd>{stats.repositories || 0}</dd></div>
        <div><dt>Commits</dt><dd>{stats.commits || 0}</dd></div>
        <div><dt>Contributions</dt><dd>{stats.contributions || 0}</dd></div>
      </dl>
      {isOwner && (
        <div className="profile-sidebar-actions">
          <button type="button" className="profile-primary-action" onClick={onEdit}>Edit profile</button>
          <button type="button" className="profile-secondary-action" onClick={onLogout}>Logout</button>
        </div>
      )}
    </aside>
  );
};

export default ProfileHeader;
