import React from "react";
import { FiChevronRight } from "react-icons/fi";

const Breadcrumb = ({ repositoryName, filePath, onFolderClick }) => {
  const segments = filePath ? filePath.split("/") : [];

  return (
    <nav className="repo-breadcrumb" aria-label="File breadcrumb">
      <span className="repo-breadcrumb__repository">{repositoryName}</span>
      {segments.map((segment, index) => {
        const isFile = index === segments.length - 1;
        const segmentPath = segments.slice(0, index + 1).join("/");
        return (
          <React.Fragment key={segmentPath}>
            <FiChevronRight className="repo-breadcrumb__separator" aria-hidden="true" />
            {isFile ? (
              <span className="repo-breadcrumb__current" aria-current="page">{segment}</span>
            ) : (
              <button type="button" onClick={() => onFolderClick(segmentPath)}>
                {segment}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default React.memo(Breadcrumb);
