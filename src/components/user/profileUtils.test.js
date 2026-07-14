import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContributionCalendar,
  contributionLevel,
  getProfileInitials,
  normalizeEditableUrl,
} from "./profileUtils.js";

test("profile initials use display name and fall back safely", () => {
  assert.equal(getProfileInitials("Puskar Porel", "puskar"), "PP");
  assert.equal(getProfileInitials("", "developer"), "D");
  assert.equal(getProfileInitials("Single"), "S");
});

test("profile URL validation accepts web URLs and rejects unsafe schemes", () => {
  assert.equal(normalizeEditableUrl("example.com"), "https://example.com/");
  assert.equal(normalizeEditableUrl("https://example.com/profile"), "https://example.com/profile");
  assert.equal(normalizeEditableUrl("javascript:alert(1)"), null);
  assert.equal(normalizeEditableUrl("data:text/plain,test"), null);
});

test("contribution calendar uses real counts and five stable levels", () => {
  const calendar = buildContributionCalendar([
    { date: "2026-01-01", count: 3 },
    { date: "2026-07-14", count: 10 },
  ], 2026).filter(Boolean);
  assert.equal(calendar.length, 365);
  assert.equal(calendar.find((day) => day.date === "2026-01-01").count, 3);
  assert.deepEqual([0, 1, 3, 6, 10].map(contributionLevel), [0, 1, 2, 3, 4]);
});
