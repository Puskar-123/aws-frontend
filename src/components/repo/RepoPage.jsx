import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../authContext";
import { authenticatedFetch, getAuthToken, getResponseError, parseResponse } from "../../utils/api";
import { encodeRepoPath, normalizeRepoPath } from "../../utils/repoPath";
import { isBrowserEditableFile } from "../../utils/fileType";
import CommitHistory from "../commit/CommitHistory";
import Navbar from "../Navbar";
import RepositoryBrowser from "../repository/RepositoryBrowser";
import BranchToolbar from "./BranchToolbar";
import RepositorySocialActions from "./RepositorySocialActions";
import { resolveAuthenticatedUserId, resolveRepositoryOwnerId } from "./branchUtils";
import "./repo.css";
import "./branch.css";

const API_BASE = "https://api.codehub.sbs";

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestData = async (response, fallback) => {
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(getResponseError(data, `${fallback} (${response.status})`));
  return data;
};

const isProtectedDisplayPath = (filePath) => {
  const basename = String(filePath || "").replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  return basename === ".env"
    || (basename.startsWith(".env.") && basename !== ".env.example")
    || basename.endsWith(".pem")
    || basename.endsWith(".key");
};

const RepoPage = () => {
  const { id } = useParams();
  const authUser = useAuth()?.currentUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBranch = useRef(searchParams.get("branch") || "");
  const invalidRepositoryId = !id || id === "undefined";
  const folderInputRef = useRef(null);
  const snapshotCache = useRef(new Map());
  const historyCache = useRef(new Map());

  const [repo, setRepo] = useState(null);
  const [repoState, setRepoState] = useState({ loading: true, error: "" });
  const [repoWarning, setRepoWarning] = useState("");
  const [branches, setBranches] = useState([]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchListState, setBranchListState] = useState({ loading: true, error: "" });
  const [snapshotState, setSnapshotState] = useState({ loading: false, files: [], error: "" });
  const [historyState, setHistoryState] = useState({ loading: false, commits: [], error: "" });
  const [branchMessage, setBranchMessage] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [navigationCounts, setNavigationCounts] = useState({ issues: 0, pulls: 0 });

  useEffect(() => {
    if (!location.state?.message) return;
    setBranchMessage(location.state.message);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  const visibleFiles = useMemo(() => snapshotState.files.filter((file) =>
    !isProtectedDisplayPath(file.path || file.filename)
  ), [snapshotState.files]);
  const loggedInUserId = resolveAuthenticatedUserId(authUser, localStorage.getItem("userId"));
  const repositoryOwnerId = resolveRepositoryOwnerId(repo);
  const canManageBranches = Boolean(loggedInUserId)
    && Boolean(repositoryOwnerId)
    && loggedInUserId === repositoryOwnerId;
  const isAuthenticated = Boolean(
    authUser
    || localStorage.getItem("token")
    || localStorage.getItem("userId")
  );

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const fetchRepo = useCallback(async (signal) => {
    if (invalidRepositoryId) return;
    try {
      const response = await fetch(`${API_BASE}/repo/${id}`, { headers: authHeaders(), signal });
      const data = await requestData(response, "Unable to load repository");
      setRepo(data);
      setRepoWarning((data.warnings || []).join(" "));
      setRepoState({ loading: false, error: "" });
    } catch (error) {
      if (error.name !== "AbortError") setRepoState({ loading: false, error: error.message });
    }
  }, [id, invalidRepositoryId]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => fetchRepo(controller.signal));
    return () => controller.abort();
  }, [fetchRepo]);

  useEffect(() => {
    if (invalidRepositoryId) return undefined;
    const controller = new AbortController();
    Promise.all([
      authenticatedFetch(`${API_BASE}/repo/${id}/issues?status=open&limit=1`, { signal: controller.signal }).then(async (response) => response.ok ? parseResponse(response) : {}),
      authenticatedFetch(`${API_BASE}/repo/${id}/pulls?status=open&limit=1`, { signal: controller.signal }).then(async (response) => response.ok ? parseResponse(response) : {}),
    ]).then(([issues, pulls]) => setNavigationCounts({ issues: issues.counts?.open || 0, pulls: pulls.pagination?.total || 0 })).catch(() => {});
    return () => controller.abort();
  }, [id, invalidRepositoryId]);

  useEffect(() => {
    if (invalidRepositoryId) return undefined;
    const controller = new AbortController();
    const loadBranches = async () => {
      setBranchListState({ loading: true, error: "" });
      try {
        const response = await fetch(`${API_BASE}/repo/${id}/branches`, { headers: authHeaders(), signal: controller.signal });
        const data = await requestData(response, "Unable to load branches");
        const loaded = Array.isArray(data.branches) && data.branches.length
          ? data.branches
          : [{ name: "main", head: null, isDefault: true, commitCount: 0 }];
        const fallback = data.defaultBranch
          || loaded.find((branch) => branch.isDefault)?.name
          || "main";
        const requested = initialBranch.current;
        const initial = loaded.some((branch) => branch.name === requested) ? requested : fallback;
        setBranches(loaded);
        setDefaultBranch(fallback);
        setSelectedBranch(initial);
        setBranchListState({ loading: false, error: "" });
      } catch (error) {
        if (error.name !== "AbortError") {
          const fallback = [{ name: "main", head: null, isDefault: true, commitCount: 0 }];
          setBranches(fallback);
          setDefaultBranch("main");
          setSelectedBranch("main");
          setBranchListState({ loading: false, error: error.message });
        }
      }
    };
    loadBranches();
    return () => controller.abort();
  }, [id, invalidRepositoryId]);

  useEffect(() => {
    if (!selectedBranch || invalidRepositoryId) return undefined;
    const controller = new AbortController();
    const cacheKey = `${id}:${selectedBranch}`;
    const cachedSnapshot = snapshotCache.current.get(cacheKey);
    const cachedHistory = historyCache.current.get(cacheKey);
    const loadBranch = async () => {
      await Promise.resolve();
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("branch", selectedBranch);
        return next;
      }, { replace: true });
      setSnapshotState(cachedSnapshot
        ? { loading: false, files: cachedSnapshot, error: "" }
        : { loading: true, files: [], error: "" });
      setHistoryState(cachedHistory
        ? { loading: false, commits: cachedHistory, error: "" }
        : { loading: true, commits: [], error: "" });

      if (!cachedSnapshot) {
        fetch(`${API_BASE}/repo/${id}/branches/${encodeURIComponent(selectedBranch)}/snapshot`, { headers: authHeaders(), signal: controller.signal })
        .then((response) => requestData(response, "Unable to load branch files"))
        .then((data) => {
          const files = Array.isArray(data.files) ? data.files : [];
          snapshotCache.current.set(cacheKey, files);
          setSnapshotState({ loading: false, files, error: "" });
        })
        .catch((error) => { if (error.name !== "AbortError") setSnapshotState({ loading: false, files: [], error: error.message }); });
      }
      if (!cachedHistory) {
        fetch(`${API_BASE}/repo/${id}/branches/${encodeURIComponent(selectedBranch)}/history`, { headers: authHeaders(), signal: controller.signal })
        .then((response) => requestData(response, "Unable to load branch history"))
        .then((data) => {
          const commits = Array.isArray(data.commits) ? data.commits : [];
          historyCache.current.set(cacheKey, commits);
          setHistoryState({ loading: false, commits, error: "" });
          setBranches((current) => current.map((branch) => branch.name === selectedBranch ? { ...branch, commitCount: commits.length } : branch));
        })
        .catch((error) => { if (error.name !== "AbortError") setHistoryState({ loading: false, commits: [], error: error.message }); });
      }
    };
    loadBranch();
    return () => controller.abort();
  }, [id, invalidRepositoryId, reloadVersion, selectedBranch, setSearchParams]);

  const refreshSelectedBranch = useCallback(() => {
    const cacheKey = `${id}:${selectedBranch}`;
    snapshotCache.current.delete(cacheKey);
    historyCache.current.delete(cacheKey);
    setReloadVersion((value) => value + 1);
  }, [id, selectedBranch]);

  const createBranch = async ({ name, sourceBranch }) => {
    if (!getAuthToken()) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    const response = await authenticatedFetch(`${API_BASE}/repo/${id}/branches`, {
      method: "POST",
      body: JSON.stringify({ name, sourceBranch }),
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
      }
      if (response.status === 403) {
        throw new Error("You do not have permission to create branches in this repository.");
      }
      throw new Error(getResponseError(data, `Unable to create branch (${response.status})`));
    }
    const returnedBranch = data.branch;
    const branchName = typeof returnedBranch === "string" ? returnedBranch : returnedBranch?.name;
    if (!branchName) throw new Error("The server did not return the created branch.");
    const branch = typeof returnedBranch === "string"
      ? { name: branchName, head: null, isDefault: false, commitCount: 0 }
      : { ...returnedBranch, name: branchName };
    setBranches((current) => current.some((item) => item.name === branchName)
      ? current
      : [...current, branch]);
    setBranchMessage(`Created branch ${branchName}.`);
    setSelectedBranch(branchName);
    return branch;
  };

  const deleteBranch = async (branch) => {
    const response = await fetch(`${API_BASE}/repo/${id}/branches/${encodeURIComponent(branch.name)}?selectedBranch=${encodeURIComponent(selectedBranch)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await requestData(response, "Unable to delete branch");
    setBranches((current) => current.filter((item) => item.name !== branch.name));
    snapshotCache.current.delete(`${id}:${branch.name}`);
    historyCache.current.delete(`${id}:${branch.name}`);
    setBranchMessage(`Deleted branch ${branch.name}.`);
  };

  const openCompare = () => {
    if (branches.length < 2) return;
    const base = defaultBranch;
    const compare = selectedBranch !== base
      ? selectedBranch
      : branches.find((branch) => branch.name !== base)?.name;
    if (!base || !compare) return;
    navigate(`/repo/${id}/compare?base=${encodeURIComponent(base)}&compare=${encodeURIComponent(compare)}`);
  };

  const deleteFile = async (filePath) => {
    if (!window.confirm(`Delete ${filePath}?`)) return false;
    try {
      const response = await fetch(`${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`, { method: "DELETE", headers: authHeaders() });
      const data = await requestData(response, "Delete failed");
      window.alert(data.message);
      refreshSelectedBranch();
      fetchRepo();
      return true;
    } catch (error) {
      window.alert(`Delete failed: ${error.message}`);
      return false;
    }
  };

  const renameFile = async (filePath) => {
    const currentName = normalizeRepoPath(filePath).split("/").at(-1);
    const newName = window.prompt("Enter a new filename or relative path:", currentName);
    if (!newName || newName === currentName) return null;
    try {
      const response = await fetch(`${API_BASE}/repo/file/${id}/${encodeRepoPath(filePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ newName }),
      });
      const data = await requestData(response, "Rename failed");
      window.alert(data.message);
      refreshSelectedBranch();
      fetchRepo();
      return data.file || null;
    } catch (error) {
      window.alert(`Rename failed: ${error.message}`);
      return null;
    }
  };

  const handleFileSelect = (event) => setSelectedFiles(Array.from(event.target.files));

  const handleAddFiles = async () => {
    if (!selectedFiles.length) { window.alert("Please select files first."); return; }
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
      formData.append("paths", file.webkitRelativePath || file.name);
    });
    try {
      const response = await fetch(`${API_BASE}/repo/add/${id}`, { method: "POST", body: formData, headers: authHeaders() });
      const data = await requestData(response, "Failed to add files");
      window.alert(data.message);
      setSelectedFiles([]);
      fetchRepo();
      refreshSelectedBranch();
    } catch (error) { window.alert(error.message); }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) { window.alert("Please enter a commit message."); return; }
    setCommitting(true);
    try {
      const response = await fetch(`${API_BASE}/repo/commit/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message: commitMessage, branch: selectedBranch || defaultBranch }),
      });
      const data = await requestData(response, "Commit failed");
      window.alert(data.message);
      setCommitMessage("");
      refreshSelectedBranch();
      fetchRepo();
    } catch (error) { window.alert(error.message); }
    finally { setCommitting(false); }
  };

  const runRepositoryAction = async (action, successMessage) => {
    try {
      const branchAware = action === "push";
      const response = await fetch(`${API_BASE}/repo/${action}/${id}`, {
        method: "POST",
        headers: branchAware ? { "Content-Type": "application/json", ...authHeaders() } : authHeaders(),
        ...(branchAware ? { body: JSON.stringify({ branch: selectedBranch || defaultBranch }) } : {}),
      });
      await requestData(response, `${action} failed`);
      window.alert(successMessage);
      refreshSelectedBranch();
      fetchRepo();
    } catch (error) { window.alert(error.message); }
  };

  if (invalidRepositoryId) return <><Navbar /><main className="repo-page-state error">Repository not found</main></>;
  if (repoState.loading) return <><Navbar /><main className="repo-page-state loading" role="status">Loading repository...</main></>;
  if (repoState.error || !repo) return <><Navbar /><main className="repo-page-state error" role="alert">{repoState.error || "Repository not found"}</main></>;

  const selectedMetadata = branches.find((branch) => branch.name === selectedBranch);
  const branchCommitCount = historyState.loading
    ? (selectedMetadata?.commitCount || 0)
    : historyState.commits.length;
  const onDefaultBranch = selectedBranch === defaultBranch;

  return (
    <div className="repo-page">
      <Navbar />
      <main className="repo-container">
        <div className="repo-header">
          <h1 className="repo-title">
            {repo.owner?.username && <><span className="repo-title__owner">{repo.owner.username}</span><span className="repo-title__separator" aria-hidden="true">/</span></>}
            <span className="repo-title__name">{repo.name}</span>
          </h1>
          <div className="repo-header__actions">
            <RepositorySocialActions repository={repo} onForked={(repositoryId) => navigate(`/repo/${repositoryId}`)} />
            <label className="upload-btn">Upload Project Folder<input ref={folderInputRef} type="file" multiple hidden onChange={handleFileSelect} /></label>
            <button type="button" onClick={handleAddFiles} className="push-btn">Add Files</button>
          </div>
        </div>
        {repo.forkedFrom && <p className="repo-fork-source">forked from <Link to={`/repo/${repo.forkedFrom._id}`}>{repo.forkedFrom.owner?.username ? `${repo.forkedFrom.owner.username} / ` : ""}{repo.forkedFrom.name || "Deleted repository"}</Link></p>}

        <nav className="repo-tabs" aria-label="Repository sections"><Link className="active" to={`/repo/${id}`}>Code</Link><Link to={`/repo/${id}/issues`}>Issues <span>{navigationCounts.issues}</span></Link><Link to={`/repo/${id}/pulls`}>Pull requests <span>{navigationCounts.pulls}</span></Link></nav>

        <p className="repo-description">{repo.description || "No description"}</p>
        <p className="repo-visibility">Visibility: <strong>{repo.visibility === "public" ? "Public" : "Private"}</strong></p>
        {repoWarning && <p className="error">{repoWarning}</p>}

        <BranchToolbar
          branches={branches}
          selectedBranch={selectedBranch}
          defaultBranch={defaultBranch}
          commitCount={branchCommitCount}
          loading={branchListState.loading}
          error={branchListState.error}
          canManageBranches={canManageBranches}
          isAuthenticated={isAuthenticated}
          message={branchMessage}
          onSelect={(branch) => { setBranchMessage(""); setSelectedBranch(branch); }}
          onCreate={createBranch}
          onDelete={deleteBranch}
          onCompare={openCompare}
        />

        <div className="commit-section">
          <input type="text" placeholder={`Commit message for ${selectedBranch || defaultBranch}`} value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} className="commit-input" />
          <button type="button" onClick={handleCommit} className="push-btn" disabled={committing}>{committing ? "Committing..." : "Commit"}</button>
          <button type="button" onClick={() => runRepositoryAction("push", "Push successful!")} className="push-btn">Push</button>
          <button type="button" onClick={() => runRepositoryAction("pull", "Pull successful!")} className="push-btn">Pull</button>
        </div>

        {snapshotState.error && <div className="repo-branch-section-error" role="alert">Files for {selectedBranch} could not be loaded: {snapshotState.error}</div>}
        <RepositoryBrowser
          repositoryId={id}
          repositoryName={repo.name}
          files={visibleFiles}
          branch={selectedBranch}
          loading={snapshotState.loading}
          emptyMessage="This branch has no files"
          onRename={onDefaultBranch ? renameFile : undefined}
          onDelete={onDefaultBranch ? deleteFile : undefined}
          requestedPath={searchParams.get("path") || ""}
          onEdit={canManageBranches ? (filePath) => {
            const file = visibleFiles.find((item) => item.path === filePath);
            if (!isBrowserEditableFile(filePath, file?.size)) return;
            navigate(`/repo/${id}/edit?branch=${encodeURIComponent(selectedBranch || defaultBranch)}&path=${encodeURIComponent(filePath)}`);
          } : undefined}
        />

        {historyState.loading && <div className="repo-history-state" role="status">Loading commit history...</div>}
        {historyState.error && <div className="repo-branch-section-error" role="alert">History for {selectedBranch} could not be loaded: {historyState.error}</div>}
        {!historyState.loading && <CommitHistory repositoryId={id} branch={selectedBranch} commits={historyState.commits} emptyText="No commits on this branch yet" />}
      </main>
    </div>
  );
};

export default RepoPage;
