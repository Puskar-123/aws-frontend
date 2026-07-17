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
import RepositoryCodeMenu from "./RepositoryCodeMenu";
import EmptyRepositorySetupPanel from "./EmptyRepositorySetupPanel";
import AddFileMenu from "./AddFileMenu";
import { RepoContent, RepoHeader, RepoTabs } from "./RepositoryPageShell";
import MentorRequestButton from "../chat/MentorRequestButton";
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
  const setSearchParamsRef = useRef(setSearchParams);
  const initialBranch = useRef(searchParams.get("branch") || "");
  const invalidRepositoryId = !id || id === "undefined";
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const historySectionRef = useRef(null);
  const snapshotCache = useRef(new Map());
  const historyCache = useRef(new Map());
  const pendingSelectedPath = useRef("");
  const activeBranchKey = useRef("");
  const repositoryRequestId = useRef(0);
  const branchRequestId = useRef(0);
  const snapshotRequestId = useRef(0);
  const historyRequestId = useRef(0);
  const statusRequestId = useRef(0);
  const snapshotStateRef = useRef(null);
  const historyStateRef = useRef(null);

  const [repo, setRepo] = useState(null);
  const [repoState, setRepoState] = useState({ loading: true, error: "" });
  const [repoWarning, setRepoWarning] = useState("");
  const [branches, setBranches] = useState([]);
  const [branchRepositoryId, setBranchRepositoryId] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchListState, setBranchListState] = useState({ loading: true, error: "" });
  const [snapshotState, setSnapshotState] = useState({ key: "", loading: false, files: [], state: null, error: "" });
  const [historyState, setHistoryState] = useState({ key: "", loading: false, commits: [], error: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [branchMessage, setBranchMessage] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [pendingCommit, setPendingCommit] = useState(false);
  const [syncState, setSyncState] = useState({
    key: "", loading: false, localHead: null, remoteHead: null,
    aheadCount: 0, behindCount: 0, hasStagedChanges: false,
    hasUnpushedCommits: false, hasRemoteChanges: false,
  });
  const [syncAction, setSyncAction] = useState("");
  const [navigationCounts, setNavigationCounts] = useState({ issues: 0, pulls: 0 });

  useEffect(() => {
    if (!location.state?.message) return;
    const message = location.state.message;
    Promise.resolve().then(() => setBranchMessage(message));
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  const visibleFiles = useMemo(() => snapshotState.files.filter((file) =>
    !isProtectedDisplayPath(file.path || file.filename)
  ), [snapshotState.files]);
  const loggedInUserId = resolveAuthenticatedUserId(authUser, localStorage.getItem("userId"));
  const repositoryOwnerId = resolveRepositoryOwnerId(repo);
  const isRepositoryOwner = Boolean(loggedInUserId)
    && Boolean(repositoryOwnerId)
    && loggedInUserId === repositoryOwnerId;
  const permissions = repo?.permissions || {};
  const currentBranches = branchRepositoryId === id ? branches : [];
  const selectedProtection = currentBranches.find((branch) => branch.name === selectedBranch)?.protection
    || (repo?.currentBranch === selectedBranch ? repo.branchProtection : { protected: false, canBypass: false });
  const branchDirectBlocked = Boolean(selectedProtection?.protected
    && (selectedProtection.blockDirectCommits || selectedProtection.requirePullRequest)
    && !selectedProtection.canBypass);
  const baseWritePermission = permissions.canWriteUnprotectedBranches ?? permissions.canEditFiles ?? isRepositoryOwner;
  const canWriteContent = Boolean(baseWritePermission && !branchDirectBlocked);
  const canUploadFiles = Boolean((permissions.canWriteUnprotectedBranches ?? permissions.canUploadFiles ?? isRepositoryOwner) && !branchDirectBlocked);
  const canManageBranches = permissions.canDeleteBranch ?? isRepositoryOwner;
  const canManageCollaborators = permissions.canManageCollaborators ?? isRepositoryOwner;
  const canManageBranchProtection = permissions.canManageBranchProtection ?? isRepositoryOwner;
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
  useEffect(() => { setSearchParamsRef.current = setSearchParams; }, [setSearchParams]);
  useEffect(() => { snapshotStateRef.current = snapshotState; }, [snapshotState]);
  useEffect(() => { historyStateRef.current = historyState; }, [historyState]);
  useEffect(() => {
    initialBranch.current = searchParams.get("branch") || "";
    pendingSelectedPath.current = "";
    activeBranchKey.current = "";
    // Query-only changes are handled by branch selection; these refs are repository-scoped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBranchStatus = useCallback(async (branch, signal) => {
    if (!branch || invalidRepositoryId) return null;
    const requestId = ++statusRequestId.current;
    const key = `${id}:${branch}`;
    setSyncState((current) => current.key === key ? { ...current, loading: true } : {
      key, loading: true, localHead: null, remoteHead: null, aheadCount: 0,
      behindCount: 0, hasStagedChanges: false, hasUnpushedCommits: false,
      hasRemoteChanges: false,
    });
    try {
      const response = await fetch(`${API_BASE}/repo/${id}/branches/${encodeURIComponent(branch)}/status`, { headers: authHeaders(), signal });
      const data = await requestData(response, "Unable to load repository status");
      if (requestId !== statusRequestId.current || key !== `${id}:${branch}`) return null;
      const next = {
        key, loading: false,
        localHead: data.localHead || null,
        remoteHead: data.remoteHead || null,
        aheadCount: Number(data.aheadCount || 0),
        behindCount: Number(data.behindCount || 0),
        hasStagedChanges: Boolean(data.hasStagedChanges),
        hasUnpushedCommits: Boolean(data.hasUnpushedCommits || Number(data.aheadCount) > 0),
        hasRemoteChanges: Boolean(data.hasRemoteChanges || Number(data.behindCount) > 0),
      };
      setSyncState(next);
      setPendingCommit(next.hasStagedChanges);
      return next;
    } catch (error) {
      if (error.name !== "AbortError" && requestId === statusRequestId.current) {
        setSyncState((current) => current.key === key ? { ...current, loading: false } : current);
      }
      return null;
    }
  }, [id, invalidRepositoryId]);

  useEffect(() => {
    statusRequestId.current += 1;
    if (!selectedBranch || invalidRepositoryId) return undefined;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setSelectedFiles([]);
      setCommitMessage("");
      setPendingCommit(false);
      setSyncAction("");
      fetchBranchStatus(selectedBranch, controller.signal);
    });
    return () => controller.abort();
  }, [fetchBranchStatus, id, invalidRepositoryId, reloadVersion, selectedBranch]);

  const fetchRepo = useCallback(async (signal) => {
    if (invalidRepositoryId) return;
    const requestId = ++repositoryRequestId.current;
    try {
      const response = await fetch(`${API_BASE}/repo/${id}`, { headers: authHeaders(), signal });
      const data = await requestData(response, "Unable to load repository");
      if (requestId !== repositoryRequestId.current) return;
      setRepo(data);
      setRepoWarning((data.warnings || []).join(" "));
      setRepoState({ loading: false, error: "" });
    } catch (error) {
      if (error.name !== "AbortError" && requestId === repositoryRequestId.current) setRepoState({ loading: false, error: error.message });
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
    const requestId = ++branchRequestId.current;
    const loadBranches = async () => {
      setBranchListState({ loading: true, error: "" });
      try {
        const response = await fetch(`${API_BASE}/repo/${id}/branches`, { headers: authHeaders(), signal: controller.signal });
        const data = await requestData(response, "Unable to load branches");
        if (requestId !== branchRequestId.current) return;
        const loaded = Array.isArray(data.branches) && data.branches.length
          ? data.branches
          : [{ name: "main", head: null, isDefault: true, commitCount: 0 }];
        const fallback = data.defaultBranch
          || loaded.find((branch) => branch.isDefault)?.name
          || "main";
        const requested = initialBranch.current;
        const initial = loaded.some((branch) => branch.name === requested) ? requested : fallback;
        setBranches(loaded);
        setBranchRepositoryId(id);
        setDefaultBranch(fallback);
        setSelectedBranch(initial);
        setBranchListState({ loading: false, error: "" });
      } catch (error) {
        if (error.name !== "AbortError") {
          if (requestId !== branchRequestId.current) return;
          const fallback = [{ name: "main", head: null, isDefault: true, commitCount: 0 }];
          setBranches(fallback);
          setBranchRepositoryId(id);
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
    const snapshotRequest = ++snapshotRequestId.current;
    const historyRequest = ++historyRequestId.current;
    const cacheKey = `${id}:${selectedBranch}`;
    const branchChanged = activeBranchKey.current !== cacheKey;
    activeBranchKey.current = cacheKey;
    const cachedSnapshot = snapshotCache.current.get(cacheKey);
    const cachedHistory = historyCache.current.get(cacheKey);
    const preserveLoadedSnapshot = !branchChanged && snapshotStateRef.current?.key === cacheKey && !snapshotStateRef.current.loading;
    const preserveLoadedHistory = !branchChanged && historyStateRef.current?.key === cacheKey && !historyStateRef.current.loading;
    let pendingRequests = Number(!cachedSnapshot) + Number(!cachedHistory);
    const finishRefresh = () => {
      pendingRequests -= 1;
      if (pendingRequests === 0 && snapshotRequest === snapshotRequestId.current && historyRequest === historyRequestId.current) setRefreshing(false);
    };
    const loadBranch = async () => {
      await Promise.resolve();
      if (branchChanged) setRefreshing(false);
      setSearchParamsRef.current((current) => {
        const next = new URLSearchParams(current);
        next.set("branch", selectedBranch);
        if (branchChanged && !pendingSelectedPath.current) next.delete("path");
        return next;
      }, { replace: true });
      if (cachedSnapshot) setSnapshotState({ key: cacheKey, loading: false, files: cachedSnapshot.files, state: cachedSnapshot.state, error: "" });
      else if (!preserveLoadedSnapshot) setSnapshotState({ key: cacheKey, loading: true, files: [], state: null, error: "" });
      if (cachedHistory) setHistoryState({ key: cacheKey, loading: false, commits: cachedHistory, error: "" });
      else if (!preserveLoadedHistory) setHistoryState({ key: cacheKey, loading: true, commits: [], error: "" });
      if (pendingRequests === 0) setRefreshing(false);

      if (!cachedSnapshot) {
        fetch(`${API_BASE}/repo/${id}/branches/${encodeURIComponent(selectedBranch)}/snapshot`, { headers: authHeaders(), signal: controller.signal })
        .then((response) => requestData(response, "Unable to load branch files"))
        .then((data) => {
          if (snapshotRequest !== snapshotRequestId.current) return;
          const files = Array.isArray(data.files) ? data.files : [];
          const state = data?.state || null;
          snapshotCache.current.set(cacheKey, { files, state });
          setSnapshotState({ key: cacheKey, loading: false, files, state, error: "" });
          if (pendingSelectedPath.current && files.some((file) => file.path === pendingSelectedPath.current)) {
            const filePath = pendingSelectedPath.current;
            pendingSelectedPath.current = "";
            setSearchParamsRef.current((current) => {
              const next = new URLSearchParams(current);
              next.set("branch", selectedBranch);
              next.set("path", filePath);
              return next;
            }, { replace: true });
          }
        })
        .catch((error) => { if (error.name !== "AbortError" && snapshotRequest === snapshotRequestId.current && !preserveLoadedSnapshot) setSnapshotState({ key: cacheKey, loading: false, files: [], state: null, error: error.message }); })
        .finally(finishRefresh);
      }
      if (!cachedHistory) {
        fetch(`${API_BASE}/repo/${id}/branches/${encodeURIComponent(selectedBranch)}/history`, { headers: authHeaders(), signal: controller.signal })
        .then((response) => requestData(response, "Unable to load branch history"))
        .then((data) => {
          if (historyRequest !== historyRequestId.current) return;
          const commits = Array.isArray(data.commits) ? data.commits : [];
          historyCache.current.set(cacheKey, commits);
          setHistoryState({ key: cacheKey, loading: false, commits, error: "" });
          setBranches((current) => current.map((branch) => branch.name === selectedBranch ? { ...branch, commitCount: commits.length } : branch));
        })
        .catch((error) => { if (error.name !== "AbortError" && historyRequest === historyRequestId.current && !preserveLoadedHistory) setHistoryState({ key: cacheKey, loading: false, commits: [], error: error.message }); })
        .finally(finishRefresh);
      }
    };
    loadBranch();
    return () => controller.abort();
  }, [id, invalidRepositoryId, reloadVersion, selectedBranch]);

  const refreshSelectedBranch = useCallback(() => {
    const cacheKey = `${id}:${selectedBranch}`;
    snapshotCache.current.delete(cacheKey);
    historyCache.current.delete(cacheKey);
    setRefreshing(true);
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

  const handleAddFiles = async (files = selectedFiles) => {
    if (!files.length) { window.alert("Please select files first."); return; }
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
      formData.append("paths", file.webkitRelativePath || file.name);
    });
    formData.append("branch", selectedBranch || defaultBranch);
    try {
      const response = await fetch(`${API_BASE}/repo/add/${id}`, { method: "POST", body: formData, headers: authHeaders() });
      const data = await requestData(response, "Failed to add files");
      window.alert(data.message);
      setSelectedFiles([]);
      setPendingCommit(true);
      setSyncState((current) => ({ ...current, key: `${id}:${selectedBranch}`, hasStagedChanges: true }));
      fetchRepo();
      refreshSelectedBranch();
    } catch (error) { window.alert(error.message); }
  };
  const handleUploadSelection = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    event.target.value = "";
    if (files.length) handleAddFiles(files);
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
      setPendingCommit(false);
      const status = data.status || data.commit || {};
      setSyncState((current) => ({
        ...current,
        key: `${id}:${selectedBranch}`,
        localHead: status.localHead || status.hash || current.localHead,
        remoteHead: status.remoteHead ?? current.remoteHead,
        aheadCount: Number(status.aheadCount ?? Math.max(1, current.aheadCount + 1)),
        behindCount: Number(status.behindCount ?? current.behindCount),
        hasStagedChanges: false,
        hasUnpushedCommits: true,
      }));
      refreshSelectedBranch();
      fetchRepo();
    } catch (error) { window.alert(error.message); }
    finally { setCommitting(false); }
  };

  const createStarterFile = async (starterType, content) => {
    const response = await authenticatedFetch(`${API_BASE}/repo/${id}/file-editor`, {
      method: "POST",
      body: JSON.stringify({ starterType, content, branch: selectedBranch || defaultBranch, commitMessage: "Initial commit" }),
    });
    const data = await parseResponse(response);
    if (!response.ok) throw new Error(getResponseError(data, "Unable to create starter file"));
    const filePath = data?.file?.path;
    pendingSelectedPath.current = filePath || "";
    if (filePath) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("branch", selectedBranch || defaultBranch);
        next.set("path", filePath);
        return next;
      }, { replace: true });
    }
    if (data?.state) {
      setBranches((current) => current.map((branch) => branch.name === (selectedBranch || defaultBranch)
        ? { ...branch, state: data.state, commitCount: data.state.commitCount }
        : branch));
    }
    await fetchRepo();
    refreshSelectedBranch();
    return data;
  };

  const runRepositoryAction = async (action, successMessage) => {
    setSyncAction(action);
    try {
      const branchAware = action === "push";
      const response = await fetch(`${API_BASE}/repo/${action}/${id}`, {
        method: "POST",
        headers: branchAware ? { "Content-Type": "application/json", ...authHeaders() } : authHeaders(),
        ...(branchAware ? { body: JSON.stringify({ branch: selectedBranch || defaultBranch }) } : {}),
      });
      const data = await requestData(response, `${action} failed`);
      window.alert(data.message || successMessage);
      if (action === "push") setSyncState((current) => ({
        ...current,
        localHead: data.localHead || current.localHead,
        remoteHead: data.remoteHead || data.localHead || current.localHead,
        aheadCount: 0,
        hasUnpushedCommits: false,
      }));
      refreshSelectedBranch();
      fetchRepo();
    } catch (error) { window.alert(error.message); }
    finally { setSyncAction(""); }
  };

  if (invalidRepositoryId) return <><Navbar /><main className="repo-page-state error">Repository not found</main></>;
  if (repoState.loading || (repo && String(repo._id) !== String(id))) return <><Navbar /><main className="repo-page-state loading" role="status">Loading repository...</main></>;
  if (repoState.error || !repo) return <><Navbar /><main className="repo-page-state error" role="alert">{repoState.error || "Repository not found"}</main></>;

  const selectedMetadata = currentBranches.find((branch) => branch.name === selectedBranch);
  const defaultProtection = currentBranches.find((branch) => branch.name === defaultBranch)?.protection
    || (selectedBranch === defaultBranch ? selectedProtection : { protected: false });
  const contentKey = `${id}:${selectedBranch}`;
  const contentLoading = branchListState.loading || branchRepositoryId !== id || !selectedBranch
    || snapshotState.key !== contentKey || historyState.key !== contentKey || snapshotState.loading || historyState.loading;
  const contentError = !contentLoading && (snapshotState.error
    ? `Files for ${selectedBranch} could not be loaded: ${snapshotState.error}`
    : historyState.error ? `History for ${selectedBranch} could not be loaded: ${historyState.error}` : "");
  const branchCommitCount = historyState.key !== contentKey || historyState.loading
    ? (selectedMetadata?.commitCount || 0)
    : historyState.commits.length;
  const onDefaultBranch = selectedBranch === defaultBranch;
  const emptyBranch = !contentLoading && !contentError && snapshotState.files.length === 0;
  const hasPendingChanges = pendingCommit || syncState.hasStagedChanges || Boolean(snapshotState.state?.hasUncommittedChanges || snapshotState.state?.hasStagedChanges);
  const hasUnpushedCommits = syncState.aheadCount > 0 || syncState.hasUnpushedCommits;
  const hasRemoteChanges = syncState.behindCount > 0 || syncState.hasRemoteChanges;
  const showSyncActions = canWriteContent && (hasPendingChanges || hasUnpushedCommits || hasRemoteChanges);
  const settingsPath = canManageCollaborators ? `/repo/${id}/settings/collaborators` : `/repo/${id}/settings/branches`;

  return (
    <div className="repo-page">
      <Navbar />
      <main className="repo-container">
        <RepoHeader repository={repo} protectedBranch={selectedProtection?.protected ? selectedBranch : ""}>
          <MentorRequestButton repositoryId={id} />
          <RepositorySocialActions repository={repo} onForked={(repositoryId) => navigate(`/repo/${repositoryId}`)} />
          <RepositoryCodeMenu repository={repo} defaultBranch={defaultBranch} protection={defaultProtection} role={repo.currentUserRole} />
          {canUploadFiles && <AddFileMenu onCreate={() => createStarterFile("readme", `# ${repo.name}\n`)} onUploadFiles={() => fileInputRef.current?.click()} onUploadFolder={() => folderInputRef.current?.click()} />}
        </RepoHeader>
        <input ref={fileInputRef} className="sr-only" type="file" multiple onChange={handleUploadSelection} aria-label="Choose files to upload" />
        <input ref={folderInputRef} className="sr-only" type="file" multiple onChange={handleUploadSelection} aria-label="Choose project folder to upload" />
        {repo.forkedFrom && <p className="repo-fork-source">forked from <Link to={`/repo/${repo.forkedFrom._id}`}>{repo.forkedFrom.owner?.username ? `${repo.forkedFrom.owner.username} / ` : ""}{repo.forkedFrom.name || "Deleted repository"}</Link></p>}

        <RepoTabs repositoryId={id} pathname={location.pathname} counts={navigationCounts} settingsPath={(canManageCollaborators || canManageBranchProtection) ? settingsPath : ""} />
        {repoWarning && <p className="error">{repoWarning}</p>}

        <BranchToolbar
          branches={currentBranches}
          selectedBranch={selectedBranch}
          defaultBranch={defaultBranch}
          commitCount={branchCommitCount}
          loading={branchListState.loading || branchRepositoryId !== id}
          error={branchListState.error}
          canManageBranches={canManageBranches}
          isAuthenticated={isAuthenticated}
          message={branchMessage}
          protection={selectedProtection}
          files={visibleFiles}
          onSelect={(branch) => { setBranchMessage(""); setSelectedBranch(branch); }}
          onGoToFile={(filePath) => setSearchParams((current) => { const next = new URLSearchParams(current); next.set("branch", selectedBranch); next.set("path", filePath); return next; }, { replace: true })}
          onHistory={historyState.commits.length ? () => historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) : undefined}
          onCreate={createBranch}
          onDelete={deleteBranch}
          onCompare={openCompare}
        />

        {refreshing && <span className="sr-only" role="status">Refreshing repository content</span>}
        <RepoContent loading={contentLoading} error={contentError} empty={emptyBranch} onRetry={refreshSelectedBranch} emptyContent={<EmptyRepositorySetupPanel repository={repo} />}>
          {showSyncActions && <div className="commit-section">
            {hasPendingChanges && <>
              <input type="text" placeholder={`Commit message for ${selectedBranch || defaultBranch}`} value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} className="commit-input" />
              <button type="button" onClick={handleCommit} className="push-btn" disabled={committing || !commitMessage.trim() || !hasPendingChanges}>{committing ? "Committing..." : "Commit"}</button>
            </>}
            {hasUnpushedCommits && <button type="button" onClick={() => runRepositoryAction("push", "Push successful!")} className="repo-secondary-button" disabled={syncAction === "push"}>{syncAction === "push" ? "Pushing..." : `Push${syncState.aheadCount > 0 ? ` (${syncState.aheadCount})` : ""}`}</button>}
            {hasRemoteChanges && <button type="button" onClick={() => runRepositoryAction("pull", "Pull successful!")} className="repo-secondary-button" disabled={syncAction === "pull"}>{syncAction === "pull" ? "Pulling..." : `Pull${syncState.behindCount > 0 ? ` (${syncState.behindCount})` : ""}`}</button>}
          </div>}
          <RepositoryBrowser
          repositoryId={id}
          repositoryName={repo.name}
          repository={repo}
          files={visibleFiles}
          branch={selectedBranch}
          latestCommit={historyState.commits[0] || null}
          loading={snapshotState.loading}
          setupState={{ loading: snapshotState.loading, error: snapshotState.error, isEmpty: false }}
          emptyMessage="This branch has no files"
          onRename={onDefaultBranch && canWriteContent && (permissions.canRenameFiles ?? isRepositoryOwner) ? renameFile : undefined}
          onDelete={onDefaultBranch && canWriteContent && (permissions.canDeleteFiles ?? isRepositoryOwner) ? deleteFile : undefined}
          requestedPath={searchParams.get("path") || ""}
          onEdit={canWriteContent ? (filePath) => {
            const file = visibleFiles.find((item) => item.path === filePath);
            if (!isBrowserEditableFile(filePath, file?.size)) return;
            navigate(`/repo/${id}/edit?branch=${encodeURIComponent(selectedBranch || defaultBranch)}&path=${encodeURIComponent(filePath)}`);
          } : undefined}
          />
          <div ref={historySectionRef}><CommitHistory repositoryId={id} branch={selectedBranch} commits={historyState.commits} emptyText="No commits on this branch yet" /></div>
        </RepoContent>
      </main>
    </div>
  );
};

export default RepoPage;
