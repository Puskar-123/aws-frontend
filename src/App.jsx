import { Routes, Route, useNavigate } from "react-router-dom";

import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";

import "./App.css";

import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import Dashboard from "./components/dashboard/Dashboard";
import Profile from "./components/user/Profile";
import Create from "./components/create/Create";
import RepoPage from "./components/repo/RepoPage";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="" />
          <img src={viteLogo} className="vite" alt="" />
        </div>

        <div>
          <h1>CodeHub</h1>
          <p>Own version control system</p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <button onClick={() => navigate("/login")}>Login</button>

          <button
            style={{ marginLeft: "10px" }}
            onClick={() => navigate("/signup")}
          >
            Signup
          </button>
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>Project</h2>
          <p>CodeHub using MERN Stack</p>

          <ul>
            <li>Authentication (JWT)</li>
            <li>Create repositories</li>
            <li>Push / Pull simulation</li>
            <li>User dashboard</li>
          </ul>
        </div>

        <div id="social">
          <h2>Tech Stack</h2>

          <ul>
            <li>React + Vite</li>
            <li>Node.js + Express</li>
            <li>MongoDB</li>
            <li>JWT Authentication</li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  );
}

function App() {
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<Home />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Main */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create" element={<Create />} />

      {/* Profile */}
      <Route path="/profile" element={<Profile />} />
      {/* 🔥 Optional upgrade */}
      {/* <Route path="/profile/:id" element={<Profile />} /> */}

      {/* Repo */}
      <Route path="/repo/:id" element={<RepoPage />} />

      {/* ❌ Removed duplicate/unused routes */}
      {/* Repo component not needed now */}
    </Routes>
  );
}

export default App;