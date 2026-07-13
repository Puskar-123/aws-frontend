export const normalizeRepoPath = (filePath) => {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized
    || normalized.startsWith("/")
    || /^[a-zA-Z]:\//.test(normalized)
    || normalized.includes("\0")
    || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe repository path: ${filePath}`);
  }
  return normalized;
};

export const encodeRepoPath = (filePath) =>
  normalizeRepoPath(filePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
