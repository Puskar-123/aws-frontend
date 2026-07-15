import React from "react";

const DashboardStats = ({ statistics, loading = false, error = false, onRetry }) => {
  const stats = [
    { label: "Repositories", value: statistics?.repositories },
    { label: "Public", value: statistics?.publicRepositories },
    { label: "Private", value: statistics?.privateRepositories },
    { label: "Commits", value: statistics?.commits },
  ];

  if (error) return <section className="dashboard-stats-error" role="alert"><span>Unable to load repository statistics.</span><button type="button" onClick={onRetry}>Retry</button></section>;

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
