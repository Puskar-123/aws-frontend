export const getProfileInitials = (name, username = "Developer") => {
  const source = String(name || username).trim();
  if (!source) return "D";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

export const formatProfileDate = (value, options = { month: "long", year: "numeric" }) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, options).format(date);
};

export const normalizeEditableUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export const contributionLevel = (count) => {
  if (count >= 10) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
};

export const buildContributionCalendar = (contributions = [], year = new Date().getFullYear()) => {
  const counts = new Map(contributions.map((item) => [item.date, Number(item.count) || 0]));
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const days = Array.from({ length: start.getUTCDay() }, () => null);
  for (let date = start; date <= end; date = new Date(date.getTime() + 86400000)) {
    const key = date.toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) || 0 });
  }
  return days;
};
