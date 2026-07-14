export const displayName = (identity) => identity?.username || identity?.name || "Deleted user";

export const initials = (identity) => {
  const parts = displayName(identity).trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0]?.[0] || "?").toUpperCase();
};

export const formatPullDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};
