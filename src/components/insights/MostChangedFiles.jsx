import React from "react";
const MostChangedFiles = ({ data }) => <section className="insights-panel"><h2>Most changed files</h2>{!data?.files?.length ? <p className="insights-empty">Changed-file analytics are not available in this range.</p> : <ol className="changed-files">{data.files.map((file) => <li key={file.path}><code>{file.path}</code><strong>{file.changes} changes</strong><time dateTime={file.lastChangedAt}>{file.lastChangedAt ? new Date(file.lastChangedAt).toLocaleDateString() : "Unknown"}</time></li>)}</ol>}</section>;
export default MostChangedFiles;
