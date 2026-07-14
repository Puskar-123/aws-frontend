import React from "react";

const CommitActivityChart = ({ data }) => {
  const series = data?.series || [];
  if (!series.length || !series.some((point) => point.commits > 0)) return <p className="insights-empty">No commit activity in this range.</p>;
  const maximum = Math.max(1, ...series.map((point) => point.commits)); const width = 720; const height = 220; const gap = 2; const bar = Math.max(1, width / series.length - gap);
  return <div className="insights-chart-scroll"><svg className="insights-chart" role="img" aria-labelledby="commit-chart-title commit-chart-desc" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><title id="commit-chart-title">Commit activity</title><desc id="commit-chart-desc">{data.totalCommits} commits grouped by {data.interval} in UTC.</desc>{series.map((point, index) => { const barHeight = point.commits / maximum * (height - 28); return <rect key={`${point.date}-${index}`} x={index * (width / series.length)} y={height - barHeight - 20} width={bar} height={barHeight} rx="1"><title>{point.date}: {point.commits} commits</title></rect>; })}</svg><div className="insights-chart-legend"><span>{series[0]?.date}</span><span>{series.at(-1)?.date}</span></div></div>;
};
export default CommitActivityChart;
