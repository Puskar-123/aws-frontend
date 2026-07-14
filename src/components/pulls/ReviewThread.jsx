import React, { useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import PullIdentity from "./PullIdentityView";

const API_BASE = "https://api.codehub.sbs";

const ReviewThread = ({ repositoryId, number, thread, headCommit, currentUserId, onChanged }) => {
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState("");
  const [editBody, setEditBody] = useState("");
  const [state, setState] = useState({ saving: false, error: "" });
  const request = async (path, options = {}) => {
    setState({ saving: true, error: "" });
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}${path}`, options);
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to update review conversation"));
      await onChanged();
      setState({ saving: false, error: "" });
      return true;
    } catch (error) { setState({ saving: false, error: error.message }); return false; }
  };
  const reply = async (event) => {
    event.preventDefault();
    if (!body.trim()) return setState({ saving: false, error: "Reply is required." });
    if (await request(`/threads/${thread._id}/comments`, { method: "POST", body: JSON.stringify({ body: body.trim(), commitHash: headCommit }) })) { setBody(""); setReplying(false); }
  };
  const saveEdit = async (comment) => {
    if (!editBody.trim()) return setState({ saving: false, error: "Comment is required." });
    if (await request(`/comments/${comment._id}`, { method: "PATCH", body: JSON.stringify({ body: editBody.trim() }) })) setEditing("");
  };
  return <article className={`review-thread${thread.resolved ? " is-resolved" : ""}${thread.outdated ? " is-outdated" : ""}`}>
    <header><strong>Review conversation</strong>{thread.resolved && <span>Resolved</span>}{thread.outdated && <span>Outdated</span>}</header>
    {thread.outdated && <p className="review-thread-note">This comment was made on an older version of the code.</p>}
    {(thread.comments || []).map((comment) => <div className="review-thread-comment" key={comment._id}>
      <div><PullIdentity identity={comment.author} />{comment.editedAt && !comment.deleted && <small>edited</small>}</div>
      {editing === comment._id ? <div className="review-inline-editor"><label htmlFor={`edit-${comment._id}`}>Edit comment</label><textarea id={`edit-${comment._id}`} value={editBody} onChange={(event) => setEditBody(event.target.value)} /><div><button type="button" onClick={() => setEditing("")}>Cancel</button><button type="button" disabled={state.saving} onClick={() => saveEdit(comment)}>Save</button></div></div> : <p>{comment.deleted ? "This comment was deleted." : comment.body}</p>}
      {!comment.deleted && String(comment.author?._id || "") === String(currentUserId || "") && editing !== comment._id && <div className="review-comment-actions"><button type="button" onClick={() => { setEditing(comment._id); setEditBody(comment.body); }}>Edit</button><button type="button" onClick={() => request(`/comments/${comment._id}`, { method: "DELETE" })}>Delete</button></div>}
    </div>)}
    {state.error && <p className="pull-error" role="alert">{state.error}</p>}
    {replying ? <form className="review-reply-form" onSubmit={reply}><label htmlFor={`reply-${thread._id}`}>Reply</label><textarea id={`reply-${thread._id}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength="5000" /><div><button type="button" onClick={() => setReplying(false)}>Cancel</button><button type="submit" disabled={state.saving}>{state.saving ? "Replying..." : "Reply"}</button></div></form> : <div className="review-thread-actions"><button type="button" onClick={() => setReplying(true)}>Reply</button><button type="button" disabled={state.saving} onClick={() => request(`/threads/${thread._id}/${thread.resolved ? "reopen" : "resolve"}`, { method: "PATCH" })}>{thread.resolved ? "Reopen" : "Resolve conversation"}</button></div>}
  </article>;
};

export default ReviewThread;
