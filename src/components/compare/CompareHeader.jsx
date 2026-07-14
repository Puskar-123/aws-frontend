import React from "react";

const CompareHeader = ({ repositoryName }) => (
  <header className="compare-header">
    <p className="compare-repository">CodeHub / <strong>{repositoryName || "Repository"}</strong></p>
    <h1>Compare changes</h1>
    <p>Choose two branches to see what changed.</p>
  </header>
);

export default CompareHeader;
