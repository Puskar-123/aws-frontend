import React, { useId } from "react";

const seriesMap = (series = []) => new Map(series.map((item) => [String(item.date ?? item._id), Number(item.count) || 0]));

const DualActivityChart = ({ title, firstLabel, firstSeries, secondLabel, secondSeries }) => {
  const titleId = useId();
  const descriptionId = useId();
  const first = seriesMap(firstSeries);
  const second = seriesMap(secondSeries);
  const dates = [...new Set([...first.keys(), ...second.keys()])].sort();

  if (!dates.length) return <p className="insights-empty">No trend data in this range.</p>;

  const maximum = Math.max(1, ...dates.flatMap((date) => [first.get(date) || 0, second.get(date) || 0]));
  const groupWidth = 720 / dates.length;
  const barWidth = Math.max(2, (groupWidth - 6) / 2);

  return <div className="insights-chart-scroll insights-mini-chart-wrap">
    <svg className="insights-chart insights-mini-chart" viewBox="0 0 720 180" preserveAspectRatio="none" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{firstLabel} and {secondLabel} activity by UTC interval.</desc>
      {dates.flatMap((date, index) => {
        const firstValue = first.get(date) || 0;
        const secondValue = second.get(date) || 0;
        const firstHeight = firstValue / maximum * 155;
        const secondHeight = secondValue / maximum * 155;
        const x = index * groupWidth + 2;
        return [
          <rect key={`${date}-first`} className="insights-series-first" x={x} y={170 - firstHeight} width={barWidth} height={firstHeight}><title>{date}: {firstValue} {firstLabel.toLowerCase()}</title></rect>,
          <rect key={`${date}-second`} className="insights-series-second" x={x + barWidth + 2} y={170 - secondHeight} width={barWidth} height={secondHeight}><title>{date}: {secondValue} {secondLabel.toLowerCase()}</title></rect>,
        ];
      })}
    </svg>
    <div className="insights-series-key"><span className="insights-series-key-first">{firstLabel}</span><span className="insights-series-key-second">{secondLabel}</span></div>
  </div>;
};

export default DualActivityChart;
