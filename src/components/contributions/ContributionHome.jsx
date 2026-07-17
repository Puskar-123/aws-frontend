import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Navbar";
import SkillProfileForm from "./SkillProfileForm";
import { contributionRequest } from "../../services/contributionApi";
import "./contributions.css";

const ContributionHome = () => {
  const [state, setState] = useState({ loading: true, profile: null, sessions: [], progress: [], error: "", message: "" });
  useEffect(() => { Promise.all([contributionRequest("/contributions/profile"), contributionRequest("/contributions/history")]).then(([profile, history]) => setState(current => ({ ...current, loading: false, profile: profile.profile, sessions: history.sessions || [], progress: history.skillProgress || [] }))).catch(error => setState(current => ({ ...current, loading: false, error: error.message }))); }, []);
  const save = async profile => { setState(current => ({ ...current, saving: true, error: "" })); try { const data = await contributionRequest("/contributions/profile", { method: "PUT", body: profile }); setState(current => ({ ...current, saving: false, profile: data.profile, message: data.message })); } catch (error) { setState(current => ({ ...current, saving: false, error: error.message })); } };
  return <div className="contribution-page"><Navbar /><main className="contribution-container"><header className="contribution-hero"><p className="contribution-kicker">Guided Contribution</p><h1>Build contribution skills with real repository work</h1><p>Set your skills and time. CodeHub ranks maintainer-configured issues with a transparent, deterministic score.</p></header>
    {state.loading && <p role="status">Loading contribution profile…</p>}{state.error && <div className="contribution-alert" role="alert">{state.error}</div>}{state.message && <div className="contribution-success" role="status">{state.message}</div>}
    {!state.loading && <section className="contribution-panel"><h2>{state.profile ? "Your contribution profile" : "Create your contribution profile"}</h2><SkillProfileForm key={state.profile?.updatedAt || "new"} initial={state.profile} onSave={save} busy={state.saving} /></section>}
    <section className="contribution-panel"><h2>Contribution history</h2>{!state.sessions.length ? <p>No guided contribution sessions yet. Open a repository and choose its Contribute tab.</p> : <div className="contribution-list">{state.sessions.map(session => <article key={session._id}><div><h3>{session.issue?.title || "Contribution session"}</h3><p>{session.repository?.name} · {session.status.replaceAll("_", " ")} · {session.latestProgressPercent}%</p></div><Link to={`/repo/${session.repository?._id || session.repository}/contribute/session/${session._id}`}>Continue</Link></article>)}</div>}</section>
    {!!state.progress.length && <section className="contribution-panel"><h2>Evidence-based skill reports</h2><div className="contribution-list">{state.progress.map(item => <article key={item._id}><div><h3>Score {item.score}/100</h3><p>{item.skillsDemonstrated?.map(skill => skill.skill).join(", ") || "No skill evidence recorded"}</p></div></article>)}</div></section>}
  </main></div>;
};
export default ContributionHome;
