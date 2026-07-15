import React from "react";
import { FiTerminal } from "react-icons/fi";
import { Link } from "react-router-dom";

const GettingStarted = () => (
  <section className="dashboard-panel dashboard-getting-started" id="getting-started" aria-labelledby="getting-started-heading">
    <div className="dashboard-panel__heading">
      <FiTerminal aria-hidden="true" />
      <h2 id="getting-started-heading">Getting started</h2>
    </div>
    <ol className="dashboard-cli-steps">
      <li><span>Install the CodeHub CLI</span><pre><code>npm install -g codehub-sbs-cli</code></pre></li>
      <li><span>Sign in to CodeHub</span><pre><code>codehub login</code></pre></li>
      <li><span>Clone a repository or connect an existing project</span><pre><code>{`codehub clone Owner/Repository\ncd Repository`}</code></pre></li>
      <li><span>Create a branch, commit, and push changes</span><pre><code>{`codehub branch feature/my-change\ncodehub checkout feature/my-change\ncodehub add .\ncodehub commit -m "My changes"\ncodehub push`}</code></pre></li>
    </ol>
    <details className="dashboard-cli-existing"><summary>Connect an existing project</summary><pre><code>{`codehub init Owner/Repository\ncodehub add .\ncodehub commit -m "Initial commit"\ncodehub push`}</code></pre></details>
    <Link className="dashboard-cli-docs-link" to="/docs/cli">View full CLI documentation <span aria-hidden="true">→</span></Link>
  </section>
);

export default GettingStarted;
