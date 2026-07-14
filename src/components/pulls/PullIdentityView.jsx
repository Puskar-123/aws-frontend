import React, { useState } from "react";
import { displayName, initials } from "./pullIdentity";

const PullIdentityView = ({ identity }) => {
  const name = displayName(identity);
  const [failedAvatar, setFailedAvatar] = useState("");
  const showAvatar = identity?.avatarUrl && failedAvatar !== identity.avatarUrl;
  return <span className="pull-identity">
    {showAvatar
      ? <img className="pull-avatar" src={identity.avatarUrl} alt="" onError={() => setFailedAvatar(identity.avatarUrl)} />
      : <span className="pull-avatar pull-avatar--fallback" aria-hidden="true">{initials(identity)}</span>}
    <strong>{name}</strong>
  </span>;
};

export default PullIdentityView;
