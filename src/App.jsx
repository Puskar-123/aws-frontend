import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./components/auth/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Signup from "./components/auth/Signup";
import ComparePage from "./components/compare/ComparePage";
import Create from "./components/create/Create";
import Dashboard from "./components/dashboard/Dashboard";
import Home from "./components/home/Home";
import IssueList from "./components/issues/IssueList";
import IssuePage from "./components/issues/IssuePage";
import NewIssue from "./components/issues/NewIssue";
import NewPullRequest from "./components/pulls/NewPullRequest";
import PullRequestList from "./components/pulls/PullRequestList";
import PullRequestPage from "./components/pulls/PullRequestPage";
import RepoPage from "./components/repo/RepoPage";
import Profile from "./components/user/Profile";

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

const App = () => <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
  <Route path="/create" element={protectedPage(<Create />)} />
  <Route path="/profile" element={protectedPage(<Profile />)} />
  <Route path="/profile/:id" element={protectedPage(<Profile />)} />
  <Route path="/repo/:id/compare" element={protectedPage(<ComparePage />)} />
  <Route path="/repo/:id/pulls/new" element={protectedPage(<NewPullRequest />)} />
  <Route path="/repo/:id/pulls/:number" element={protectedPage(<PullRequestPage />)} />
  <Route path="/repo/:id/pulls" element={protectedPage(<PullRequestList />)} />
  <Route path="/repo/:id/issues/new" element={protectedPage(<NewIssue />)} />
  <Route path="/repo/:id/issues/:number" element={protectedPage(<IssuePage />)} />
  <Route path="/repo/:id/issues" element={protectedPage(<IssueList />)} />
  <Route path="/repo/:id" element={protectedPage(<RepoPage />)} />
</Routes>;

export default App;
