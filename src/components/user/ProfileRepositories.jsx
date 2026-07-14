import React, { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { filterRepositories, getRepositoryId } from "../../utils/repository";
import { ProfileRepositoryCard } from "./PopularRepositories";

const ProfileRepositories = ({ repositories = [], showPrivateFilters = false, onOpen }) => {
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState("all");
  const filtered = useMemo(
    () => filterRepositories(repositories, query, showPrivateFilters ? visibility : "public"),
    [query, repositories, showPrivateFilters, visibility],
  );

  return (
    <section className="profile-section" aria-labelledby="profile-repositories-heading">
      <div className="profile-section__header"><h2 id="profile-repositories-heading">Repositories</h2></div>
      <div className="profile-repository-tools">
        <label><span className="profile-visually-hidden">Search repositories</span><FiSearch aria-hidden="true" /><input type="search" placeholder="Search repositories..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {showPrivateFilters && <div className="profile-filter-group" aria-label="Filter repositories by visibility">{["all", "public", "private"].map((filter) => <button key={filter} type="button" className={visibility === filter ? "is-active" : ""} aria-pressed={visibility === filter} onClick={() => setVisibility(filter)}>{filter[0].toUpperCase() + filter.slice(1)}</button>)}</div>}
      </div>
      {filtered.length ? <div className="profile-repository-grid">{filtered.map((repository) => <ProfileRepositoryCard key={getRepositoryId(repository)} repository={repository} onOpen={onOpen} />)}</div> : <div className="profile-empty-state">No repositories match this view.</div>}
    </section>
  );
};

export default ProfileRepositories;
