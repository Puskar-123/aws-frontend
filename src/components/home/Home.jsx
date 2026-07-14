import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../authContext";
import "./home.css";

const features = [
  ["Repository management", "Host projects, browse files, and keep every change organized."],
  ["Branch workflows", "Create isolated branches and compare work before it reaches main."],
  ["Pull requests", "Review commits, discuss changes, and merge with confidence."],
  ["Issue tracking", "Plan work with priorities, labels, assignees, and discussions."],
  ["Commit history", "Follow branch-aware history and inspect how your code evolved."],
  ["Secure file preview", "Preview common formats while protected files remain inaccessible."],
];

const Home = () => {
  const { isAuthenticated, isLoading } = useAuth();
  return <div className="public-home">
    <header className="home-nav"><Link className="home-brand" to="/">CodeHub</Link><nav aria-label="Public navigation"><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#cli">CLI</a>{isAuthenticated ? <><Link to="/dashboard">Dashboard</Link><Link className="home-nav-primary" to="/profile">Profile</Link></> : <><Link to="/login">Sign in</Link><Link className="home-nav-primary" to="/signup">Get started</Link></>}</nav></header>
    <main>
      <section className="home-hero"><div className="home-hero-copy"><p className="home-eyebrow">A complete developer workflow</p><h1>Build, collaborate, and ship code with CodeHub</h1><p className="home-lead">A modern version-control platform for repositories, branches, pull requests, issues, and team collaboration.</p><div className="home-actions">{isAuthenticated ? <Link className="home-button home-button--primary" to="/dashboard">Open dashboard</Link> : <><Link className="home-button home-button--primary" to="/signup">Get started</Link><Link className="home-button" to="/login">Sign in</Link></>}</div>{isLoading && <span className="home-auth-status" role="status">Checking session...</span>}</div>
        <div className="home-terminal" id="cli" aria-label="CodeHub CLI example"><div><span /><span /><span /></div><pre><code><b>$</b> codehub init --repo &lt;id&gt;{"\n"}<b>$</b> codehub add .{"\n"}<b>$</b> codehub commit -m "First commit"{"\n"}<b>$</b> codehub push</code></pre><p>Everything is ready to collaborate.</p></div>
      </section>
      <section className="home-highlights" aria-label="Platform highlights">{["Repository hosting", "Branch comparisons", "Pull requests", "Issue tracking"].map((item) => <div key={item}><strong>✓</strong><span>{item}</span></div>)}</section>
      <section className="home-section" id="features"><div className="home-section-heading"><p>Everything in one place</p><h2>Tools that keep your project moving</h2></div><div className="home-feature-grid">{features.map(([title, text], index) => <article key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="home-section home-workflow" id="workflow"><div className="home-section-heading"><p>From idea to merge</p><h2>A straightforward workflow</h2></div><ol>{["Create a repository", "Upload or push code", "Create a branch", "Open a pull request", "Track issues"].map((step, index) => <li key={step}><span>{index + 1}</span><strong>{step}</strong></li>)}</ol></section>
    </main>
    <footer className="home-footer"><strong>CodeHub</strong><p>Built with React, Node.js, Express, MongoDB, and AWS.</p></footer>
  </div>;
};

export default Home;
