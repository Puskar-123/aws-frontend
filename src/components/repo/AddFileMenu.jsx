import React, { useEffect, useRef, useState } from "react";

const AddFileMenu = ({ onCreate, onUploadFiles, onUploadFolder }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const closeEscape = (event) => { if (event.key === "Escape") { setOpen(false); rootRef.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);
  const choose = (handler) => { setOpen(false); handler(); };
  return <div className="repo-add-menu" ref={rootRef}>
    <button type="button" className="repo-add-menu__toggle" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Add file <span aria-hidden="true">▾</span></button>
    {open && <div className="repo-add-menu__popover" role="menu">
      <button type="button" role="menuitem" onClick={() => choose(onCreate)}>Create new file</button>
      <button type="button" role="menuitem" onClick={() => choose(onUploadFiles)}>Upload files</button>
      <button type="button" role="menuitem" onClick={() => choose(onUploadFolder)}>Upload project folder</button>
    </div>}
  </div>;
};

export default AddFileMenu;
