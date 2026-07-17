export const can = (permissionState, permission) => Boolean(permissionState?.permissions?.includes(permission));
export const canAny = (permissionState, permissions) => permissions.some((permission) => can(permissionState, permission));
export const canAll = (permissionState, permissions) => permissions.every((permission) => can(permissionState, permission));

export const roleLabel = (role) => ({
  owner: "Owner", maintainer: "Maintainer", viewer: "Viewer", read: "Read",
  issue_manager: "Issue Manager", tester: "Tester", reviewer: "Reviewer", write: "Write",
  temporary_contributor: "Temporary Contributor", deployment_manager: "Deployment Manager",
}[role] || String(role || "").replaceAll("_", " "));

export const accessWarning = (member, now = Date.now()) => {
  if (member?.legacyIndefiniteAccess) return "Legacy write access — expiry not configured";
  if (member?.status === "expired" || (member?.accessExpiresAt && new Date(member.accessExpiresAt).getTime() <= now)) return "Expired";
  const remaining = member?.accessExpiresAt ? new Date(member.accessExpiresAt).getTime() - now : Infinity;
  return remaining > 0 && remaining <= 86400000 ? "Access expires within 24 hours" : "";
};
