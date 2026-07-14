import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const PasswordInput = ({ id, value, onChange, autoComplete, describedBy, invalid }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-input-wrapper">
      <input
        id={id}
        name="password"
        className="auth-input auth-input--password"
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="auth-password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        <span>{visible ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
};

export default PasswordInput;
