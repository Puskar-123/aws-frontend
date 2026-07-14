import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import { getResponseError, parseResponse } from "../../utils/api";
import AuthLayout from "./AuthLayout";
import PasswordInput from "./PasswordInput";
import "./auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Signup = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    if (field === "username") setUsername(value);
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    setErrors((current) => ({ ...current, [field]: "" }));
    setRequestError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!username.trim()) nextErrors.username = "Username is required.";
    if (!email.trim()) nextErrors.email = "Email address is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Password is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setRequestError("");
    setLoading(true);

    try {
      const response = await fetch("https://api.codehub.sbs/user/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        setRequestError(getResponseError(data, "Unable to create your account. Please try again."));
        return;
      }
      if (!data.token || !data.userId) {
        setRequestError("The server returned an incomplete signup response.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      setCurrentUser(data.userId);
      navigate("/");
    } catch {
      setRequestError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordHint = password
    ? `${password.length < 8 ? "Keep going" : "Good start"} — ${password.length} character${password.length === 1 ? "" : "s"}.`
    : "Use a password you do not use on another site.";

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building and sharing projects"
      footer={<p>Already have an account? <Link to="/login">Sign in</Link></p>}
    >
      <form onSubmit={handleSignup} noValidate>
        {requestError && <div className="auth-error auth-error--form" role="alert">{requestError}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-username">Username</label>
          <input id="signup-username" name="username" className="auth-input" type="text" value={username} onChange={(event) => updateField("username", event.target.value)} autoComplete="username" aria-invalid={Boolean(errors.username) || undefined} aria-describedby={errors.username ? "signup-username-error" : undefined} />
          {errors.username && <p id="signup-username-error" className="auth-error">{errors.username}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-email">Email address</label>
          <input id="signup-email" name="email" className="auth-input" type="email" value={email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" aria-invalid={Boolean(errors.email) || undefined} aria-describedby={errors.email ? "signup-email-error" : undefined} />
          {errors.email && <p id="signup-email-error" className="auth-error">{errors.email}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-password">Password</label>
          <PasswordInput id="signup-password" value={password} onChange={(event) => updateField("password", event.target.value)} autoComplete="new-password" invalid={Boolean(errors.password)} describedBy={errors.password ? "signup-password-error signup-password-helper" : "signup-password-helper"} />
          {errors.password && <p id="signup-password-error" className="auth-error">{errors.password}</p>}
          <p id="signup-password-helper" className="auth-helper">{passwordHint}</p>
        </div>

        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Signup;
