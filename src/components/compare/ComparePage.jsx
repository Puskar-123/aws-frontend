import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getResponseError, parseResponse } from "../../utils/api";
import Navbar from "../Navbar";
import CompareBranchSelectors from "./CompareBranchSelectors";
import CompareCommits from "./CompareCommits";
import CompareFiles from "./CompareFiles";
import CompareHeader from "./CompareHeader";
import CompareSummary from "./CompareSummary";
import CompareTabs from "./CompareTabs";
import "./compare.css";

const API_BASE = "https://api.codehub.sbs";
const authHeaders = () => { const token = localStorage.getItem("token"); return token ? { Authorization: `Bearer ${token}` } : {}; };
const readData = async (response, fallback) => { const data = await parseResponse(response); if (!response.ok) throw new Error(getResponseError(data, fallback)); return data; };

const ComparePage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParams = useRef({ base: searchParams.get("base") || "", compare: searchParams.get("compare") || "" });
  const cache = useRef(new Map());
  const [branches, setBranches] = useState([]);
  const [base, setBase] = useState("");
  const [compare, setCompare] = useState("");
  const [branchState, setBranchState] = useState({ loading: true, error: "" });
  const [compareState, setCompareState] = useState({ loading: false, data: null, error: "" });
  const [activeTab, setActiveTab] = useState("commits");
  const [pullRequestMessage, setPullRequestMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/repo/${id}/branches`, { headers: authHeaders(), signal: controller.signal });
        const data = await readData(response, "Unable to load branches");
        const list = data.branches || [];
        const fallbackBase = data.defaultBranch || list.find((branch) => branch.isDefault)?.name || "main";
        const selectedBase = list.some((branch) => branch.name === initialParams.current.base) ? initialParams.current.base : fallbackBase;
        const selectedCompare = list.some((branch) => branch.name === initialParams.current.compare && branch.name !== selectedBase)
          ? initialParams.current.compare
          : list.find((branch) => branch.name !== selectedBase)?.name || "";
        setBranches(list); setBase(selectedBase); setCompare(selectedCompare); setBranchState({ loading: false, error: "" });
      } catch (error) { if (error.name !== "AbortError") setBranchState({ loading: false, error: error.message }); }
    };
    load();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!base || !compare || base === compare) return undefined;
    const controller = new AbortController();
    const key = `${base}...${compare}`;
    const cached = cache.current.get(key);
    const load = async () => {
      await Promise.resolve();
      setSearchParams({ base, compare }, { replace: true });
      setPullRequestMessage("");
      if (cached) { setCompareState({ loading: false, data: cached, error: "" }); return; }
      setCompareState({ loading: true, data: null, error: "" });
      try {
        const response = await fetch(`${API_BASE}/repo/${id}/compare?base=${encodeURIComponent(base)}&compare=${encodeURIComponent(compare)}`, { headers: authHeaders(), signal: controller.signal });
        const data = await readData(response, "Unable to compare branches");
        cache.current.set(key, data); setCompareState({ loading: false, data, error: "" });
      } catch (error) { if (error.name !== "AbortError") setCompareState({ loading: false, data: null, error: error.message }); }
    };
    load();
    return () => controller.abort();
  }, [base, compare, id, setSearchParams]);

  const chooseBase = (name) => { setBase(name); if (name === compare) setCompare(branches.find((branch) => branch.name !== name)?.name || ""); };
  const chooseCompare = (name) => { setCompare(name); if (name === base) setBase(branches.find((branch) => branch.name !== name)?.name || ""); };
  const swap = () => { setBase(compare); setCompare(base); };
  const data = compareState.data;
  const canCreatePullRequest = Boolean(data && base !== compare && data.summary.filesChanged > 0);

  return (
    <div className="compare-page"><Navbar /><main className="compare-container">
      <CompareHeader repositoryName={data?.repository?.name} />
      {branchState.loading && <div className="compare-state" role="status">Loading branches...</div>}
      {branchState.error && <div className="compare-state compare-state--error" role="alert">{branchState.error}</div>}
      {!branchState.loading && !branchState.error && branches.length < 2 && <div className="compare-state">Create another branch to compare changes.</div>}
      {branches.length >= 2 && <CompareBranchSelectors branches={branches} base={base} compare={compare} onBase={chooseBase} onCompare={chooseCompare} onSwap={swap} canCreatePullRequest={canCreatePullRequest} onCreatePullRequest={() => setPullRequestMessage("Pull Requests are the next feature.")} />}
      {pullRequestMessage && <div className="compare-pr-message" role="status">{pullRequestMessage}</div>}
      {compareState.loading && <div className="compare-state" role="status">Comparing branches...</div>}
      {compareState.error && <div className="compare-state compare-state--error" role="alert">{compareState.error}</div>}
      {data && <><CompareSummary comparison={data} /><CompareTabs active={activeTab} onChange={setActiveTab} commitCount={data.commits.length} fileCount={data.files.length} />
        <div role="tabpanel">{activeTab === "commits" ? <CompareCommits commits={data.commits} /> : <CompareFiles files={data.files} summary={data.summary} repositoryId={id} base={base} compare={compare} />}</div></>}
    </main></div>
  );
};

export default ComparePage;
