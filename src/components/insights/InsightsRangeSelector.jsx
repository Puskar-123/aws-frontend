import React from "react";

const ranges = [["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["1y", "1 year"], ["all", "All time"]];
const InsightsRangeSelector = ({ value, onChange }) => <label className="insights-range">Range<select value={value} onChange={(event) => onChange(event.target.value)}>{ranges.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;
export default InsightsRangeSelector;
