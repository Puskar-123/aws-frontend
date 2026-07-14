import React, { useMemo } from "react";

const DashboardStats = ({ repositories = [], loading = false }) => {
  const stats = useMemo(() => {
    const publicCount = repositories.filter((repository) => repository.visibility !== "private").length;
    return [
      { label: "Repositories", value: repositories.length },
      { label: "Public", value: publicCount },
      { label: "Private", value: repositories.length - publicCount },
      {
        label: "Commits",
        value: repositories.reduce(
          (total, repository) => total + (Array.isArray(repository.commits) ? repository.commits.length : 0),
          0,
        ),
      },
    ];
  }, [repositories]);

  return (
    <section className="dashboard-stats" aria-label="Repository statistics" aria-busy={loading}>
      {stats.map((stat) => (
        <div className="dashboard-stat" key={stat.label}>
          {loading ? <span className="dashboard-skeleton dashboard-skeleton--stat" /> : <strong>{stat.value}</strong>}
          <span>{stat.label}</span>
        </div>
      ))}
    </section>
  );
};

export default DashboardStats;
