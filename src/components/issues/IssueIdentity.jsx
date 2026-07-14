import React from "react";

const nameOf = (user) => user?.username || user?.name || "Deleted user";
const initials = (user) => nameOf(user).split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

const IssueIdentity = ({ user }) => <span className="issue-identity">
  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span aria-hidden="true">{initials(user)}</span>}
  <strong>{nameOf(user)}</strong>
</span>;

export default IssueIdentity;
