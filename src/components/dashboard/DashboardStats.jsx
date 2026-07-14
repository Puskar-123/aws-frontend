import React, { useMemo } from "react";
import { calculateRepositoryStats } from "../../utils/repository";

const DashboardStats = ({ repositories = [], loading = false }) => {
  const stats = useMemo(() => {
    const counts = calculateRepositoryStats(repositories);
    return [
      { label: "Repositories", value: counts.total },
      { label: "Public", value: counts.public },
      { label: "Private", value: counts.private },
      { label: "Commits", value: counts.commits },
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
