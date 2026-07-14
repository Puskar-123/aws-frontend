import React from "react";
import TreeNode from "./TreeNode";

const FileTree = ({
  nodes,
  expandedPaths,
  selectedPath,
  focusRequest,
  onToggle,
  onSelect,
  emptyMessage = "No files in this repository",
}) => {
  if (!nodes.length) {
    return <div className="repo-tree__empty">{emptyMessage}</div>;
  }

  return (
    <ul className="repo-tree__list" aria-label="Repository file tree">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          focusRequest={focusRequest}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
};

export default React.memo(FileTree);
