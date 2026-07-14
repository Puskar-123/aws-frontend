import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { authenticatedFetch, getAuthToken, getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import "./pulls.css";

const API_BASE = "https://api.codehub.sbs";
const headers = () => { const token = getAuthToken(); return token ? { Authorization: `Bearer ${token}` } : {}; };

const NewPullRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = useRef({ base: params.get("base") || "", compare: params.get("compare") || "" });
  const titlePrefilled = useRef(false);
  const [branches, setBranches] = useState([]);
  const [base, setBase] = useState("");
  const [compare, setCompare] = useState("");
  const [comparison, setComparison] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState({ loading: true, comparing: false, submitting: false, error: "" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/repo/${id}/branches`, { headers: headers(), signal: controller.signal }).then(async (response) => {
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to load branches"));
      const list = data.branches || [];
      const selectedBase = list.some((branch) => branch.name === initial.current.base) ? initial.current.base : (data.defaultBranch || "main");
      const selectedCompare = list.some((branch) => branch.name === initial.current.compare && branch.name !== selectedBase)
        ? initial.current.compare : (list.find((branch) => branch.name !== selectedBase)?.name || "");
      setBranches(list); setBase(selectedBase); setCompare(selectedCompare); setState((current) => ({ ...current, loading: false }));
    }).catch((error) => { if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!base || !compare || base === compare) return undefined;
    const controller = new AbortController();
    setParams({ base, compare }, { replace: true });
    setState((current) => ({ ...current, comparing: true, error: "" }));
    fetch(`${API_BASE}/repo/${id}/compare?base=${encodeURIComponent(base)}&compare=${encodeURIComponent(compare)}`, { headers: headers(), signal: controller.signal }).then(async (response) => {
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to compare branches"));
      setComparison(data);
      if (!titlePrefilled.current && data.commits?.[0]?.message) { setTitle(data.commits[0].message); titlePrefilled.current = true; }
      setState((current) => ({ ...current, comparing: false }));
    }).catch((error) => { if (error.name !== "AbortError") setState((current) => ({ ...current, comparing: false, error: error.message })); });
    return () => controller.abort();
  }, [base, compare, id, setParams]);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim()) { setState((current) => ({ ...current, error: "Title is required" })); return; }
    if (!getAuthToken()) { setState((current) => ({ ...current, error: "Your session has expired. Please sign in again." })); return; }
    setState((current) => ({ ...current, submitting: true, error: "" }));
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${id}/pulls`, { method: "POST", body: JSON.stringify({ title: title.trim(), description: description.trim(), baseBranch: base, compareBranch: compare }) });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, "Unable to create pull request"));
      navigate(`/repo/${id}/pulls/${data.pullRequest.number}`);
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
    finally { setState((current) => ({ ...current, submitting: false })); }
  };

  const canCreate = comparison?.summary?.filesChanged > 0 && base !== compare && !state.comparing;
  return <div className="pull-page"><Navbar /><main className="pull-container pull-container--form">
    <p><Link to={`/repo/${id}/pulls`}>← Pull requests</Link></p><h1>Open a pull request</h1>
    {state.loading && <div className="pull-state" role="status">Loading branches...</div>}
    {!state.loading && <form className="pull-form" onSubmit={submit}>
      <div className="pull-branches"><label>Base branch<span className="pull-branch-help">Target branch receiving changes</span><select aria-label="Base branch" value={base} onChange={(event) => setBase(event.target.value)}>{branches.filter((branch) => branch.name !== compare).map((branch) => <option key={branch.name}>{branch.name}</option>)}</select></label><span aria-hidden="true">←</span><label>Compare branch<span className="pull-branch-help">Source branch providing changes</span><select aria-label="Compare branch" value={compare} onChange={(event) => setCompare(event.target.value)}>{branches.filter((branch) => branch.name !== base).map((branch) => <option key={branch.name}>{branch.name}</option>)}</select></label></div>
      {state.comparing && <div className="pull-summary" role="status">Comparing branches...</div>}
      {comparison && <div className={`pull-summary ${comparison.summary.hasConflicts ? "has-conflicts" : "is-ready"}`}><strong>{comparison.summary.hasConflicts ? "Conflicts detected" : "Able to merge"}</strong><span>{comparison.commits.length} commits · {comparison.summary.filesChanged} files changed · +{comparison.summary.additions} −{comparison.summary.deletions}</span></div>}
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="200" /></label>
      <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain your changes..." rows="7" maxLength="10000" /></label>
      {state.error && <div className="pull-error" role="alert">{state.error}</div>}
      <button className="pull-primary" type="submit" disabled={!canCreate || state.submitting}>{state.submitting ? "Creating pull request..." : "Create pull request"}</button>
    </form>}
  </main></div>;
};

export default NewPullRequest;
