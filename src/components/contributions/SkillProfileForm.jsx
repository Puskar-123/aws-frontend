import React, { useRef, useState } from "react";
import { SKILL_GROUPS, TASKS } from "./contributionOptions";

const EMPTY = { experienceLevel: "", skills: [], preferredTaskTypes: [], availableTime: "", learningGoals: [], visibility: "private" };
const toggle = (items, value) => items.includes(value) ? items.filter(item => item !== value) : [...items, value];

const SkillProfileForm = ({ initial, onSave, busy = false, submitLabel = "Find suitable issues" }) => {
  const [profile, setProfile] = useState(() => ({ ...EMPTY, ...(initial || {}) }));
  const [goal, setGoal] = useState((initial?.learningGoals || []).join(", "));
  const [errors, setErrors] = useState({});
  const submitting = useRef(false);
  const update = (key, value) => { setProfile(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: "" })); };
  const submit = async event => {
    event.preventDefault();
    if (busy || submitting.current) return;
    const next = {};
    if (!profile.experienceLevel) next.experienceLevel = "Select your experience level.";
    if (!profile.skills.length) next.skills = "Select at least one skill.";
    if (!profile.preferredTaskTypes.length) next.preferredTaskTypes = "Select at least one preferred task.";
    if (!profile.availableTime) next.availableTime = "Select your available time.";
    setErrors(next);
    if (Object.keys(next).length) return;
    submitting.current = true;
    try { await onSave({ ...profile, learningGoals: goal.split(",").map(value => value.trim()).filter(Boolean) }); }
    finally { submitting.current = false; }
  };
  return <form className="contribution-form" onSubmit={submit} noValidate>
    <div className="contribution-field"><label htmlFor="contribution-experience">Experience level</label><select id="contribution-experience" value={profile.experienceLevel} aria-describedby="experience-error" aria-invalid={Boolean(errors.experienceLevel)} onChange={event => update("experienceLevel", event.target.value)}><option value="">Select experience</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><p id="experience-error" className="contribution-field-error">{errors.experienceLevel}</p></div>
    <section className="contribution-control-group" aria-labelledby="skills-heading"><div><h3 id="skills-heading">Skills</h3><p>Select everything you are comfortable practising.</p></div><div className="contribution-skill-groups">{SKILL_GROUPS.map(group => <fieldset key={group.name} aria-describedby="skills-error"><legend>{group.name}</legend><div className="contribution-chip-grid">{group.skills.map(skill => <label key={skill}><input type="checkbox" checked={profile.skills.includes(skill)} onChange={() => update("skills", toggle(profile.skills, skill))} /><span>{skill}</span></label>)}</div></fieldset>)}</div><p id="skills-error" className="contribution-field-error">{errors.skills}</p></section>
    <fieldset className="contribution-control-group" aria-describedby="tasks-error"><legend>Preferred tasks</legend><div className="contribution-chip-grid contribution-task-grid">{TASKS.map(task => <label key={task}><input type="checkbox" checked={profile.preferredTaskTypes.includes(task)} onChange={() => update("preferredTaskTypes", toggle(profile.preferredTaskTypes, task))} /><span>{task}</span></label>)}</div><p id="tasks-error" className="contribution-field-error">{errors.preferredTaskTypes}</p></fieldset>
    <div className="contribution-field"><label htmlFor="contribution-time">Available time</label><select id="contribution-time" value={profile.availableTime} aria-describedby="time-error" aria-invalid={Boolean(errors.availableTime)} onChange={event => update("availableTime", event.target.value)}><option value="">Select available time</option><option value="under_30_minutes">Under 30 minutes</option><option value="30_to_60_minutes">30–60 minutes</option><option value="1_to_2_hours">1–2 hours</option><option value="2_to_4_hours">2–4 hours</option><option value="more_than_4_hours">More than 4 hours</option></select><p id="time-error" className="contribution-field-error">{errors.availableTime}</p></div>
    <details className="contribution-optional-fields"><summary>Optional profile details</summary><div className="contribution-field"><label htmlFor="contribution-goals">Learning goals (comma separated)</label><input id="contribution-goals" value={goal} onChange={event => setGoal(event.target.value)} maxLength="500" /></div><div className="contribution-field"><label htmlFor="contribution-visibility">Profile visibility</label><select id="contribution-visibility" value={profile.visibility} onChange={event => update("visibility", event.target.value)}><option value="private">Private</option><option value="repository_maintainers">Repository maintainers</option><option value="public">Public</option></select></div></details>
    <button className="contribution-primary contribution-submit" disabled={busy} aria-busy={busy}>{busy ? "Finding suitable issues…" : submitLabel}</button>
  </form>;
};
export default SkillProfileForm;
