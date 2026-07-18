import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import SkillProfileForm from "./SkillProfileForm";
import RecommendationCard, { RecommendationSkeleton } from "./RecommendationCard";
import { contributionRequest } from "../../services/contributionApi";
import "./contributions.css";

const repositoryList = data => (Array.isArray(data) ? data : data?.repositories || []).filter(repository => repository.accessible !== false);
const guidedCount = repository => (repository.issues || []).filter(issue => issue.status !== "closed" && issue.contributionGuide?.enabled).length;
const activeFor = (sessions, item) => sessions.find(session => String(session.issue?._id || session.issue) === String(item.issueId) && !["completed", "abandoned"].includes(session.status));
const ContributionHome = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, profile: null, repositories: [], selectedRepository: "", sessions: [], history: [], progress: [], recommendations: [], finding: false, error: "", recommendationError: "", message: "", lastAttempt: null, showAll: false, busy: "" });
  const load = useCallback(async () => {
    setState(current => ({ ...current, loading: true, error: "" }));
    try {
      const [profile, history, repositories] = await Promise.all([contributionRequest("/contributions/profile"), contributionRequest("/contributions/history"), contributionRequest("/repo/all")]);
      setState(current => ({ ...current, loading: false, profile: profile.profile, repositories: repositoryList(repositories), history: history.sessions || [], progress: history.skillProgress || [] }));
    } catch (error) { setState(current => ({ ...current, loading: false, error: error.message })); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const findRecommendations = async (profileInput, repositoryId = state.selectedRepository) => {
    if (!repositoryId) { setState(current => ({ ...current, message: "Select a repository to find guided issues.", recommendationError: "" })); return; }
    setState(current => ({ ...current, finding: true, error: "", recommendationError: "", message: "", lastAttempt: profileInput }));
    try {
      const saved = await contributionRequest("/contributions/profile", { method: "PUT", body: profileInput });
      const [matches, sessions] = await Promise.all([contributionRequest(`/repo/${repositoryId}/contribution-recommendations`), contributionRequest(`/repo/${repositoryId}/contribution-sessions`)]);
      setState(current => ({ ...current, finding: false, profile: saved.profile, recommendations: matches.recommendations || [], sessions: sessions.sessions || [], message: "Contribution profile saved. Recommendations are ready.", showAll: false }));
    } catch (error) { setState(current => ({ ...current, finding: false, recommendationError: error.message })); }
  };
  const start = async (item, existing) => {
    const repositoryId = state.selectedRepository;
    if (existing) { navigate(`/repo/${repositoryId}/contribute/session/${existing._id}`); return; }
    if (state.busy) return;
    setState(current => ({ ...current, busy: item.issueId, recommendationError: "" }));
    try { const data = await contributionRequest(`/repo/${repositoryId}/contribution-sessions`, { method: "POST", body: { issueId: item.issueId } }); navigate(`/repo/${repositoryId}/contribute/session/${data.session._id}`); }
    catch (error) { setState(current => ({ ...current, busy: "", recommendationError: error.message })); }
  };
  const selected = state.repositories.find(repository => String(repository._id) === state.selectedRepository);
  const strong = useMemo(() => state.recommendations.filter(item => item.suitabilityScore >= 60), [state.recommendations]);
  const shown = state.showAll ? state.recommendations : strong;
  return <div className="contribution-page"><Navbar /><main className="contribution-container">
    <header className="contribution-hero"><p className="contribution-kicker">Guided Contribution</p><h1 className="contribution-hero-title"><span>Build contribution skills with</span> <span>real repository work</span></h1><p className="contribution-hero-description">Set your skills and time. CodeHub ranks maintainer-configured issues with a transparent, deterministic score.</p></header>
    {state.loading && <p role="status">Loading contribution profile…</p>}{state.error && <div className="contribution-alert" role="alert"><p>{state.error}</p><button className="contribution-secondary" onClick={load}>Retry</button></div>}{state.message && <div className="contribution-success" role="status">{state.message}</div>}
    {!state.loading && !state.error && <div className="contribution-setup-grid"><section className="contribution-panel contribution-repository-panel"><h2>Choose a repository</h2><p>Only repositories returned by your authorized CodeHub repository list appear here.</p><label htmlFor="contribution-repository">Repository</label><select id="contribution-repository" value={state.selectedRepository} onChange={event => setState(current => ({ ...current, selectedRepository: event.target.value, recommendations: [], sessions: [], message: "", recommendationError: "" }))}><option value="">Select a repository</option>{state.repositories.map(repository => <option key={repository._id} value={repository._id}>{repository.owner?.username ? `${repository.owner.username} / ` : ""}{repository.name} · {repository.visibility || "public"} · {guidedCount(repository)} guided</option>)}</select>{!state.selectedRepository && <p className="contribution-helper">Select a repository to find guided issues.</p>}{selected && <div className="selected-repository"><strong>{selected.name}</strong><span>{selected.owner?.username || "Owner"} · {selected.visibility || "public"} · {guidedCount(selected)} guided issues</span><Link to={`/repo/${selected._id}/contribute`}>Open repository contribution page</Link></div>}</section>
      <section className="contribution-panel contribution-profile-panel"><div className="contribution-section-title"><div><h2>{state.profile ? "Your contribution profile" : "Create your contribution profile"}</h2><p>Your choices are preserved if validation or the network fails.</p></div></div><SkillProfileForm key={state.profile?.updatedAt || "new"} initial={state.profile} onSave={findRecommendations} busy={state.finding} /></section></div>}
    {state.recommendationError && <div className="contribution-alert" role="alert"><p>{state.recommendationError}</p><button className="contribution-secondary" disabled={!state.lastAttempt || state.finding} onClick={() => findRecommendations(state.lastAttempt)}>Retry</button></div>}
    {(state.finding || state.recommendations.length > 0 || state.selectedRepository) && <section className="contribution-results" aria-label="Recommended contributions"><div className="contribution-section-title"><div><h2>Recommended for you</h2>{state.profile?.skills?.length > 0 && <p>You know {state.profile.skills.slice(0, 4).join(", ")}.</p>}</div>{!state.finding && <span>{state.recommendations.length} guided issue{state.recommendations.length === 1 ? "" : "s"}</span>}</div>
      {state.finding && <div className="recommendation-grid" role="status" aria-label="Loading recommendations"><RecommendationSkeleton /><RecommendationSkeleton /></div>}
      {!state.finding && state.selectedRepository && !state.recommendationError && !state.recommendations.length && state.message && <div className="contribution-empty"><h3>No guided issues are configured in this repository yet.</h3><p>Choose another repository or ask a maintainer to configure guided issues.</p></div>}
      {!state.finding && state.recommendations.length > 0 && !strong.length && !state.showAll && <div className="contribution-empty"><h3>No strong matches were found for your current profile.</h3><div className="empty-actions"><button className="contribution-secondary" onClick={() => document.getElementById("contribution-experience")?.focus()}>Edit skills</button><button className="contribution-secondary" onClick={() => setState(current => ({ ...current, showAll: true }))}>Show all guided issues</button><button className="contribution-secondary" onClick={() => document.getElementById("contribution-repository")?.focus()}>Choose another repository</button></div></div>}
      {!state.finding && shown.length > 0 && <><p className="recommendation-summary">This repository has {shown.length} suitable issue{shown.length === 1 ? "" : "s"}.</p><div className="recommendation-grid">{shown.map(item => <RecommendationCard key={item.issueId} item={item} repositoryId={state.selectedRepository} repositoryName={selected?.name} activeSession={activeFor(state.sessions, item)} onStart={start} busy={state.busy === item.issueId} />)}</div></>}
    </section>}
    <section className="contribution-panel"><h2>Contribution history</h2>{!state.history.length ? <p>No guided contribution sessions yet.</p> : <div className="contribution-list">{state.history.map(session => <article key={session._id}><div><h3>{session.issue?.title || "Contribution session"}</h3><p>{session.repository?.name} · {session.status.replaceAll("_", " ")} · {session.latestProgressPercent}%</p></div><Link to={`/repo/${session.repository?._id || session.repository}/contribute/session/${session._id}`}>Continue</Link></article>)}</div>}</section>
  </main></div>;
};
export default ContributionHome;
