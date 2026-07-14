import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiGitBranch, FiPlus, FiTrash2 } from "react-icons/fi";

const BranchSelector = ({
  branches,
  selectedBranch,
  defaultBranch,
  loading,
  error,
  canManage,
  onSelect,
  onCreate,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const filteredBranches = useMemo(() => branches.filter((branch) =>
    branch.name.toLowerCase().includes(query.trim().toLowerCase())
  ), [branches, query]);

  useEffect(() => {
    if (!open) return undefined;
    searchRef.current?.focus();
    const handlePointer = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector(".repo-branch-button")?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selectBranch = (name) => {
    setOpen(false);
    setQuery("");
    onSelect(name);
  };

  const moveOptionFocus = (event) => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const options = [...event.currentTarget.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    event.preventDefault();
    const currentIndex = options.indexOf(document.activeElement);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : options.length - 1)
      : (currentIndex + direction + options.length) % options.length;
    options[nextIndex].focus();
  };

  return (
    <div className="repo-branch-selector" ref={containerRef}>
      <button
        type="button"
        className="repo-branch-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <FiGitBranch aria-hidden="true" />
        <span title={selectedBranch}>{selectedBranch || "Loading branches..."}</span>
        <FiChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div className="repo-branch-dropdown">
          <div className="repo-branch-dropdown__header">
            <strong>Branches</strong>
            <span>{branches.length}</span>
          </div>
          <label className="repo-branch-search">
            <span className="sr-only">Search branches</span>
            <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search branches..." />
          </label>
          <div className="repo-branch-list" role="listbox" aria-label="Repository branches" onKeyDown={moveOptionFocus}>
            {loading && !branches.length && <div className="repo-branch-state" role="status">Loading branches...</div>}
            {error && !branches.length && <div className="repo-branch-state repo-branch-state--error" role="alert">{error}</div>}
            {!loading && !error && !filteredBranches.length && <div className="repo-branch-state">No matching branches</div>}
            {filteredBranches.map((branch) => {
              const selected = branch.name === selectedBranch;
              const isDefault = branch.name === defaultBranch || branch.isDefault;
              const canDelete = canManage && !selected && !isDefault;
              return (
                <div className="repo-branch-row" key={branch.name}>
                  <button type="button" role="option" aria-selected={selected} title={branch.name} onClick={() => selectBranch(branch.name)}>
                    <FiCheck className={selected ? "is-visible" : ""} aria-hidden="true" />
                    <span>{branch.name}</span>
                    {isDefault && <small>Default</small>}
                  </button>
                  {canDelete && (
                    <button type="button" className="repo-branch-delete" aria-label={`Delete branch ${branch.name}`} onClick={() => { setOpen(false); onDelete(branch); }}>
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {canManage && (
            <button type="button" className="repo-branch-new" onClick={() => { setOpen(false); onCreate(); }}>
              <FiPlus aria-hidden="true" /> New branch
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BranchSelector;
