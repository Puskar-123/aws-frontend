const placeholderDescriptions = new Set(["", "x", "null", "undefined", "no description", "no description."]);

export const repositoryDescription = (value) => {
  const description = typeof value === "string" ? value.trim() : "";
  return placeholderDescriptions.has(description.toLowerCase()) ? "No description provided." : description;
};
