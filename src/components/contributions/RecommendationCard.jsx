import React from "react";
import { Link } from "react-router-dom";

const SkillList = ({ label, values = [], empty }) => <div className="recommendation-skills"><strong>{label}</strong><p>{values.length ? values.join(", ") : empty}</p></div>;
const RecommendationCard = ({ item, repositoryId, repositoryName, onStart, busy, activeSession }) => {
  const score = Number(item.suitabilityScore) || 0;
  return <article className="recommendation-card"><div className="recommendation-card__top"><div><p className="contribution-kicker">Issue #{item.issueNumber}</p><h3>{item.title}</h3><p className="recommendation-repository">{item.repository?.name || repositoryName || "Repository"}</p></div><div className="contribution-score" aria-label={`Suitability score ${score} percent`}><strong>{score}%</strong><span>{item.suitabilityLabel}</span></div></div>
    <div className="contribution-tags"><span>{item.difficulty || "Unspecified difficulty"}</span><span>{item.estimatedMinutes ? `${item.estimatedMinutes} minutes` : "No time estimate"}</span>{item.taskType && <span>{item.taskType}</span>}{(item.labels || []).map(label => <span key={label.name || label}>{label.name || label}</span>)}</div>
    <div className="recommendation-skill-grid"><SkillList label="Required skills" values={item.requiredSkills} empty="No required skills configured" /><SkillList label="Matched skills" values={item.matchedSkills} empty="No direct skill matches" /><SkillList label="Learning skills" values={item.missingSkills} empty="No missing required skills" /></div>
    <section className="recommendation-reasons"><h4>Why it matches</h4>{item.reasons?.length ? <ul>{item.reasons.map(reason => <li key={reason}><span aria-hidden="true">✓</span>{reason}</li>)}</ul> : <p>No strong match signals were found.</p>}</section>
    {!!item.warnings?.length && <div className="contribution-warning" role="note"><strong>You may need help with</strong><ul>{item.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
    <details><summary>Suitability score breakdown</summary><dl className="score-breakdown">{Object.entries(item.breakdown || {}).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl></details>
    <div className="recommendation-actions"><Link className="contribution-secondary" to={`/repo/${repositoryId}/issues/${item.issueNumber}`}>View issue</Link><button className="contribution-primary" disabled={busy || (!item.actionable && !activeSession)} onClick={() => onStart(item, activeSession)}>{busy ? "Opening…" : activeSession ? "Continue session" : item.actionable ? "Start guided contribution" : "Repository access required"}</button></div>
  </article>;
};

export const RecommendationSkeleton = () => <article className="recommendation-card recommendation-skeleton" aria-hidden="true"><span /><span /><span /><span /></article>;
export default RecommendationCard;
