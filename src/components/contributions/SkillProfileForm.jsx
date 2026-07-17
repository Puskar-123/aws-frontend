import React, { useState } from "react";
import { SKILLS, TASKS } from "./contributionOptions";
const EMPTY = { experienceLevel: "beginner", skills: [], preferredTaskTypes: [], availableTime: "1_to_2_hours", learningGoals: [], visibility: "private" };
const toggle = (items, value) => items.includes(value) ? items.filter(item => item !== value) : [...items, value];

const SkillProfileForm = ({ initial, onSave, busy }) => {
  const [profile, setProfile] = useState(() => ({ ...EMPTY, ...(initial || {}) }));
  const [goal, setGoal] = useState((initial?.learningGoals || []).join(", "));
  const submit = event => { event.preventDefault(); onSave({ ...profile, learningGoals: goal.split(",").map(value => value.trim()).filter(Boolean) }); };
  return <form className="contribution-form" onSubmit={submit}>
    <label>Experience level<select value={profile.experienceLevel} onChange={event => setProfile({ ...profile, experienceLevel: event.target.value })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
    <fieldset><legend>Skills</legend><div className="contribution-chip-grid">{SKILLS.map(skill => <label key={skill}><input type="checkbox" checked={profile.skills.includes(skill)} onChange={() => setProfile({ ...profile, skills: toggle(profile.skills, skill) })} />{skill}</label>)}</div></fieldset>
    <fieldset><legend>Preferred tasks</legend><div className="contribution-chip-grid">{TASKS.map(task => <label key={task}><input type="checkbox" checked={profile.preferredTaskTypes.includes(task)} onChange={() => setProfile({ ...profile, preferredTaskTypes: toggle(profile.preferredTaskTypes, task) })} />{task}</label>)}</div></fieldset>
    <label>Available time<select value={profile.availableTime} onChange={event => setProfile({ ...profile, availableTime: event.target.value })}><option value="under_30_minutes">Under 30 minutes</option><option value="30_to_60_minutes">30–60 minutes</option><option value="1_to_2_hours">1–2 hours</option><option value="2_to_4_hours">2–4 hours</option><option value="more_than_4_hours">More than 4 hours</option></select></label>
    <label>Learning goals (comma separated)<input value={goal} onChange={event => setGoal(event.target.value)} maxLength="500" /></label>
    <label>Profile visibility<select value={profile.visibility} onChange={event => setProfile({ ...profile, visibility: event.target.value })}><option value="private">Private</option><option value="repository_maintainers">Repository maintainers</option><option value="public">Public</option></select></label>
    <button className="contribution-primary" disabled={busy || !profile.skills.length}>{busy ? "Saving…" : "Save contribution profile"}</button>
  </form>;
};
export default SkillProfileForm;
