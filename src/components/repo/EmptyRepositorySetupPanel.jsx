import React, { useState } from "react";
import { Link } from "react-router-dom";
import { buildCloneCommand, buildExistingProjectCommands, buildInstallCommand, buildLoginCommand } from "../../utils/cliCommands";
import "./emptyRepositorySetup.css";

const CopyCommand = ({ label, value }) => {
  const [message, setMessage] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setMessage("Copied"); }
    catch { setMessage("Unable to copy. Select the command manually."); }
    window.setTimeout(() => setMessage(""), 1800);
  };
  return <div className="empty-setup-command"><code>{value}</code><button type="button" onClick={copy} aria-label={`Copy ${label}`}>{message === "Copied" ? "Copied" : "Copy"}</button><span className="empty-setup-copy-status" aria-live="polite">{message}</span></div>;
};

const EmptyRepositorySetupPanel = ({ repository, selectedBranch, canCreateContent, canDirectWrite, onUploadFiles, onUploadFolder, onCreateFile }) => {
  const [expanded, setExpanded] = useState(false);
  const owner = repository?.owner?.username || repository?.ownerName || "";
  const name = repository?.name || "";
  return <section className="empty-setup" aria-labelledby="empty-setup-title">
    <header><h2 id="empty-setup-title">Quick setup</h2><p>This branch does not contain any files yet.</p></header>
    {canCreateContent && canDirectWrite && <div className="empty-setup-actions" aria-label="Repository setup actions">
      <button type="button" onClick={onUploadFiles}>Upload files</button>
      <button type="button" onClick={onUploadFolder}>Upload folder</button>
      <button type="button" onClick={onCreateFile}>Create file</button>
    </div>}
    {canCreateContent && !canDirectWrite && <p className="empty-setup-protection" role="status">Direct changes are blocked on protected branch <strong>{selectedBranch}</strong>.</p>}
    <section className="empty-setup-cli" aria-labelledby="empty-cli-title"><h3 id="empty-cli-title">Or push an existing project using CodeHub CLI</h3>
      <CopyCommand label="CLI installation command" value={buildInstallCommand()} />
      <CopyCommand label="CLI login command" value={buildLoginCommand()} />
      {owner && name && <CopyCommand label="repository clone command" value={buildCloneCommand(owner, name)} />}
    </section>
    <button type="button" className="empty-setup-more-toggle" aria-expanded={expanded} aria-controls="empty-setup-more" onClick={() => setExpanded((value) => !value)}>More setup options <span aria-hidden="true">{expanded ? "▴" : "▾"}</span></button>
    {expanded && <div id="empty-setup-more" className="empty-setup-more"><CopyCommand label="existing project commands" value={buildExistingProjectCommands(owner, name)} /><Link to="/docs/cli">View full CLI documentation</Link></div>}
  </section>;
};

export default EmptyRepositorySetupPanel;
