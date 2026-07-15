import React, { useState } from "react";
import { buildEmptyExistingRepositoryCommands, buildEmptyNewRepositoryCommands } from "../../utils/cliCommands";
import "./emptyRepositorySetup.css";

const CommandSection = ({ heading, label, commands }) => {
  const [message, setMessage] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(commands); setMessage("Copied"); }
    catch { setMessage("Unable to copy. Select the command manually."); }
    window.setTimeout(() => setMessage(""), 1800);
  };
  return <section className="empty-repository-command-section">
    <h2 className="empty-repository-command-heading">{heading}</h2>
    <div className="empty-repository-command-block"><pre><code>{commands}</code></pre><button type="button" className="empty-repository-copy-button" onClick={copy} aria-label={`Copy ${label}`}>{message === "Copied" ? "Copied" : "Copy"}</button></div>
    <span className="empty-repository-copy-status" aria-live="polite">{message}</span>
  </section>;
};

const EmptyRepositorySetupPanel = ({ repository }) => {
  const owner = repository?.owner?.username || repository?.ownerName || "";
  const name = repository?.name || "";
  return <section className="empty-repository-commands" aria-label="Empty repository command-line setup">
    <CommandSection heading="…or create a new repository from the command line" label="new repository commands" commands={buildEmptyNewRepositoryCommands(owner, name)} />
    <CommandSection heading="…or push an existing repository from the command line" label="existing repository commands" commands={buildEmptyExistingRepositoryCommands(owner, name)} />
  </section>;
};

export default EmptyRepositorySetupPanel;
