import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../Navbar";
import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
import FileEditorStatus from "./FileEditorStatus";
import FileEditorToolbar from "./FileEditorToolbar";
import "./editor.css";

const API_BASE = "https://api.codehub.sbs";

const FileEditorPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const branch = searchParams.get("branch") || "main";
  const filePath = searchParams.get("path") || "";
  const [repository, setRepository] = useState(null);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [baseCommit, setBaseCommit] = useState(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [state, setState] = useState({ loading: true, saving: false, error: "" });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pendingDestination, setPendingDestination] = useState("");
  const textareaRef = useRef(null);
  const dirty = content !== original;
  const returnUrl = `/repo/${id}?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(filePath)}`;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!filePath) { setState({ loading: false, saving: false, error: "A file path is required" }); return; }
      try {
        const [repoResponse, editorResponse] = await Promise.all([
          authenticatedFetch(`${API_BASE}/repo/${id}`, { signal: controller.signal }),
          authenticatedFetch(`${API_BASE}/repo/${id}/file-editor?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(filePath)}`, { signal: controller.signal }),
        ]);
        const [repoData, editorData] = await Promise.all([parseResponse(repoResponse), parseResponse(editorResponse)]);
        if (!repoResponse.ok) throw new Error(getResponseError(repoData, "Unable to load repository"));
        if (!editorResponse.ok) throw new Error(getResponseError(editorData, "Unable to load file editor"));
        setRepository(repoData);
        setContent(editorData.content || "");
        setOriginal(editorData.content || "");
        setBaseCommit(editorData.baseCommit ?? null);
        setCommitMessage(`Update ${filePath.split("/").at(-1)}`);
        setState({ loading: false, saving: false, error: "" });
      } catch (error) {
        if (error.name !== "AbortError") setState({ loading: false, saving: false, error: error.message });
      }
    };
    load();
    return () => controller.abort();
  }, [branch, filePath, id]);

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const guardLinks = (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target || event.defaultPrevented) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin) return;
      event.preventDefault();
      setPendingDestination(`${target.pathname}${target.search}${target.hash}`);
      setConfirmCancel(true);
    };
    document.addEventListener("click", guardLinks, true);
    return () => document.removeEventListener("click", guardLinks, true);
  }, [dirty]);

  const save = useCallback(async () => {
    if (state.saving) return;
    if (!commitMessage.trim()) {
      setState((current) => ({ ...current, error: "Commit message is required" }));
      return;
    }
    if (!dirty) {
      setState((current) => ({ ...current, error: "Make a change before saving" }));
      return;
    }
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const response = await authenticatedFetch(`${API_BASE}/repo/${id}/file-editor`, {
        method: "PUT",
        body: JSON.stringify({ path: filePath, branch, content, commitMessage: commitMessage.trim(), baseCommit }),
      });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(getResponseError(data, response.status === 409
        ? "The file changed after you opened it. Reload before saving."
        : "Unable to save file"));
      setOriginal(content);
      navigate(returnUrl, { replace: true, state: { message: data.message || "File updated successfully" } });
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message }));
    }
  }, [baseCommit, branch, commitMessage, content, dirty, filePath, id, navigate, returnUrl, state.saving]);

  useEffect(() => {
    const keyboardSave = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", keyboardSave);
    return () => window.removeEventListener("keydown", keyboardSave);
  }, [save]);

  const handleEditorKeyDown = (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const element = event.currentTarget;
    const next = `${content.slice(0, element.selectionStart)}  ${content.slice(element.selectionEnd)}`;
    const cursor = element.selectionStart + 2;
    setContent(next);
    requestAnimationFrame(() => { textareaRef.current?.setSelectionRange(cursor, cursor); });
  };

  const cancel = () => {
    if (!dirty) { navigate(returnUrl); return; }
    setPendingDestination(returnUrl);
    setConfirmCancel(true);
  };

  return (
    <div className="file-editor-page">
      <Navbar />
      <main className="file-editor-container">
        <div className="file-editor-heading">
          <h1><Link to={`/repo/${id}`}>{repository?.owner?.username || "Repository"} / {repository?.name || "…"}</Link></h1>
          <p>Editing <strong>{filePath}</strong> in <strong>{branch}</strong></p>
        </div>
        <FileEditorToolbar dirty={dirty} saving={state.saving} onCancel={cancel} onSave={save} />
        <FileEditorStatus loading={state.loading} error={state.error} />
        {!state.loading && repository && (
          <div className="file-editor-form">
            <label htmlFor="file-content">File contents</label>
            <textarea id="file-content" ref={textareaRef} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={handleEditorKeyDown} spellCheck="false" aria-describedby="editor-help" />
            <p id="editor-help">Press Ctrl+S or Cmd+S to save. Tab inserts two spaces.</p>
            <label htmlFor="commit-message">Commit message</label>
            <input id="commit-message" value={commitMessage} maxLength={500} onChange={(event) => setCommitMessage(event.target.value)} />
          </div>
        )}
      </main>
      {confirmCancel && (
        <div className="file-editor-dialog-backdrop" role="presentation">
          <div className="file-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-title">
            <h2 id="discard-title">Discard unsaved changes?</h2>
            <p>Your edits to {filePath} will be lost.</p>
            <div><button type="button" className="file-editor-button" onClick={() => { setConfirmCancel(false); setPendingDestination(""); }}>Keep editing</button><button type="button" className="file-editor-button file-editor-button--danger" onClick={() => navigate(pendingDestination || returnUrl)}>Discard changes</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileEditorPage;
