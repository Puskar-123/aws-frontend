import React from "react";
import { FiGitCommit, FiPlusCircle } from "react-icons/fi";
import { formatProfileDate } from "./profileUtils";

const RecentActivity = ({ activity = [], username, onOpenRepository }) => (
  <section className="profile-panel profile-activity" aria-labelledby="recent-activity-heading">
    <div className="profile-panel__header"><div><h2 id="recent-activity-heading">Recent activity</h2><p>Repository and commit events</p></div></div>
    {activity.length ? (
      <ol>
        {activity.map((item, index) => (
          <li key={`${item.type}-${item.repositoryId || "missing"}-${item.createdAt}-${index}`}>
            <span className="profile-activity__icon">{item.type === "commit" ? <FiGitCommit aria-hidden="true" /> : <FiPlusCircle aria-hidden="true" />}</span>
            <div>
              <p>
                <strong>{username}</strong>{item.type === "commit" ? ` pushed “${item.message}” to ` : " created repository "}
                {item.repositoryId ? <button type="button" onClick={() => onOpenRepository(item)}>{item.repositoryName}</button> : item.repositoryName}
              </p>
              <time dateTime={item.createdAt}>{formatProfileDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
          </li>
        ))}
      </ol>
    ) : <div className="profile-empty-state">No recent activity yet.</div>}
  </section>
);

export default RecentActivity;
