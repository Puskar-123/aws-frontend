import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodePreview from "./CodePreview";

const MarkdownPreview = ({ content = "" }) => (
  <div className="repo-markdown-preview">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...props }) => {
          const external = /^(https?:)?\/\//i.test(href || "");
          return (
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          );
        },
        pre: ({ children }) => children,
        code: ({ className, children, ...props }) => {
          const languageMatch = /language-([^\s]+)/.exec(className || "");
          const source = String(children).replace(/\n$/, "");
          const isBlock = Boolean(languageMatch) || String(children).includes("\n");
          if (isBlock) {
            return (
              <CodePreview
                content={source}
                language={languageMatch?.[1] || "text"}
                showLineNumbers={false}
              />
            );
          }
          return <code className={className} {...props}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default React.memo(MarkdownPreview);
