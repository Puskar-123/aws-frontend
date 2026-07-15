import React from "react";
import { FiTerminal } from "react-icons/fi";
import { Link } from "react-router-dom";
import { buildCloneCommand, buildInstallCommand, buildLoginCommand, buildProtectedBranchCommands } from "../../utils/cliCommands";

const GettingStarted = () => (
  <section className="dashboard-panel dashboard-getting-started" id="getting-started" aria-labelledby="getting-started-heading">
    <div className="dashboard-panel__heading">
      <FiTerminal aria-hidden="true" />
      <h2 id="getting-started-heading">Getting started</h2>
    </div>
    <ol className="dashboard-cli-steps">
      <li><span>Install the ContalSystem CLI</span><pre><code>{buildInstallCommand()}</code></pre></li>
      <li><span>Sign in to ContalSystem</span><pre><code>{buildLoginCommand()}</code></pre></li>
      <li><span>Clone a repository or connect an existing project</span><pre><code>{`${buildCloneCommand("Owner", "Repository")}\ncd Repository`}</code></pre></li>
      <li><span>Create a branch, commit, and push changes</span><pre><code>{buildProtectedBranchCommands("feature/my-change").replace("Initial project setup", "My changes")}</code></pre></li>
    </ol>
    <details className="dashboard-cli-existing"><summary>Connect an existing project</summary><pre><code>{`codehub init Owner/Repository\ncodehub add .\ncodehub commit -m "Initial commit"\ncodehub push`}</code></pre></details>
    <Link className="dashboard-cli-docs-link" to="/docs/cli">View full CLI documentation <span aria-hidden="true">→</span></Link>
  </section>
);

export default GettingStarted;
