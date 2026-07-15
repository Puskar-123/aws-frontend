import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildCloneCommand, buildInitCommand, buildInstallCommand } from "../../utils/cliCommands";

const CopyCommand = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return <div className="repo-code-command"><code>{value}</code><button type="button" onClick={copy} aria-label={`Copy ${label}`}>{copied ? "Copied" : "Copy"}</button></div>;
};

const RepositoryCodeMenu = ({ repository, defaultBranch, protection, role }) => {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const owner = repository?.owner?.username || "owner";
  const repositoryName = repository?.name || "repository";
  const roleLabel = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : "Public visitor";
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll("button,a[href]")];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus?.(); };
  }, [open]);

  return <div className="repo-code-menu-wrap">
    <button type="button" className="repo-code-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>Code</button>
    {open && <div className="repo-code-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} className="repo-code-dialog" role="dialog" aria-modal="true" aria-labelledby="repo-code-title">
        <header><div><h2 id="repo-code-title">ContalSystem CLI</h2><p>Clone or connect this repository from your terminal.</p></div><button type="button" className="repo-code-close" aria-label="Close Code menu" onClick={() => setOpen(false)}>×</button></header>
        <dl className="repo-code-meta"><div><dt>Default branch</dt><dd>{defaultBranch}</dd></div><div><dt>Protection</dt><dd>{protection?.protected ? "Protected" : "Not protected"}</dd></div><div><dt>Your role</dt><dd>{roleLabel}</dd></div></dl>
        <h3>Install</h3><CopyCommand label="install command" value={buildInstallCommand()} />
        <h3>Clone with ContalSystem CLI</h3><CopyCommand label="clone command" value={buildCloneCommand(owner, repositoryName)} />
        <h3>Upload an existing project</h3>
        <CopyCommand label="initialization command" value={buildInitCommand(owner, repositoryName)} />
        <CopyCommand label="add command" value="codehub add ." />
        <CopyCommand label="commit command" value={'codehub commit -m "Initial commit"'} />
        <CopyCommand label="push command" value="codehub push" />
        <p className="repo-code-help"><Link to="/docs/cli" onClick={() => setOpen(false)}>Read the ContalSystem CLI guide</Link></p>
      </section>
    </div>}
  </div>;
};

export default RepositoryCodeMenu;
