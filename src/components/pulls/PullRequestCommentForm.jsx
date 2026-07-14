import React, { useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

const API_BASE = "https://api.codehub.sbs";

const PullRequestCommentForm = ({ repositoryId, number, onCreated }) => {
  const [body, setBody] = useState("");
  const [state, setState] = useState({ submitting: false, error: "" });
  const submit = async (event) => {
    event.preventDefault();
    if (!body.trim()) { setState({ submitting: false, error: "Comment is required" }); return; }
    setState({ submitting: true, error: "" });
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}/comments`, { method: "POST", body: JSON.stringify({ body: body.trim() }) });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to add comment"));
      setBody(""); onCreated(data.comment);
    } catch (error) { setState({ submitting: false, error: error.message }); return; }
    setState({ submitting: false, error: "" });
  };
  return <form className="pull-comment-form" onSubmit={submit}><label htmlFor="pull-comment">Add a comment</label><textarea id="pull-comment" rows="5" maxLength="5000" value={body} onChange={(event) => setBody(event.target.value)} />{state.error && <div className="pull-error" role="alert">{state.error}</div>}<button className="pull-primary" disabled={state.submitting}>{state.submitting ? "Commenting..." : "Comment"}</button></form>;
};

export default PullRequestCommentForm;
