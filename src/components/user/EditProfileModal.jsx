import React, { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { normalizeEditableUrl } from "./profileUtils";

const fields = [
  { name: "name", label: "Name", maxLength: 80 },
  { name: "bio", label: "Bio", maxLength: 160, multiline: true },
  { name: "avatarUrl", label: "Avatar URL", type: "url" },
  { name: "company", label: "Company", maxLength: 100 },
  { name: "location", label: "Location", maxLength: 100 },
  { name: "website", label: "Website", type: "url" },
];

const EditProfileModal = ({ user, saving, serverError, onClose, onSave }) => {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(({ name }) => [name, user[name] || ""])));
  const [errors, setErrors] = useState({});
  const firstInputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving) onClose();
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled)");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: "" }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    for (const field of ["website", "avatarUrl"]) {
      if (form[field] && normalizeEditableUrl(form[field]) === null) {
        nextErrors[field] = `${field === "website" ? "Website" : "Avatar URL"} must use http or https.`;
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div ref={dialogRef} className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-heading">
        <div className="profile-modal__header">
          <h2 id="edit-profile-heading">Edit profile</h2>
          <button type="button" aria-label="Close edit profile" onClick={onClose} disabled={saving}><FiX aria-hidden="true" /></button>
        </div>
        <form onSubmit={submit}>
          {fields.map((field, index) => (
            <label className="profile-form-field" key={field.name}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea
                  ref={index === 0 ? firstInputRef : undefined}
                  name={field.name}
                  value={form[field.name]}
                  maxLength={field.maxLength}
                  rows="4"
                  onChange={updateField}
                />
              ) : (
                <input
                  ref={index === 0 ? firstInputRef : undefined}
                  type={field.type || "text"}
                  name={field.name}
                  value={form[field.name]}
                  maxLength={field.maxLength}
                  onChange={updateField}
                />
              )}
              {field.maxLength && <small>{form[field.name].length}/{field.maxLength}</small>}
              {errors[field.name] && <em role="alert">{errors[field.name]}</em>}
            </label>
          ))}
          {serverError && <p className="profile-form-error" role="alert">{serverError}</p>}
          <div className="profile-modal__actions">
            <button type="button" className="profile-secondary-action" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="profile-primary-action" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
