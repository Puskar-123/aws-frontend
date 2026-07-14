import React from "react";
import { FiEye, FiGitBranch, FiStar } from "react-icons/fi";
import { Link } from "react-router-dom";

export const formatDiscoveryDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const RepositorySearchCard = ({ repository }) => (
  <article className="explore-repository-card">
    <h2><Link to={`/repo/${repository._id}`}><span>{repository.owner?.username || "Unknown"}</span> / {repository.name}</Link></h2>
    <p>{repository.description || "No description provided."}</p>
    <div className="explore-repository-card__meta">
      {repository.language && <span className="explore-language"><i aria-hidden="true" />{repository.language}</span>}
      <span><FiStar aria-hidden="true" />{repository.starCount || 0} stars</span>
      <span><FiGitBranch aria-hidden="true" />{repository.forkCount || 0} forks</span>
      <span><FiEye aria-hidden="true" />{repository.watcherCount || 0} watching</span>
      {repository.updatedAt && <span>Updated {formatDiscoveryDate(repository.updatedAt)}</span>}
    </div>
  </article>
);

export default RepositorySearchCard;
