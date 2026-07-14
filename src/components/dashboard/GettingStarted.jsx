import React from "react";
import { FiTerminal } from "react-icons/fi";

const GettingStarted = () => (
  <section className="dashboard-panel dashboard-getting-started" id="getting-started" aria-labelledby="getting-started-heading">
    <div className="dashboard-panel__heading">
      <FiTerminal aria-hidden="true" />
      <h2 id="getting-started-heading">Getting started</h2>
    </div>
    <ol>
      <li>Install the CodeHub CLI</li>
      <li>Initialize a repository</li>
      <li>Add and commit your files</li>
      <li>Push your changes to CodeHub</li>
    </ol>
    <pre aria-label="CodeHub CLI commands"><code>{`codehub init --repo <repository-id>\ncodehub add .\ncodehub commit -m "Initial commit"\ncodehub push`}</code></pre>
  </section>
);

export default GettingStarted;
