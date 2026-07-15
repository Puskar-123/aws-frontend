import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildCloneCommand,
  buildCloneUrlCommand,
  buildExistingProjectCommands,
  buildInstallCommand,
  buildLoginCommand,
  buildNewProjectCommands,
  buildProtectedBranchCommands,
} from "../../utils/cliCommands";
import { GITIGNORE_TEMPLATES, LICENSE_TEMPLATES } from "../../utils/starterTemplates";
import "./emptyRepositorySetup.css";

const CopyCommand = ({ label, value }) => {
  const [message, setMessage] = useState("");
  const clearTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(clearTimer.current), []);
  const copy = async () => {
    window.clearTimeout(clearTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied");
      clearTimer.current = window.setTimeout(() => setMessage(""), 1500);
    } catch {
      setMessage("Unable to copy. Select the command manually.");
      clearTimer.current = window.setTimeout(() => setMessage(""), 4000);
    }
  };
  return <div className="empty-setup-command"><pre><code>{value}</code></pre><button type="button" onClick={copy} aria-label={`Copy ${label}`}>{message === "Copied" ? "Copied" : "Copy"}</button><span className="empty-setup-copy-status" aria-live="polite">{message}</span></div>;
};

const EmptyRepositorySetupPanel = ({
  repository,
  defaultBranch,
  selectedBranch,
  role,
  protection,
  canCreateContent,
  canDirectWrite,
  canInviteCollaborators,
  onUpload,
  onAddFiles,
  addFilesDisabled,
  onCreateStarter,
}) => {
  const owner = repository?.owner?.username || "Owner";
  const name = repository?.name || "Repository";
  const [expanded, setExpanded] = useState(false);
  const [platform, setPlatform] = useState("windows");
  const [gitignoreType, setGitignoreType] = useState("Node");
  const [gitignoreContent, setGitignoreContent] = useState(GITIGNORE_TEMPLATES.Node);
  const [licenseType, setLicenseType] = useState("MIT");
  const [holder, setHolder] = useState(owner);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const licenseContent = useMemo(() => LICENSE_TEMPLATES[licenseType](holder), [holder, licenseType]);
  const directBlocked = Boolean(canCreateContent && !canDirectWrite);

  const createStarter = async (starterType, content) => {
    setBusy(starterType); setNotice("");
    try {
      await onCreateStarter(starterType, content);
      setNotice(`${starterType === "readme" ? "README.md" : starterType === "gitignore" ? ".gitignore" : "LICENSE"} created.`);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  };

  const createLicense = () => {
    if (!window.confirm(`Create LICENSE using the ${licenseType} template?`)) return;
    createStarter("license", licenseContent);
  };

  return <section className="empty-setup" aria-labelledby="empty-setup-title">
    <header><p>Empty branch</p><h2 id="empty-setup-title">Quick setup</h2><span>Start this repository from the terminal or browser.</span></header>
    <dl className="empty-setup-meta">
      <div><dt>Repository</dt><dd>{owner}/{name}</dd></div><div><dt>Visibility</dt><dd>{repository?.visibility === "private" ? "Private" : "Public"}</dd></div>
      <div><dt>Default branch</dt><dd>{defaultBranch}</dd></div><div><dt>Selected branch</dt><dd>{selectedBranch}</dd></div>
      <div><dt>Your role</dt><dd>{role ? role[0].toUpperCase() + role.slice(1) : "Public visitor"}</dd></div><div><dt>Branch protection</dt><dd>{protection?.protected ? "Protected" : "Not protected"}</dd></div>
      <div><dt>Direct writes</dt><dd>{canDirectWrite ? "Allowed" : "Not allowed"}</dd></div>
    </dl>

    <div className="empty-setup-command-grid">
      <div><h3>Install CodeHub CLI</h3><CopyCommand label="CodeHub CLI installation command" value={buildInstallCommand()} /></div>
      <div><h3>Sign in</h3><CopyCommand label="CodeHub login command" value={buildLoginCommand()} /></div>
      <div><h3>Clone this repository</h3><CopyCommand label="owner and repository clone command" value={buildCloneCommand(owner, name)} /><CopyCommand label="repository URL clone command" value={buildCloneUrlCommand(owner, name)} /></div>
    </div>

    {directBlocked && <div className="empty-setup-protection" role="status"><strong>Direct changes are blocked on protected branch {selectedBranch}.</strong><p>Create a feature branch, push the initial setup, then open a pull request.</p><CopyCommand label="protected branch workflow" value={buildProtectedBranchCommands()} /></div>}

    {canCreateContent ? <section className="empty-setup-browser" aria-labelledby="browser-setup-title"><h3 id="browser-setup-title">Browser setup</h3><div className="empty-setup-actions"><button type="button" onClick={onUpload} disabled={!canDirectWrite}>Upload Project Folder</button><button type="button" onClick={onAddFiles} disabled={!canDirectWrite || addFilesDisabled}>Add Files</button><button type="button" onClick={() => createStarter("readme", `# ${name}\n`)} disabled={!canDirectWrite || busy}>Create README</button></div></section> : role ? null : <p className="empty-setup-signin"><Link to="/login">Sign in to contribute</Link></p>}

    <button type="button" className="empty-setup-more-toggle" aria-expanded={expanded} aria-controls="empty-setup-more" onClick={() => setExpanded((value) => !value)}>More setup options <span aria-hidden="true">{expanded ? "▴" : "▾"}</span></button>
    {expanded && <div id="empty-setup-more" className="empty-setup-more">
      <section><h3>Connect an existing project</h3><CopyCommand label="existing project commands" value={buildExistingProjectCommands(owner, name)} /></section>
      <section><h3>Create a new project</h3><div className="empty-setup-tabs" role="tablist" aria-label="Operating system"><button type="button" role="tab" aria-selected={platform === "windows"} onClick={() => setPlatform("windows")}>Windows</button><button type="button" role="tab" aria-selected={platform === "unix"} onClick={() => setPlatform("unix")}>macOS/Linux</button></div><CopyCommand label={`${platform === "windows" ? "Windows" : "macOS and Linux"} new project commands`} value={buildNewProjectCommands(owner, name, platform)} /></section>
      {canCreateContent && <section><h3>Starter files</h3><div className="empty-setup-starter-grid"><label>Gitignore template<select value={gitignoreType} onChange={(event) => { setGitignoreType(event.target.value); setGitignoreContent(GITIGNORE_TEMPLATES[event.target.value]); }}>{Object.keys(GITIGNORE_TEMPLATES).map((value) => <option key={value}>{value}</option>)}</select></label><label>Preview and edit .gitignore<textarea value={gitignoreContent} onChange={(event) => setGitignoreContent(event.target.value)} /></label><button type="button" onClick={() => createStarter("gitignore", gitignoreContent)} disabled={!canDirectWrite || busy}>Add .gitignore</button></div><div className="empty-setup-starter-grid"><label>License template<select value={licenseType} onChange={(event) => setLicenseType(event.target.value)}>{Object.keys(LICENSE_TEMPLATES).map((value) => <option key={value}>{value}</option>)}</select></label><label>Copyright holder<input value={holder} onChange={(event) => setHolder(event.target.value)} /></label><label>License preview<textarea value={licenseContent} readOnly /></label><p>Review the license text for your needs. CodeHub does not provide legal advice.</p><button type="button" onClick={createLicense} disabled={!canDirectWrite || busy}>Add LICENSE</button></div></section>}
      {canInviteCollaborators && <section><h3>Collaboration</h3><Link className="empty-setup-button-link" to={`/repo/${repository._id}/settings/collaborators`}>Invite collaborators</Link></section>}
    </div>}
    <p className="empty-setup-notice" aria-live="polite">{notice}</p>
    <Link className="empty-setup-docs" to="/docs/cli">View full CLI documentation <span aria-hidden="true">→</span></Link>
  </section>;
};

export default EmptyRepositorySetupPanel;
