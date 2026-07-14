import React from "react";

const tabs = ["overview", "repositories", "stars"];

const ProfileTabs = ({ activeTab, onChange, repositoryCount = 0, starCount = 0 }) => (
  <nav className="profile-tabs" aria-label="Profile sections">
    {tabs.map((tab) => (
      <button
        key={tab}
        type="button"
        className={activeTab === tab ? "is-active" : ""}
        aria-current={activeTab === tab ? "page" : undefined}
        onClick={() => onChange(tab)}
      >
        {tab[0].toUpperCase() + tab.slice(1)}
        {tab === "repositories" && <span>{repositoryCount}</span>}
        {tab === "stars" && <span>{starCount}</span>}
      </button>
    ))}
  </nav>
);

export default ProfileTabs;
