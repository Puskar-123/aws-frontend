import assert from "node:assert/strict";
import test from "node:test";
import { formatJoinedDate } from "./date.js";

test("formatJoinedDate formats a valid stored date", () => {
  assert.equal(formatJoinedDate("2026-03-15T12:00:00.000Z"), "Joined March 2026");
});

test("formatJoinedDate rejects missing, invalid, and epoch values", () => {
  assert.equal(formatJoinedDate(null), "Join date unavailable");
  assert.equal(formatJoinedDate(undefined), "Join date unavailable");
  assert.equal(formatJoinedDate("not-a-date"), "Join date unavailable");
  assert.equal(formatJoinedDate(0), "Join date unavailable");
  assert.equal(formatJoinedDate("1970-01-01T00:00:00.000Z"), "Join date unavailable");
});
