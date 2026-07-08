import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../authContext";
import { useNavigate, Link } from "react-router-dom";

import "./auth.css";
import logo from "../../assets/github-mark-white.svg";

const Login = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await axios.post(
        "https://api.codehub.sbs/user/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);

      setCurrentUser(res.data.userId);

      navigate("/dashboard");
    } catch (error) {
      console.error(error);

      if (error.response) {
        alert(error.response.data.error || "Login Failed");
      } else {
        alert("Server not reachable");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-logo-container">
        <img
          className="logo-login"
          src={logo}
          alt="CodeHub"
        />
      </div>

      <div className="login-box-wrapper">
        <h1 className="auth-title">Sign In</h1>

        <div className="login-box">
          <div>
            <label className="label">
              Email Address
            </label>

            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div>
            <label className="label">
              Password
            </label>

            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <button
            className="login-btn"
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </div>

        <div className="pass-box">
          <p>
            New to CodeHub?{" "}
            <Link to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

