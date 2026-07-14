import React, { useCallback, useEffect, useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import PullRequestReviewForm from "./PullRequestReviewForm";
import ReviewThread from "./ReviewThread";

const API_BASE = "https://api.codehub.sbs";

const PullRequestFiles = ({ repositoryId, pullRequest, permissions, onReview, initialFiles = [], initialSummary = {} }) => {
  const [state, setState] = useState({ loading: initialFiles.length === 0, error: "", files: initialFiles, summary: initialSummary, headCommit: "", mergeStatus: null });
  const [collapsed, setCollapsed] = useState(new Set());
  const [composer, setComposer] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [filesResponse, statusResponse] = await Promise.all([
        authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${pullRequest.number}/files`),
        authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${pullRequest.number}/merge-status`),
      ]);
      const [filesData, statusData] = await Promise.all([parseResponse(filesResponse), parseResponse(statusResponse)]);
      if (!filesResponse.ok) throw new Error(getResponseError(filesData, "Unable to load changed files"));
      if (!statusResponse.ok) throw new Error(getResponseError(statusData, "Unable to load review status"));
      setState({ loading: false, error: "", files: filesData.files || [], summary: filesData.summary || {}, headCommit: filesData.headCommit || "", mergeStatus: statusData });
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [repositoryId, pullRequest.number]);
  useEffect(() => { load(); }, [load]);
  const addComment = async (event) => {
    event.preventDefault();
    if (!body.trim()) return setState((current) => ({ ...current, error: "Comment is required." }));
    setSaving(true);
    const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${pullRequest.number}/threads`, { method: "POST", body: JSON.stringify({ ...composer, commitHash: state.headCommit, body: body.trim() }) });
    const data = await parseResponse(response);
    if (!response.ok) { setSaving(false); return setState((current) => ({ ...current, error: getResponseError(data, "Unable to add review comment") })); }
    setComposer(null); setBody(""); setSaving(false); await load();
  };
  if (state.loading) return <div className="pull-state" role="status">Loading changed files...</div>;
  if (state.error && !state.files.length) return <div className="pull-state pull-state--error" role="alert">{state.error}<button type="button" onClick={load}>Retry</button></div>;
  return <div className="pull-files-layout"><main className="pull-files">
    <header className="pull-files-summary"><strong>{state.summary.filesChanged || 0} files changed</strong><span className="diff-additions">+{state.summary.additions || 0}</span><span className="diff-deletions">−{state.summary.deletions || 0}</span>{pullRequest.status === "open" && permissions.canComment && <button className="pull-primary" type="button" aria-expanded={showReview} onClick={() => setShowReview((value) => !value)}>Review changes</button>}</header>
    {state.error && <div className="pull-error" role="alert">{state.error}</div>}
    {state.files.length === 0 && <div className="pull-state">No displayable file changes.</div>}
    {state.files.map((file) => {
      const isCollapsed = collapsed.has(file.path);
      const outdated = (file.threads || []).filter((thread) => thread.outdated);
      return <section className="review-file" key={file.path}><header><button type="button" aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${file.path}`} onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(file.path)) next.delete(file.path); else next.add(file.path); return next; })}>{isCollapsed ? "▸" : "▾"}</button><code>{file.path}</code><span>{file.status}</span><span className="diff-additions">+{file.additions || 0}</span><span className="diff-deletions">−{file.deletions || 0}</span><button type="button" onClick={() => navigator.clipboard?.writeText(file.path)}>Copy path</button></header>{!isCollapsed && <div className="review-file-body">
        {(file.binary || file.isBinary) && <p className="review-file-message">Binary file changed. Line comments are unavailable.</p>}
        {file.tooLarge && <p className="review-file-message">Diff too large to display. Line comments are unavailable.</p>}
        {(file.hunks || []).map((hunk, hunkIndex) => <div className="review-hunk" key={`${file.path}-${hunkIndex}`}><div className="review-hunk-header">@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</div>{(hunk.lines || []).map((line, index) => {
          const side = line.type === "removed" ? "LEFT" : "RIGHT";
          const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;
          const currentThreads = (file.threads || []).filter((thread) => !thread.outdated && thread.side === side && Number(thread.line) === Number(lineNumber));
          return <React.Fragment key={`${side}-${lineNumber}-${index}`}><div className={`review-diff-line is-${line.type}`}><button type="button" className="review-add-comment" disabled={!permissions.canReviewDecision || !lineNumber} aria-label={`Add comment on ${file.path} line ${lineNumber || "unavailable"}`} onClick={() => setComposer({ filePath: file.path, side, line: lineNumber, startLine: lineNumber })}>+</button><span>{line.oldLineNumber || ""}</span><span>{line.newLineNumber || ""}</span><code>{line.content}</code></div>{composer?.filePath === file.path && composer.side === side && composer.line === lineNumber && <form className="review-line-composer" onSubmit={addComment}><label htmlFor={`line-comment-${hunkIndex}-${index}`}>Comment on line {lineNumber}</label><textarea id={`line-comment-${hunkIndex}-${index}`} value={body} maxLength="5000" onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setComposer(null); if ((event.ctrlKey || event.metaKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit(); }} /><div><button type="button" onClick={() => setComposer(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Adding..." : "Add comment"}</button></div></form>}{currentThreads.map((thread) => <ReviewThread key={thread._id} repositoryId={repositoryId} number={pullRequest.number} thread={thread} headCommit={state.headCommit} currentUserId={permissions.currentUserId} onChanged={load} />)}</React.Fragment>;
        })}</div>)}
        {outdated.length > 0 && <section className="outdated-threads"><h3>Outdated conversations</h3>{outdated.map((thread) => <ReviewThread key={thread._id} repositoryId={repositoryId} number={pullRequest.number} thread={thread} headCommit={state.headCommit} currentUserId={permissions.currentUserId} onChanged={load} />)}</section>}
      </div>}</section>;
    })}
  </main><aside><section className="review-merge-status" aria-live="polite"><h2>{state.mergeStatus?.mergeable ? "All review requirements passed" : state.mergeStatus?.staleApprovals > 0 ? "Re-review required after new commits" : state.mergeStatus?.changesRequested ? "Changes requested" : "Review required"}</h2>{(state.mergeStatus?.checks || []).map((check) => <p key={check.name}><span aria-hidden="true">{check.passed ? "✓" : "○"}</span> <strong>{check.name}</strong><small>{check.message}</small></p>)}</section>{showReview && pullRequest.status === "open" && permissions.canComment && <PullRequestReviewForm repositoryId={repositoryId} number={pullRequest.number} canDecide={permissions.canReviewDecision} isAuthor={permissions.isAuthor} currentHead={state.headCommit} onCreated={async () => { setShowReview(false); await onReview(); await load(); }} />}</aside></div>;
};

export default PullRequestFiles;
