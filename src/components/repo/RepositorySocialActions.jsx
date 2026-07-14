import React, { useEffect, useState } from "react";
import { FiEye, FiGitBranch, FiStar } from "react-icons/fi";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

const API_BASE = "https://api.codehub.sbs";
const RepositorySocialActions = ({ repository, onForked }) => {
  const [social, setSocial] = useState(repository.social || { starCount: 0, watcherCount: 0, forkCount: 0 });
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  useEffect(() => setSocial(repository.social || { starCount: 0, watcherCount: 0, forkCount: 0 }), [repository]);
  const toggle = async (kind) => {
    const activeKey = kind === "star" ? "starredByCurrentUser" : "watchedByCurrentUser";
    const countKey = kind === "star" ? "starCount" : "watcherCount";
    const active = Boolean(social[activeKey]); const previous = social;
    setBusy(kind); setError(""); setSocial({ ...social, [activeKey]: !active, [countKey]: Math.max(0, social[countKey] + (active ? -1 : 1)) });
    try { const response = await authenticatedFetch(`${API_BASE}/repo/${repository._id}/${kind}`, { method: active ? "DELETE" : "POST" }); const data = await parseResponse(response); if (!response.ok) throw new Error(getResponseError(data, response.status === 403 ? "You do not have permission to perform this action." : "Unable to update repository")); setSocial((current) => ({ ...current, [activeKey]: data[kind === "star" ? "starred" : "watched"], [countKey]: data[countKey] })); }
    catch (requestError) { setSocial(previous); setError(requestError.message); } finally { setBusy(""); }
  };
  const fork = async () => { setBusy("fork"); setError(""); try { const response = await authenticatedFetch(`${API_BASE}/repo/${repository._id}/fork`, { method: "POST" }); const data = await parseResponse(response); if (!response.ok) throw new Error(getResponseError(data, response.status === 409 ? "You already forked this repository." : "Unable to fork repository")); onForked(data.repository._id); } catch (requestError) { setError(requestError.message); setBusy(""); } };
  return <div><div className="repo-social-actions" aria-label="Repository social actions">
    <button type="button" aria-pressed={Boolean(social.watchedByCurrentUser)} aria-label={social.watchedByCurrentUser ? "Unwatch repository" : "Watch repository"} disabled={Boolean(busy)} onClick={() => toggle("watch")}><FiEye />{busy === "watch" ? "Updating..." : social.watchedByCurrentUser ? "Watching" : "Watch"}<span>{social.watcherCount || 0}</span></button>
    <button type="button" aria-label="Fork repository" disabled={Boolean(busy) || social.forkedByCurrentUser} onClick={fork}><FiGitBranch />{busy === "fork" ? "Forking..." : "Fork"}<span>{social.forkCount || 0}</span></button>
    <button type="button" aria-pressed={Boolean(social.starredByCurrentUser)} aria-label={social.starredByCurrentUser ? "Unstar repository" : "Star repository"} disabled={Boolean(busy)} onClick={() => toggle("star")}><FiStar />{busy === "star" ? "Updating..." : social.starredByCurrentUser ? "Starred" : "Star"}<span>{social.starCount || 0}</span></button>
  </div>{error && <p className="repo-social-error" role="alert">{error}</p>}</div>;
};
export default RepositorySocialActions;
