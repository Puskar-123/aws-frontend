import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import RecommendationCard, { RecommendationSkeleton } from "./RecommendationCard";
import { contributionRequest } from "../../services/contributionApi";
import "./contributions.css";

const activeFor = (sessions, item) => sessions.find(session => String(session.issue?._id || session.issue) === String(item.issueId) && !["completed", "abandoned"].includes(session.status));
const RepositoryContribute = () => {
  const { id } = useParams(), navigate = useNavigate();
  const [state, setState] = useState({ loading: true, recommendations: [], sessions: [], profile: null, error: "", busy: "", message: "", showAll: false });
  const load = useCallback(async () => {
    setState(current => ({ ...current, loading: true, error: "" }));
    try {
      const [matches, sessions] = await Promise.all([contributionRequest(`/repo/${id}/contribution-recommendations`), contributionRequest(`/repo/${id}/contribution-sessions`)]);
      setState(current => ({ ...current, loading: false, recommendations: matches.recommendations || [], profile: matches.profile, sessions: sessions.sessions || [], error: "" }));
    } catch (error) { setState(current => ({ ...current, loading: false, error: error.message })); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const start = async (item, existing) => {
    if (existing) { navigate(`/repo/${id}/contribute/session/${existing._id}`); return; }
    if (state.busy) return;
    setState(current => ({ ...current, busy: item.issueId, error: "", message: "" }));
    try {
      const data = await contributionRequest(`/repo/${id}/contribution-sessions`, { method: "POST", body: { issueId: item.issueId } });
      navigate(`/repo/${id}/contribute/session/${data.session._id}`);
    } catch (error) { setState(current => ({ ...current, busy: "", error: error.message })); }
  };
  const strong = useMemo(() => state.recommendations.filter(item => item.suitabilityScore >= 60), [state.recommendations]);
  const shown = state.showAll ? state.recommendations : strong;
  const repositoryName = state.recommendations[0]?.repository?.name;
  return <div className="contribution-page"><Navbar /><main className="contribution-container"><header className="contribution-heading"><div><p><Link to={`/repo/${id}`}>← Repository</Link></p><h1>Contribute</h1><p>Recommendations use your saved profile and maintainer-authored issue guidance.</p></div><Link className="contribution-secondary" to="/profile/contributions">Profile and history</Link></header>
    {state.error && <div className="contribution-alert" role="alert"><p>{state.error}</p>{state.error.toLowerCase().includes("profile") && <p><Link to="/contribute">Create profile</Link></p>}<button className="contribution-secondary" onClick={load}>Retry</button></div>}{state.message && <div className="contribution-success" role="status">{state.message}</div>}
    {!!state.sessions.length && <section className="contribution-panel"><h2>Your active sessions</h2><div className="contribution-list">{state.sessions.filter(session => !["completed", "abandoned"].includes(session.status)).map(session => <article key={session._id}><div><strong>{session.issue?.title}</strong><p>{session.status.replaceAll("_", " ")} · {session.latestProgressPercent}%</p></div><Link to={`/repo/${id}/contribute/session/${session._id}`}>Continue session</Link></article>)}</div></section>}
    <section aria-label="Recommended contributions"><div className="contribution-section-title"><div><h2>Recommended for you</h2>{state.profile?.skills?.length > 0 && <p>You know {state.profile.skills.slice(0, 4).join(", ")}.</p>}</div>{!state.loading && <span>{state.recommendations.length} guided issue{state.recommendations.length === 1 ? "" : "s"}</span>}</div>
      {state.loading && <div className="recommendation-grid" role="status" aria-label="Loading recommendations"><RecommendationSkeleton /><RecommendationSkeleton /></div>}
      {!state.loading && !state.error && !state.recommendations.length && <div className="contribution-empty"><h3>No guided issues are configured in this repository yet.</h3><p>Choose another repository or ask a maintainer to add issue guidance.</p><Link className="contribution-secondary" to="/contribute">Choose another repository</Link></div>}
      {!state.loading && !state.error && state.recommendations.length > 0 && !strong.length && !state.showAll && <div className="contribution-empty"><h3>No strong matches were found for your current profile.</h3><div className="empty-actions"><Link className="contribution-secondary" to="/contribute">Edit skills</Link><button className="contribution-secondary" onClick={() => setState(current => ({ ...current, showAll: true }))}>Show all guided issues</button><Link className="contribution-secondary" to="/contribute">Choose another repository</Link></div></div>}
      {!state.loading && !state.error && shown.length > 0 && <div className="recommendation-grid">{shown.map(item => <RecommendationCard key={item.issueId} item={item} repositoryId={id} repositoryName={repositoryName} activeSession={activeFor(state.sessions, item)} onStart={start} busy={state.busy === item.issueId} />)}</div>}
    </section>
  </main></div>;
};
export default RepositoryContribute;
