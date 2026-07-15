import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import "./ThemeToggle.css";

const OPTIONS = [
  { value: "system", label: "System", Icon: FiMonitor },
  { value: "light", label: "Light", Icon: FiSun },
  { value: "dark", label: "Dark", Icon: FiMoon },
];

const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const ActiveIcon = theme === "system" ? FiMonitor : resolvedTheme === "dark" ? FiMoon : FiSun;

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="theme-toggle" ref={rootRef}>
      <button type="button" className="theme-toggle__button" aria-label={`Appearance: ${theme}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <ActiveIcon aria-hidden="true" />
      </button>
      {open && <div className="theme-toggle__menu" role="menu" aria-label="Appearance">
        <p>Appearance</p>
        {OPTIONS.map(({ value, label, Icon }) => <button type="button" role="menuitemradio" aria-checked={theme === value} key={value} onClick={() => { setTheme(value); setOpen(false); }}>
          <FiCheck className={theme === value ? "is-visible" : ""} aria-hidden="true" />{React.createElement(Icon, { "aria-hidden": true })}<span>{label}</span>
        </button>)}
      </div>}
    </div>
  );
};

export default ThemeToggle;
