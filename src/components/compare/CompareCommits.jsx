import React from "react";

const initials = (name) => String(name || "Unknown").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

const CompareCommits = ({ commits }) => {
  if (!commits.length) return <div className="compare-empty">No commits are unique to the compare branch.</div>;
  return (
    <section className="compare-commits" aria-label="Commits in compare branch">
      {commits.map((commit) => {
        const id = String(commit.hash || commit.id);
        const date = commit.createdAt && !Number.isNaN(Date.parse(commit.createdAt))
          ? new Date(commit.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
          : "date unavailable";
        return (
          <article key={commit.id || id} className="compare-commit">
            <span className="compare-commit__avatar" aria-hidden="true">{initials(commit.author?.name)}</span>
            <div><h2>{commit.message || "No commit message"}</h2><p>{commit.author?.name || "Unknown"} committed on {date}</p></div>
            <code title={id}>{id.slice(0, 7)}</code>
          </article>
        );
      })}
    </section>
  );
};

export default CompareCommits;
