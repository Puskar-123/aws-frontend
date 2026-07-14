import React, { useState } from "react";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

const API_BASE = "https://api.codehub.sbs";

const PullRequestReviewForm = ({ repositoryId, number, canDecide, isAuthor, currentHead, onCreated }) => {
  const [decision, setDecision] = useState("commented");
  const [body, setBody] = useState("");
  const [state, setState] = useState({ submitting: false, error: "" });
  const submit = async (event) => {
    event.preventDefault();
    if (decision !== "approved" && !body.trim()) { setState({ submitting: false, error: "Review text is required for this decision." }); return; }
    setState({ submitting: true, error: "" });
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${repositoryId}/pulls/${number}/reviews`, { method: "POST", body: JSON.stringify({ state: decision, body: body.trim(), reviewedCommit: currentHead }) });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to submit review"));
      setBody("");
      await onCreated();
      setState({ submitting: false, error: "" });
    } catch (error) { setState({ submitting: false, error: error.message }); }
  };
  return <form className="pull-review-form" onSubmit={submit}>
    <h2>Submit a review</h2>
    <label htmlFor="pull-review-body">Review summary</label>
    <textarea id="pull-review-body" rows="4" maxLength="5000" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Leave review feedback" />
    <fieldset><legend>Decision</legend>
      <label><input type="radio" name="review-decision" value="commented" checked={decision === "commented"} onChange={(event) => setDecision(event.target.value)} /> Comment</label>
      <label title={!canDecide ? "Only the repository owner can approve" : isAuthor ? "You cannot approve your own pull request" : ""}><input type="radio" name="review-decision" value="approved" checked={decision === "approved"} disabled={!canDecide || isAuthor} onChange={(event) => setDecision(event.target.value)} /> Approve</label>
      <label title={!canDecide ? "You do not have review permission" : isAuthor ? "You cannot request changes on your own pull request" : ""}><input type="radio" name="review-decision" value="changes_requested" checked={decision === "changes_requested"} disabled={!canDecide || isAuthor} onChange={(event) => setDecision(event.target.value)} /> Request changes</label>
    </fieldset>
    {state.error && <div className="pull-error" role="alert">{state.error}</div>}
    <button className="pull-primary" disabled={state.submitting}>{state.submitting ? "Submitting..." : "Submit review"}</button>
  </form>;
};

export default PullRequestReviewForm;
