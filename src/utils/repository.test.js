import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRepositoryStats,
  filterRepositories,
  normalizeVisibility,
  removeRepositoryById,
} from "./repository.js";

test("normalizeVisibility supports current and legacy values", () => {
  for (const value of ["public", "true", true, "1", 1, undefined, null]) {
    assert.equal(normalizeVisibility(value), "public");
  }
  for (const value of ["private", "false", false, "0", 0]) {
    assert.equal(normalizeVisibility(value), "private");
  }
});

test("repository statistics use only their input and keep visibility totals consistent", () => {
  const repositories = Array.from({ length: 10 }, (_, index) => ({
    _id: String(index + 1),
    visibility: index < 4 ? (index % 2 ? "false" : "private") : (index % 2 ? "true" : "public"),
    commits: Array.from({ length: index % 3 }),
  }));
  const stats = calculateRepositoryStats(repositories);

  assert.deepEqual(stats, { total: 10, public: 6, private: 4, commits: 9 });
  assert.equal(stats.public + stats.private, stats.total);
});

test("repository filtering matches names, descriptions, and normalized visibility without mutation", () => {
  const repositories = [
    { _id: "1", name: "Frontend", description: "React client", visibility: "true" },
    { _id: "2", name: "API", description: "Private Node service", visibility: "false" },
    { _id: "3", name: "Docs", description: "Developer guides", visibility: "public" },
  ];

  assert.deepEqual(filterRepositories(repositories, "node", "all").map((repo) => repo._id), ["2"]);
  assert.deepEqual(filterRepositories(repositories, "", "public").map((repo) => repo._id), ["1", "3"]);
  assert.deepEqual(filterRepositories(repositories, "", "private").map((repo) => repo._id), ["2"]);
  assert.equal(repositories.length, 3);
});

test("removing a repository returns updated state and removes its commits from derived stats", () => {
  const repositories = [
    { _id: "public", visibility: "true", commits: [{}, {}] },
    { id: "private", visibility: "false", commits: [{}] },
  ];
  const afterPublicDelete = removeRepositoryById(repositories, "public");
  assert.deepEqual(calculateRepositoryStats(afterPublicDelete), {
    total: 1,
    public: 0,
    private: 1,
    commits: 1,
  });
  assert.equal(repositories.length, 2);
  assert.deepEqual(removeRepositoryById(repositories, "missing"), repositories);
});
