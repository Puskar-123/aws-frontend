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
import FileEditorPage from "./components/editor/FileEditorPage";
import NotificationsPage from "./components/notifications/NotificationsPage";
import ExplorePage from "./components/explore/ExplorePage";
import SearchResultsPage from "./components/search/SearchResultsPage";
import PublicProfilePage from "./components/search/PublicProfilePage";
import CollaboratorSettingsPage from "./components/collaborators/CollaboratorSettingsPage";
import InvitationsPage from "./components/collaborators/InvitationsPage";
import BranchProtectionSettingsPage from "./components/branches/BranchProtectionSettingsPage";
import InsightsPage from "./components/insights/InsightsPage";
import CliDocsPage from "./components/docs/CliDocsPage";
import ReleaseListPage from "./components/releases/ReleaseListPage";
import NewReleasePage from "./components/releases/NewReleasePage";
import ReleaseDetailPage from "./components/releases/ReleaseDetailPage";
import ActionsPage from "./components/actions/ActionsPage";
import WorkflowRunPage from "./components/actions/WorkflowRunPage";
import ChatPage from "./components/chat/ChatPage";
import RepositoryChatPage from "./components/chat/RepositoryChatPage";

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

const App = () => <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/docs/cli" element={<CliDocsPage />} />
  <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
  <Route path="/create" element={protectedPage(<Create />)} />
  <Route path="/profile" element={protectedPage(<Profile />)} />
  <Route path="/profile/:id" element={protectedPage(<Profile />)} />
  <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />
  <Route path="/chat" element={protectedPage(<ChatPage />)} />
  <Route path="/invitations" element={protectedPage(<InvitationsPage />)} />
  <Route path="/explore" element={protectedPage(<ExplorePage />)} />
  <Route path="/search" element={protectedPage(<SearchResultsPage />)} />
  <Route path="/users/:username" element={protectedPage(<PublicProfilePage />)} />
  <Route path="/repo/:id/edit" element={protectedPage(<FileEditorPage />)} />
  <Route path="/repo/:id/settings/collaborators" element={protectedPage(<CollaboratorSettingsPage />)} />
  <Route path="/repo/:id/settings/access" element={protectedPage(<CollaboratorSettingsPage />)} />
  <Route path="/repo/:id/settings/branches" element={protectedPage(<BranchProtectionSettingsPage />)} />
  <Route path="/repo/:id/compare" element={protectedPage(<ComparePage />)} />
  <Route path="/repo/:id/chat" element={protectedPage(<RepositoryChatPage />)} />
  <Route path="/repo/:id/pulls/new" element={protectedPage(<NewPullRequest />)} />
  <Route path="/repo/:id/pulls/:number" element={protectedPage(<PullRequestPage />)} />
  <Route path="/repo/:id/pulls" element={protectedPage(<PullRequestList />)} />
  <Route path="/repo/:id/issues/new" element={protectedPage(<NewIssue />)} />
  <Route path="/repo/:id/issues/:number" element={protectedPage(<IssuePage />)} />
  <Route path="/repo/:id/issues" element={protectedPage(<IssueList />)} />
  <Route path="/repo/:id/releases/new" element={protectedPage(<NewReleasePage />)} />
  <Route path="/repo/:id/releases/:releaseId" element={<ReleaseDetailPage />} />
  <Route path="/repo/:id/releases" element={<ReleaseListPage />} />
  <Route path="/repo/:id/actions/runs/:runId" element={<WorkflowRunPage />} />
  <Route path="/repo/:id/actions" element={<ActionsPage />} />
  <Route path="/repo/:id/insights/commits" element={protectedPage(<InsightsPage view="commits" />)} />
  <Route path="/repo/:id/insights/contributors" element={protectedPage(<InsightsPage view="contributors" />)} />
  <Route path="/repo/:id/insights/activity" element={protectedPage(<InsightsPage view="activity" />)} />
  <Route path="/repo/:id/insights" element={protectedPage(<InsightsPage view="overview" />)} />
  <Route path="/repo/:id" element={protectedPage(<RepoPage />)} />
</Routes>;

export default App;
