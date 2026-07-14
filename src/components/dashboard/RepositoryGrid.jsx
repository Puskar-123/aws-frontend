import React from "react";
import { FiBook, FiPlus } from "react-icons/fi";
import { Link } from "react-router-dom";
import RepositoryCard from "./RepositoryCard";

const RepositoryGrid = ({ repositories, loading, error, hasFilters, onOpen, onRetry }) => {
  if (loading) {
    return (
      <div className="dashboard-repository-grid" role="status" aria-label="Loading repositories">
        {[1, 2, 3, 4].map((item) => <div className="dashboard-repository-skeleton" key={item} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-state" role="alert">
        <h3>Unable to load repositories.</h3>
        <p>Check your connection and try again.</p>
        <button type="button" className="dashboard-secondary-button" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  if (!repositories.length) {
    return (
      <div className="dashboard-state">
        <FiBook aria-hidden="true" />
        <h3>{hasFilters ? "No repositories match your filters" : "No repositories yet"}</h3>
        <p>{hasFilters
          ? "Try a different search term or visibility filter."
          : "Create your first repository or initialize one using CodeHub CLI."}</p>
        {!hasFilters && (
          <div className="dashboard-state__actions">
            <Link className="dashboard-primary-button" to="/create"><FiPlus aria-hidden="true" />Create repository</Link>
            <a className="dashboard-secondary-button" href="#getting-started">View CLI instructions</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-repository-grid">
      {repositories.map((repository) => {
        const repoId = repository._id || repository.id;
        return <RepositoryCard key={repoId || `missing-${repository.name}`} repository={repository} onOpen={onOpen} />;
      })}
    </div>
  );
};

export default RepositoryGrid;
