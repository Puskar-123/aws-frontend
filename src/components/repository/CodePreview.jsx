import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { getPrismLanguage } from "../../utils/fileType";

const languages = {
  bash,
  c,
  cpp,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  jsx,
  markdown,
  markup,
  php,
  python,
  ruby,
  rust,
  scss,
  sql,
  tsx,
  typescript,
  yaml,
};

Object.entries(languages).forEach(([name, grammar]) => {
  SyntaxHighlighter.registerLanguage(name, grammar);
});

const MAX_PREVIEW_CHARACTERS = 1024 * 1024;

const CodePreview = ({ content = "", filePath = "", language, showLineNumbers = true }) => {
  const original = String(content ?? "");
  const isTruncated = original.length > MAX_PREVIEW_CHARACTERS;
  const displayedContent = isTruncated
    ? `${original.slice(0, MAX_PREVIEW_CHARACTERS)}\n\n[Preview truncated at 1 MB]`
    : original;

  return (
    <div className="repo-code-preview">
      {isTruncated && (
        <p className="repo-code-preview__warning" role="status">
          This file is larger than 1 MB. The inline preview has been truncated; download it to view the full file.
        </p>
      )}
      <SyntaxHighlighter
        language={language || getPrismLanguage(filePath)}
        showLineNumbers={showLineNumbers}
        startingLineNumber={1}
        useInlineStyles={false}
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: "16px 0",
          width: "100%",
          minHeight: "auto",
          background: "transparent",
        }}
        codeTagProps={{
          className: "repo-code-preview__code",
          style: { display: "block", textAlign: "left" },
        }}
      >
        {displayedContent}
      </SyntaxHighlighter>
    </div>
  );
};

export default React.memo(CodePreview);
