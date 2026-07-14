import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken, parseResponse } from "./utils/api";

const API_BASE = "https://api.codehub.sbs";
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUserState] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const validating = useRef(null);
  const lastValidatedAt = useRef(0);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    for (const key of ["authToken", "accessToken", "auth", "user"]) localStorage.removeItem(key);
    setCurrentUserState(null);
    setUser(null);
    window.dispatchEvent(new Event("codehub:clear-protected-state"));
  }, []);

  const logout = useCallback(({ redirect = true } = {}) => {
    clearSession();
    setIsLoading(false);
    if (redirect) navigate("/login", { replace: true });
  }, [clearSession, navigate]);

  const validateSession = useCallback(async () => {
    if (validating.current) return validating.current;
    const token = getAuthToken();
    if (!token) {
      clearSession();
      setIsLoading(false);
      return false;
    }
    setIsLoading(true);
    validating.current = (async () => {
      try {
        const response = await fetch(`${API_BASE}/user/session`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const data = await parseResponse(response);
        if (!response.ok || !data.user?._id) throw new Error("Session invalid");
        const id = String(data.user._id);
        localStorage.setItem("userId", id);
        setCurrentUserState(id);
        setUser(data.user);
        lastValidatedAt.current = Date.now();
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        setIsLoading(false);
        validating.current = null;
      }
    })();
    return validating.current;
  }, [clearSession]);

  const login = useCallback(async ({ token, userId }) => {
    localStorage.setItem("token", token);
    if (userId) localStorage.setItem("userId", String(userId));
    return validateSession();
  }, [validateSession]);

  const setCurrentUser = useCallback((value) => {
    const id = value?._id || value || null;
    setCurrentUserState(id ? String(id) : null);
    if (!id) setUser(null);
  }, []);

  useEffect(() => { validateSession(); }, [validateSession]);

  useEffect(() => {
    const handlePageShow = (event) => { if (event.persisted || !getAuthToken()) validateSession(); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && (!getAuthToken() || Date.now() - lastValidatedAt.current > 60000)) validateSession();
    };
    const handleUnauthorized = () => logout();
    const handleStorage = (event) => { if (["token", "userId"].includes(event.key)) validateSession(); };
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("codehub:unauthorized", handleUnauthorized);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("codehub:unauthorized", handleUnauthorized);
      window.removeEventListener("storage", handleStorage);
    };
  }, [logout, validateSession]);

  return <AuthContext.Provider value={{ currentUser, setCurrentUser, user, token: getAuthToken(), isAuthenticated: Boolean(currentUser && getAuthToken()), isLoading, login, logout, validateSession }}>{children}</AuthContext.Provider>;
};
