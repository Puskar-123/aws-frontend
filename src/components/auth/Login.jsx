import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import { getResponseError, parseResponse } from "../../utils/api";
import AuthLayout from "./AuthLayout";
import PasswordInput from "./PasswordInput";
import "./auth.css";

export const safeReturnPath = (value) => (
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard"
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);
    setErrors((current) => ({ ...current, [field]: "" }));
    setRequestError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Email address is required.";
    if (!password) nextErrors.password = "Password is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setRequestError("");
    setLoading(true);

    try {
      const response = await fetch("https://api.codehub.sbs/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await parseResponse(response);

      if (!response.ok) {
        setRequestError(getResponseError(data, "Unable to sign in. Check your credentials and try again."));
        return;
      }
      if (!data.token || !data.userId) {
        setRequestError("The server returned an incomplete sign-in response.");
        return;
      }

      const valid = await login(data);
      if (!valid) { setRequestError("The session could not be validated."); return; }
      navigate(safeReturnPath(location.state?.from), { replace: true });
    } catch {
      setRequestError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to CodeHub"
      footer={<p>New to CodeHub? <Link to="/signup">Create an account</Link></p>}
    >
      <form onSubmit={handleLogin} noValidate>
        {requestError && <div className="auth-error auth-error--form" role="alert">{requestError}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(event) => updateField("email", event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
          />
          {errors.email && <p id="login-email-error" className="auth-error">{errors.email}</p>}
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="login-password">Password</label>
          </div>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(event) => updateField("password", event.target.value)}
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? "login-password-error" : undefined}
          />
          {errors.password && <p id="login-password-error" className="auth-error">{errors.password}</p>}
        </div>

        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
