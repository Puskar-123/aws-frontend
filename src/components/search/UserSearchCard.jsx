import React from "react";
import { Link } from "react-router-dom";

const UserSearchCard = ({ user }) => <article className="search-user-card">
  <div className="search-user-card__avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span aria-hidden="true">{(user.displayName || user.username || "?").slice(0, 2).toUpperCase()}</span>}</div>
  <div><h2><Link to={`/users/${encodeURIComponent(user.username)}`}>{user.displayName || user.username}</Link></h2><p className="search-user-card__username">@{user.username}</p>{user.bio && <p>{user.bio}</p>}<small>{user.publicRepositoryCount || 0} public repositories</small></div>
</article>;
export default UserSearchCard;
