export const formatJoinedDate = (value) => {
  if (value === null || value === undefined || value === "" || value === 0 || value === "0") {
    return "Join date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return "Join date unavailable";
  }

  return `Joined ${date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
};
