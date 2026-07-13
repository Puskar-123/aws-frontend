import assert from "node:assert/strict";
import test from "node:test";
import {
  formatFileSize,
  getFileCategory,
  getFileExtension,
  getPrismLanguage,
} from "./fileType.js";
import { encodeRepoPath, normalizeRepoPath } from "./repoPath.js";

test("file type helpers recognize preview categories and languages", () => {
  assert.equal(getFileCategory("README.md"), "markdown");
  assert.equal(getFileCategory("public/logo.png"), "image");
  assert.equal(getFileCategory("src/App.tsx"), "text");
  assert.equal(getFileCategory("archive.zip"), "binary");
  assert.equal(getFileCategory("asset", "image/webp"), "image");
  assert.equal(getFileExtension("config.env.example"), "env.example");
  assert.equal(getPrismLanguage("src/App.jsx"), "jsx");
  assert.equal(getPrismLanguage("unknown.source"), "text");
});

test("path helpers preserve separators and encode individual segments", () => {
  assert.equal(normalizeRepoPath("frontend\\src\\App.jsx"), "frontend/src/App.jsx");
  assert.equal(
    encodeRepoPath("folder with spaces/File Name.jsx"),
    "folder%20with%20spaces/File%20Name.jsx",
  );
  assert.throws(() => normalizeRepoPath("../secret.txt"), /Unsafe repository path/);
});

test("formatFileSize handles available and missing metadata", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(1536), "1.5 KB");
  assert.equal(formatFileSize(undefined), "");
});
