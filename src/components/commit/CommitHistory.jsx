import React, { useCallback, useRef, useState } from "react";
import CommitCard from "./CommitCard";
import CommitDiffViewer from "./CommitDiffViewer";
import "./commitDiff.css";

const API_BASE = "https://api.codehub.sbs";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const responseError = async (response) => {
  try {
    const data = await response.json();
    return data.error || data.message || `Unable to load changes (${response.status})`;
  } catch {
    return `Unable to load changes (${response.status})`;
  }
};

const commitIdentifier = (commit, index) =>
  String(commit.hash || commit._id || `legacy-${index + 1}`);

const CommitHistory = ({ repositoryId, commits = [], apiBase = API_BASE }) => {
  const [expandedCommit, setExpandedCommit] = useState("");
  const [diffCache, setDiffCache] = useState({});
  const inFlight = useRef(new Map());

  const loadDiff = useCallback(async (commitId, force = false) => {
    if (!force && (diffCache[commitId]?.status === "ready" || inFlight.current.has(commitId))) return;
    setDiffCache((current) => ({
      ...current,
      [commitId]: { status: "loading", data: current[commitId]?.data || null, error: "" },
    }));

    const request = (async () => {
      try {
        const response = await fetch(
          `${apiBase}/repo/${repositoryId}/commit/${encodeURIComponent(commitId)}/diff`,
          { headers: authHeaders() },
        );
        if (!response.ok) throw new Error(await responseError(response));
        const data = await response.json();
        setDiffCache((current) => ({
          ...current,
          [commitId]: { status: "ready", data, error: "" },
        }));
      } catch (error) {
        setDiffCache((current) => ({
          ...current,
          [commitId]: { status: "error", data: null, error: error.message },
        }));
      } finally {
        inFlight.current.delete(commitId);
      }
    })();
    inFlight.current.set(commitId, request);
    await request;
  }, [apiBase, diffCache, repositoryId]);

  const toggleCommit = (commitId) => {
    if (expandedCommit === commitId) {
      setExpandedCommit("");
      return;
    }
    setExpandedCommit(commitId);
    loadDiff(commitId);
  };

  return (
    <section className="commit-history" aria-labelledby="commit-history-title">
      <div className="commit-history__header">
        <h2 id="commit-history-title">Commit history</h2>
        <span>{commits.length}</span>
      </div>
      {!commits.length ? (
        <div className="commit-history__empty">No commits yet.</div>
      ) : commits.map((commit, index) => {
        const commitId = commitIdentifier(commit, index);
        const expanded = expandedCommit === commitId;
        const cachedSummary = diffCache[commitId]?.data?.summary;
        return (
          <React.Fragment key={commitId}>
            <CommitCard
              commit={cachedSummary ? { ...commit, summary: cachedSummary } : commit}
              commitId={commitId}
              expanded={expanded}
              onToggle={() => toggleCommit(commitId)}
            />
            {expanded && (
              <CommitDiffViewer
                commitId={commitId}
                entry={diffCache[commitId] || { status: "loading" }}
                onClose={() => setExpandedCommit("")}
                onRetry={() => loadDiff(commitId, true)}
              />
            )}
          </React.Fragment>
        );
      })}
    </section>
  );
};

export default CommitHistory;
