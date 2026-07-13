import { normalizeRepoPath } from "./repoPath.js";

const compareNodes = (left, right) => {
  if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
};

const sortTree = (nodes) => {
  nodes.sort(compareNodes);
  nodes.forEach((node) => {
    if (node.type === "folder") sortTree(node.children);
  });
  return nodes;
};

export const buildFileTree = (files = []) => {
  const root = [];
  const folders = new Map();
  const filePaths = new Set();

  files.forEach((file) => {
    if (!file || typeof file !== "object") return;

    let normalizedPath;
    try {
      const candidate = String(file.path || file.filename || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      normalizedPath = normalizeRepoPath(candidate);
    } catch {
      return;
    }

    if (filePaths.has(normalizedPath)) return;

    const segments = normalizedPath.split("/");
    let children = root;
    let parentPath = "";

    let pathCollision = false;
    for (const segment of segments.slice(0, -1)) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      if (filePaths.has(folderPath)) {
        pathCollision = true;
        break;
      }
      let folder = folders.get(folderPath);

      if (!folder) {
        folder = {
          name: segment,
          path: folderPath,
          type: "folder",
          children: [],
        };
        folders.set(folderPath, folder);
        children.push(folder);
      }

      children = folder.children;
      parentPath = folderPath;
    }

    if (pathCollision || folders.has(normalizedPath)) return;

    children.push({
      name: segments.at(-1),
      path: normalizedPath,
      type: "file",
      file: { ...file, path: normalizedPath },
    });
    filePaths.add(normalizedPath);
  });

  return sortTree(root);
};

export const flattenTreeFiles = (nodes = []) => nodes.flatMap((node) =>
  node.type === "folder" ? flattenTreeFiles(node.children) : [node]
);

export const findPreferredFilePath = (fileNodes = []) => {
  if (!fileNodes.length) return "";
  const readmes = fileNodes.filter((node) => node.name.toLowerCase() === "readme.md");
  if (readmes.length) {
    return readmes
      .slice()
      .sort((left, right) => {
        const depth = left.path.split("/").length - right.path.split("/").length;
        return depth || left.path.localeCompare(right.path, undefined, { sensitivity: "base" });
      })[0].path;
  }
  return fileNodes
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path, undefined, { sensitivity: "base" }))[0].path;
};
