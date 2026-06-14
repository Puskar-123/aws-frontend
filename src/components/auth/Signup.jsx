import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";

import "./auth.css";
import logo from "../../assets/github-mark-white.svg";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  const { setCurrentUser } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:3002/signup",
        {
          email,
          username,
          password,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "userId",
        res.data.userId
      );

      setCurrentUser(res.data.userId);

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Signup Failed!");
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
        <h1 className="auth-title">
          Create Account
        </h1>

        <div className="login-box">
          <div>
            <label className="label">
              Username
            </label>

            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
            />
          </div>

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
            onClick={handleSignup}
          >
            {loading ? "Loading..." : "Signup"}
          </button>
        </div>

        <div className="pass-box">
          <p>
            Already have an account?{" "}
            <Link to="/auth">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;