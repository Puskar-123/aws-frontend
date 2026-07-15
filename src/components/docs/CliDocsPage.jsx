import React from "react";
import Navbar from "../Navbar";
import { Link } from "react-router-dom";
import "./cli-docs.css";

const Command = ({ children }) => <pre><code>{children}</code></pre>;
const CliDocsPage = () => <div className="cli-docs-page"><Navbar /><main className="cli-docs">
  <header><p>CodeHub documentation</p><h1>CodeHub CLI</h1><p>Clone repositories, create branches, commit locally, and push through the same permissions and branch protections as the web application.</p></header>
  <nav className="cli-docs-return" aria-label="CLI documentation navigation"><Link to="/dashboard">← Return to Dashboard</Link></nav>
  <section><h2>Install</h2><Command>npm install -g codehub-sbs-cli</Command><p>Node.js 18 or newer is required.</p></section>
  <section><h2>Sign in</h2><Command>{"codehub login\ncodehub whoami"}</Command><p>The password is hidden while typing. Your access token is stored in the operating system application-data folder, never in a repository.</p></section>
  <section><h2>Clone a repository</h2><Command>{"codehub clone https://codehub.sbs/Puskar/project-name\ncd project-name\ncodehub status"}</Command></section>
  <section><h2>Connect an existing project</h2><Command>{"codehub init https://codehub.sbs/Puskar/project-name\ncodehub add .\ncodehub commit -m \"Initial commit\"\ncodehub push"}</Command></section>
  <section><h2>Command reference</h2><dl className="cli-command-reference">
    <div><dt><code>codehub status</code></dt><dd>Show the active branch, staged changes, working-tree changes, and remote state.</dd></div>
    <div><dt><code>codehub add .</code></dt><dd>Stage a file, directory, or all eligible changes.</dd></div>
    <div><dt><code>codehub reset [path]</code></dt><dd>Unstage one path or all staged changes.</dd></div>
    <div><dt><code>codehub commit -m "Message"</code></dt><dd>Create an immutable local commit.</dd></div>
    <div><dt><code>codehub history</code></dt><dd>Show local and remote history; <code>log</code> is an alias.</dd></div>
    <div><dt><code>codehub branch [name]</code></dt><dd>List, create, or delete local branches.</dd></div>
    <div><dt><code>codehub checkout &lt;name&gt;</code></dt><dd>Switch safely; use <code>-b</code> to create the branch.</dd></div>
    <div><dt><code>codehub merge [source]</code></dt><dd>Merge a local branch or abort an unfinished merge.</dd></div>
    <div><dt><code>codehub push</code></dt><dd>Upload commits through server authorization and branch protection.</dd></div>
    <div><dt><code>codehub pull</code></dt><dd>Safely update the current branch and working tree.</dd></div>
    <div><dt><code>codehub fetch</code></dt><dd>Refresh remote references without changing files.</dd></div>
    <div><dt><code>codehub remote -v</code></dt><dd>Show or change the configured origin.</dd></div>
    <div><dt><code>codehub config --list</code></dt><dd>Read or update safe global configuration.</dd></div>
  </dl></section>
  <section><h2>Permissions and branch protection</h2><Command>{"codehub branch feature/my-change\ncodehub checkout feature/my-change\ncodehub add .\ncodehub commit -m \"My change\"\ncodehub push"}</Command><p>After pushing, open the pull-request link printed by the CLI. Read collaborators may clone and pull, while write, maintainer, and owner roles can push where protection rules allow.</p></section>
  <section><h2>Synchronize safely</h2><Command>{"codehub fetch\ncodehub pull\ncodehub history --oneline"}</Command><p>Pull refuses to overwrite a dirty working tree or unpushed local commits. A remote-head conflict must be resolved before pushing again.</p></section>
  <section><h2>Common errors</h2><dl><div><dt>Authentication required</dt><dd>Run <code>codehub login</code>.</dd></div><div><dt>Branch protected</dt><dd>Create a feature branch and open a pull request.</dd></div><div><dt>Remote changed</dt><dd>Run <code>codehub fetch</code> and <code>codehub pull</code>, then reconcile your changes.</dd></div><div><dt>Protected file</dt><dd>Remove credentials such as .env, PEM, key, or service-account files before staging.</dd></div></dl></section>
  <section><h2>Sign out</h2><Command>codehub logout</Command></section>
  <footer className="cli-docs-footer"><Link to="/dashboard">Return to Dashboard</Link></footer>
</main></div>;

export default CliDocsPage;
