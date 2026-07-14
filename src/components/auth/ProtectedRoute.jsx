import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../authContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <main className="auth-route-loading" role="status">Checking your session...</main>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children;
};

export default ProtectedRoute;
