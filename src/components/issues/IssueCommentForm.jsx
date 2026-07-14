import React, { useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

const API_BASE = "https://api.codehub.sbs";

const IssueCommentForm = ({ repositoryId, number, onCreated }) => {
  const [body, setBody] = useState(""); const [state, setState] = useState({ submitting: false, error: "" });
  const submit = async (event) => { event.preventDefault(); if (!body.trim()) { setState({ submitting: false, error: "Comment is required" }); return; } setState({ submitting: true, error: "" });
    try { const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/issues/${number}/comments`, { method: "POST", body: JSON.stringify({ body }) }); const data = await parseResponse(response); if (!response.ok) throw new Error(getResponseError(data, "Unable to add comment")); setBody(""); onCreated(data.comment); setState({ submitting: false, error: "" }); }
    catch (error) { setState({ submitting: false, error: error.message }); }
  };
  return <form className="issue-comment-form" onSubmit={submit}><label htmlFor="issue-comment">Add a comment</label><textarea id="issue-comment" rows="6" maxLength="10000" value={body} onChange={(event) => setBody(event.target.value)} />{state.error && <div className="issue-error" role="alert">{state.error}</div>}<button className="issue-primary" disabled={state.submitting}>{state.submitting ? "Commenting..." : "Comment"}</button></form>;
};

export default IssueCommentForm;
