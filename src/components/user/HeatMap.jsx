import React, { useMemo, useState } from "react";
import { buildContributionCalendar, contributionLevel, formatProfileDate } from "./profileUtils";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HeatMapProfile = ({ contributions = [] }) => {
  const years = useMemo(() => {
    const values = [...new Set(contributions.map((item) => Number(String(item.date).slice(0, 4))).filter(Boolean))];
    if (!values.length) values.push(new Date().getFullYear());
    return values.sort((a, b) => b - a);
  }, [contributions]);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const calendar = useMemo(
    () => buildContributionCalendar(contributions, selectedYear),
    [contributions, selectedYear],
  );
  const total = useMemo(
    () => contributions.filter((item) => String(item.date).startsWith(`${selectedYear}-`))
      .reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    [contributions, selectedYear],
  );

  return (
    <section className="profile-panel profile-contributions" aria-labelledby="contributions-heading">
      <div className="profile-panel__header">
        <div>
          <h2 id="contributions-heading">Contribution activity</h2>
          <p>{total} {total === 1 ? "contribution" : "contributions"} in {selectedYear}</p>
        </div>
        {years.length > 1 && (
          <label className="profile-year-select">
            <span>Year</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="profile-heatmap-scroll">
        <div className="profile-heatmap-layout">
          <div className="profile-heatmap-months" aria-hidden="true">
            {monthLabels.map((month) => <span key={month}>{month}</span>)}
          </div>
          <div className="profile-heatmap-body">
            <div className="profile-heatmap-weekdays" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
            <div className="profile-heatmap-grid" role="grid" aria-label={`${total} contributions in ${selectedYear}`}>
              {calendar.map((day, index) => day ? (
                <span
                  key={day.date}
                  className={`profile-heatmap-cell profile-heatmap-cell--${contributionLevel(day.count)}`}
                  role="gridcell"
                  title={`${day.count} ${day.count === 1 ? "contribution" : "contributions"} on ${formatProfileDate(day.date, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}`}
                  aria-label={`${day.count} ${day.count === 1 ? "contribution" : "contributions"} on ${day.date}`}
                />
              ) : <span className="profile-heatmap-cell profile-heatmap-cell--empty" key={`empty-${index}`} aria-hidden="true" />)}
            </div>
          </div>
        </div>
      </div>
      <div className="profile-heatmap-legend" aria-label="Contribution intensity from less to more">
        <span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`profile-heatmap-cell--${level}`} />)}<span>More</span>
      </div>
    </section>
  );
};

export default React.memo(HeatMapProfile);
