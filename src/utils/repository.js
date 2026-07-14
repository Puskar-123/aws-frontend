export const getRepositoryId = (repository) => repository?._id || repository?.id || null;

export const normalizeVisibility = (visibility) => {
  const value = String(visibility ?? "").toLowerCase();

  if (value === "private" || value === "false" || value === "0") {
    return "private";
  }

  return "public";
};

export const calculateRepositoryStats = (repositories = []) => {
  const safeRepositories = Array.isArray(repositories) ? repositories : [];
  const stats = safeRepositories.reduce((result, repository) => {
    result[normalizeVisibility(repository?.visibility)] += 1;
    result.commits += Array.isArray(repository?.commits) ? repository.commits.length : 0;
    return result;
  }, { public: 0, private: 0, commits: 0 });

  return {
    total: safeRepositories.length,
    public: stats.public,
    private: stats.private,
    commits: stats.commits,
  };
};

export const filterRepositories = (repositories = [], searchQuery = "", visibility = "all") => {
  const normalizedQuery = String(searchQuery).trim().toLowerCase();
  const normalizedFilter = String(visibility).toLowerCase();

  return (Array.isArray(repositories) ? repositories : []).filter((repository) => {
    const name = String(repository?.name ?? "").toLowerCase();
    const description = String(repository?.description ?? "").toLowerCase();
    const matchesQuery = !normalizedQuery
      || name.includes(normalizedQuery)
      || description.includes(normalizedQuery);
    const matchesVisibility = normalizedFilter === "all"
      || normalizeVisibility(repository?.visibility) === normalizedFilter;
    return matchesQuery && matchesVisibility;
  });
};

export const removeRepositoryById = (repositories = [], repositoryId) => (
  (Array.isArray(repositories) ? repositories : []).filter(
    (repository) => String(getRepositoryId(repository)) !== String(repositoryId),
  )
);
