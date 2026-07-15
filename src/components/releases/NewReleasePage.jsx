import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../Navbar";
import MarkdownPreview from "../repository/MarkdownPreview";
import { releaseRequest } from "./releaseApi";
import "./releases.css";

const NewReleasePage = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const [tags, setTags] = useState([]); const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState({ tagMode: "existing", tagId: "", tagName: "", target: "main", tagMessage: "", title: "", body: "", prerelease: false });
  const [state, setState] = useState({ loading: true, saving: false, error: "", preview: false });
  useEffect(() => { const controller = new AbortController(); releaseRequest(`/repo/${id}/tags?limit=100`, { signal: controller.signal }).then((data) => { setTags(data.tags || []); setCanManage(Boolean(data.canManage)); setForm((current) => ({ ...current, tagId: data.tags?.[0]?._id || "", tagMode: data.tags?.length ? "existing" : "new" })); setState((current) => ({ ...current, loading: false })); }).catch((error) => { if (error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); }); return () => controller.abort(); }, [id]);
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event, draft) => { event.preventDefault(); setState((current) => ({ ...current, saving: true, error: "" })); try { const payload = { title: form.title, body: form.body, prerelease: form.prerelease, draft, ...(form.tagMode === "existing" ? { tagId: form.tagId } : { newTag: { name: form.tagName, target: form.target, message: form.tagMessage } }) }; const data = await releaseRequest(`/repo/${id}/releases`, { method: "POST", body: JSON.stringify(payload) }); navigate(`/repo/${id}/releases/${data.release._id}`); } catch (error) { setState((current) => ({ ...current, saving: false, error: error.message })); } };
  if (state.loading) return <div className="releases-page"><Navbar /><main className="releases-container"><div className="release-state">Loading tags...</div></main></div>;
  return <div className="releases-page"><Navbar /><main className="releases-container releases-container--form"><p><Link to={`/repo/${id}/releases`}>← Releases</Link></p><h1>New release</h1>{!canManage && <div className="release-state release-state--error">Owner or maintainer access is required.</div>}{state.error && <div className="release-state release-state--error" role="alert">{state.error}</div>}
    <form className="release-form" onSubmit={(event) => submit(event, false)}>
      <fieldset disabled={!canManage || state.saving}><legend>Choose a tag</legend><div className="release-segment"><button type="button" className={form.tagMode === "existing" ? "is-active" : ""} onClick={() => change("tagMode", "existing")} disabled={!tags.length}>Existing tag</button><button type="button" className={form.tagMode === "new" ? "is-active" : ""} onClick={() => change("tagMode", "new")}>Create new tag</button></div>{form.tagMode === "existing" ? <label>Tag<select value={form.tagId} onChange={(event) => change("tagId", event.target.value)} required>{tags.map((tag) => <option key={tag._id} value={tag._id}>{tag.name} — {String(tag.targetCommitHash).slice(0, 8)}</option>)}</select></label> : <div className="release-form-grid"><label>Tag name<input value={form.tagName} onChange={(event) => change("tagName", event.target.value)} placeholder="v1.0.0" required /></label><label>Target branch or commit<input value={form.target} onChange={(event) => change("target", event.target.value)} required /></label><label className="release-form-wide">Tag message<input value={form.tagMessage} onChange={(event) => change("tagMessage", event.target.value)} /></label></div>}</fieldset>
      <label>Release title<input value={form.title} onChange={(event) => change("title", event.target.value)} placeholder="CodeHub 1.0" required disabled={!canManage || state.saving} /></label>
      <label>Release notes <span className="release-label-action"><button type="button" onClick={() => setState((current) => ({ ...current, preview: !current.preview }))}>{state.preview ? "Edit" : "Preview"}</button></span>{state.preview ? <div className="release-preview"><MarkdownPreview content={form.body || "Nothing to preview."} /></div> : <textarea rows="14" value={form.body} onChange={(event) => change("body", event.target.value)} placeholder="Describe this release using Markdown" disabled={!canManage || state.saving} />}</label>
      <label className="release-checkbox"><input type="checkbox" checked={form.prerelease} onChange={(event) => change("prerelease", event.target.checked)} disabled={!canManage || state.saving} /><span><strong>Set as a pre-release</strong><small>This release may not be ready for production.</small></span></label>
      <div className="release-form-actions"><button type="button" className="release-secondary" disabled={!canManage || state.saving} onClick={(event) => submit(event, true)}>Save draft</button><button className="release-primary" disabled={!canManage || state.saving}>{state.saving ? "Saving…" : "Publish release"}</button></div>
    </form>
  </main></div>;
};
export default NewReleasePage;
