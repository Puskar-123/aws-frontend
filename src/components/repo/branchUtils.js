const BRANCH_PATTERN = /^(?![-/])(?!.*(?:\.\.|\/\/|@\{|\\|\s))(?!.*(?:\.|\/)$)(?!.*\.lock$)[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;

export const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value !== "object") return "";

  const nestedId = value._id ?? value.id ?? value.$oid;
  return nestedId && nestedId !== value ? normalizeId(nestedId) : "";
};

export const validateBranchName = (value) => {
  const name = value.trim();
  if (!name) return "Branch name is required.";
  if (!BRANCH_PATTERN.test(name) || name.split("/").some((part) => !part || part.startsWith("."))) {
    return "Use letters, numbers, dots, underscores, hyphens, and single forward slashes.";
  }
  return "";
};
