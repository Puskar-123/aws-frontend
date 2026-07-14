import React from "react";
import { FiFileText, FiGitBranch, FiGitCommit, FiLock, FiStar, FiUnlock } from "react-icons/fi";
import { getRepositoryId, normalizeVisibility } from "../../utils/repository";
import { formatProfileDate } from "./profileUtils";

export const ProfileRepositoryCard = ({ repository, onOpen }) => {
  const repositoryId = getRepositoryId(repository);
  const visibility = normalizeVisibility(repository.visibility);
  return (
    <article className="profile-repository-card">
      <div className="profile-repository-card__heading">
        <button type="button" onClick={() => onOpen(repository)} disabled={!repositoryId}>{repository.owner?.username ? `${repository.owner.username} / ` : ""}{repository.name || "Untitled repository"}</button>
        <span>{visibility === "private" ? <FiLock aria-hidden="true" /> : <FiUnlock aria-hidden="true" />}{visibility}</span>
      </div>
      <p>{repository.description || "No description"}</p>
      <div className="profile-repository-card__meta">
        <span><FiFileText aria-hidden="true" />{Number.isFinite(repository.fileCount) ? repository.fileCount : (Array.isArray(repository.content) ? repository.content.length : 0)} files</span>
        <span><FiGitCommit aria-hidden="true" />{Number.isFinite(repository.commitCount) ? repository.commitCount : (Array.isArray(repository.commits) ? repository.commits.length : 0)} commits</span>
        <span><FiStar aria-hidden="true" />{repository.starCount || 0} stars</span>
        <span><FiGitBranch aria-hidden="true" />{repository.forkCount || 0} forks</span>
        {repository.updatedAt && <span>Updated {formatProfileDate(repository.updatedAt, { dateStyle: "medium" })}</span>}
      </div>
    </article>
  );
};

const PopularRepositories = ({ repositories = [], onOpen }) => (
  <section className="profile-section" aria-labelledby="popular-repositories-heading">
    <div className="profile-section__header"><h2 id="popular-repositories-heading">Popular repositories</h2></div>
    {repositories.length ? (
      <div className="profile-repository-grid">
        {repositories.map((repository) => (
          <ProfileRepositoryCard key={getRepositoryId(repository)} repository={repository} onOpen={onOpen} />
        ))}
      </div>
    ) : <div className="profile-empty-state">No repositories to show yet.</div>}
  </section>
);

export default PopularRepositories;
