import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFileTree,
  findPreferredFilePath,
  flattenTreeFiles,
} from "./buildFileTree.js";

test("buildFileTree normalizes paths, sorts folders first, and preserves duplicate basenames", () => {
  const files = [
    { filename: "README.md", path: "README.md" },
    { filename: "App.jsx", path: "frontend\\src\\App.jsx" },
    { filename: "Navbar.jsx", path: "frontend/src/components/Navbar.jsx" },
    { filename: "repoController.js", path: "backend/controllers/repoController.js" },
    { filename: "logo.png", path: "/public/logo.png" },
    { filename: "File Name.jsx", path: "folder with spaces/File Name.jsx" },
    { filename: "App.jsx", path: "admin/src/App.jsx" },
  ];

  const tree = buildFileTree(files);
  assert.deepEqual(tree.map(({ name, type }) => ({ name, type })), [
    { name: "admin", type: "folder" },
    { name: "backend", type: "folder" },
    { name: "folder with spaces", type: "folder" },
    { name: "frontend", type: "folder" },
    { name: "public", type: "folder" },
    { name: "README.md", type: "file" },
  ]);
  assert.deepEqual(flattenTreeFiles(tree).map((node) => node.path).sort(), [
    "README.md",
    "admin/src/App.jsx",
    "backend/controllers/repoController.js",
    "folder with spaces/File Name.jsx",
    "frontend/src/App.jsx",
    "frontend/src/components/Navbar.jsx",
    "public/logo.png",
  ].sort());
  assert.equal(files[1].path, "frontend\\src\\App.jsx");
});

test("buildFileTree ignores duplicate and unsafe paths", () => {
  const tree = buildFileTree([
    { path: "src/App.jsx", marker: 1 },
    { path: "src/App.jsx", marker: 2 },
    { path: "../secret.txt" },
    { path: "" },
  ]);
  const files = flattenTreeFiles(tree);
  assert.equal(files.length, 1);
  assert.equal(files[0].file.marker, 1);
});

test("buildFileTree avoids file and folder collisions", () => {
  const tree = buildFileTree([
    { path: "src" },
    { path: "src/App.jsx" },
  ]);
  assert.deepEqual(flattenTreeFiles(tree).map((node) => node.path), ["src"]);
});

test("findPreferredFilePath prioritizes README depth then alphabetical files", () => {
  const withRootReadme = flattenTreeFiles(buildFileTree([
    { path: "frontend/README.md" },
    { path: "README.md" },
    { path: "docs/README.md" },
  ]));
  assert.equal(findPreferredFilePath(withRootReadme), "README.md");

  const nestedReadmes = flattenTreeFiles(buildFileTree([
    { path: "docs/guides/README.md" },
    { path: "frontend/README.md" },
  ]));
  assert.equal(findPreferredFilePath(nestedReadmes), "frontend/README.md");

  const noReadme = flattenTreeFiles(buildFileTree([
    { path: "frontend/src/App.jsx" },
    { path: "admin/src/App.jsx" },
  ]));
  assert.equal(findPreferredFilePath(noReadme), "admin/src/App.jsx");
});
