import React, { useEffect, useRef } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiFile,
  FiFolder,
  FiFolderMinus,
  FiImage,
} from "react-icons/fi";
import { getFileCategory } from "../../utils/fileType";

const TreeNode = ({
  node,
  expandedPaths,
  selectedPath,
  focusRequest,
  onToggle,
  onSelect,
}) => {
  const rowRef = useRef(null);
  const isFolder = node.type === "folder";
  const isExpanded = isFolder && expandedPaths.has(node.path);
  const isSelected = !isFolder && selectedPath === node.path;

  useEffect(() => {
    if (focusRequest?.path === node.path) rowRef.current?.focus();
  }, [focusRequest, node.path]);

  if (isFolder) {
    return (
      <li className="repo-tree-node">
        <button
          ref={rowRef}
          type="button"
          className="repo-tree-node__row repo-tree-node__row--folder"
          aria-expanded={isExpanded}
          onClick={() => onToggle(node.path)}
          title={node.path}
        >
          {isExpanded
            ? <FiChevronDown className="repo-tree-node__chevron" aria-hidden="true" />
            : <FiChevronRight className="repo-tree-node__chevron" aria-hidden="true" />}
          {isExpanded
            ? <FiFolderMinus className="repo-tree-node__folder-icon" aria-hidden="true" />
            : <FiFolder className="repo-tree-node__folder-icon" aria-hidden="true" />}
          <span>{node.name}</span>
        </button>
        {isExpanded && (
          <ul className="repo-tree-node__children">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                expandedPaths={expandedPaths}
                selectedPath={selectedPath}
                focusRequest={focusRequest}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const FileIcon = getFileCategory(node.path, node.file?.contentType) === "image" ? FiImage : FiFile;
  return (
    <li className="repo-tree-node">
      <button
        ref={rowRef}
        type="button"
        className={`repo-tree-node__row repo-tree-node__row--file${isSelected ? " repo-tree-node__row--active" : ""}`}
        aria-current={isSelected ? "true" : undefined}
        onClick={() => onSelect(node.path)}
        title={node.path}
      >
        <span className="repo-tree-node__chevron" aria-hidden="true" />
        <FileIcon className="repo-tree-node__file-icon" aria-hidden="true" />
        <span>{node.name}</span>
      </button>
    </li>
  );
};

export default React.memo(TreeNode);
