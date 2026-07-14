const MARKDOWN_EXTENSIONS = new Set(["md", "mdx"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "json", "css", "scss", "html", "htm", "xml",
  "yml", "yaml", "md", "mdx", "txt", "sh", "bash", "py", "java", "c", "h",
  "cpp", "hpp", "cs", "go", "rs", "php", "rb", "sql", "env.example",
]);
const BINARY_EXTENSIONS = new Set([
  "pdf", "zip", "gz", "tar", "rar", "7z", "exe", "dll", "woff", "woff2",
  "ttf", "otf", "mp4", "webm", "mov", "mp3", "wav", "ogg",
]);
export const MAX_BROWSER_EDIT_BYTES = 512 * 1024;
const EDITABLE_EXTENSIONS = new Set([
  "txt", "md", "json", "js", "jsx", "ts", "tsx", "css", "scss", "html", "xml",
  "yml", "yaml", "properties", "ini", "py", "java", "c", "cpp", "h", "hpp",
  "go", "rs", "php", "rb", "sh", "sql", "env.example",
]);
const EDITABLE_NAMES = new Set([".gitignore", ".env.example"]);

const LANGUAGE_BY_EXTENSION = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  json: "json",
  css: "css",
  scss: "scss",
  html: "markup",
  htm: "markup",
  xml: "markup",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  mdx: "markdown",
  txt: "text",
  sh: "bash",
  bash: "bash",
  py: "python",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  sql: "sql",
  "env.example": "bash",
};

export const getFileExtension = (filePath = "") => {
  const basename = String(filePath).replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  if (basename.endsWith(".env.example")) return "env.example";
  const dotIndex = basename.lastIndexOf(".");
  return dotIndex > -1 ? basename.slice(dotIndex + 1) : "";
};

export const getFileCategory = (filePath, contentType = "") => {
  const extension = getFileExtension(filePath);
  const normalizedType = String(contentType).toLowerCase().split(";")[0];

  if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
  if (IMAGE_EXTENSIONS.has(extension) || normalizedType.startsWith("image/")) return "image";
  if (BINARY_EXTENSIONS.has(extension)
    || normalizedType.startsWith("audio/")
    || normalizedType.startsWith("video/")
    || normalizedType.startsWith("font/")) return "binary";
  if (TEXT_EXTENSIONS.has(extension)
    || normalizedType.startsWith("text/")
    || /json|javascript|typescript|xml|yaml|sql/.test(normalizedType)) return "text";
  return "binary";
};

export const getPrismLanguage = (filePath = "") =>
  LANGUAGE_BY_EXTENSION[getFileExtension(filePath)] || "text";

export const isProtectedFilePath = (filePath = "") => {
  const basename = String(filePath).replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  return basename === ".env"
    || (basename.startsWith(".env.") && basename !== ".env.example")
    || basename.endsWith(".pem")
    || basename.endsWith(".key")
    || basename === "service-account.json"
    || basename.includes("credentials");
};

export const isBrowserEditableFile = (filePath = "", size) => {
  const basename = String(filePath).replace(/\\/g, "/").split("/").at(-1).toLowerCase();
  return !isProtectedFilePath(filePath)
    && (EDITABLE_NAMES.has(basename) || EDITABLE_EXTENSIONS.has(getFileExtension(filePath)))
    && (!Number.isFinite(Number(size)) || Number(size) <= MAX_BROWSER_EDIT_BYTES);
};

export const formatFileSize = (size) => {
  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize < 0) return "";
  if (numericSize < 1024) return `${numericSize} B`;
  if (numericSize < 1024 ** 2) return `${(numericSize / 1024).toFixed(1)} KB`;
  return `${(numericSize / (1024 ** 2)).toFixed(1)} MB`;
};

export const getReadableFileType = (filePath, contentType = "") => {
  const extension = getFileExtension(filePath);
  if (contentType) return contentType.split(";")[0];
  return extension ? `${extension.toUpperCase()} file` : "Binary file";
};
