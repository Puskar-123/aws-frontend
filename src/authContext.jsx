import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken, parseResponse } from "./utils/api";

const API_BASE = "https://api.codehub.sbs";
export const TOKEN_KEY = "token";
export const USER_ID_KEY = "userId";
const REVALIDATE_AFTER_MS = 60000;
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => getAuthToken());
  const [currentUser, setCurrentUserState] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const validation = useRef(null);
  const validationGeneration = useRef(0);
  const lastValidatedAt = useRef(0);

  const clearSession = useCallback(() => {
    validationGeneration.current += 1;
    validation.current = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    for (const key of ["authToken", "accessToken", "auth", "user"]) localStorage.removeItem(key);
    setToken("");
    setCurrentUserState(null);
    setUser(null);
    setIsValidating(false);
    lastValidatedAt.current = 0;
    window.dispatchEvent(new Event("codehub:clear-protected-state"));
  }, []);

  const logout = useCallback(({ redirect = true } = {}) => {
    clearSession();
    setIsLoading(false);
    if (redirect) navigate("/login", { replace: true });
  }, [clearSession, navigate]);

  const validateSession = useCallback(async () => {
    const storedToken = getAuthToken();
    if (!storedToken) {
      clearSession();
      setIsLoading(false);
      return false;
    }
    if (validation.current?.token === storedToken) return validation.current.promise;

    const generation = ++validationGeneration.current;
    setToken(storedToken);
    setIsLoading(true);
    setIsValidating(true);
    const promise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/user/session`, {
          headers: { Authorization: `Bearer ${storedToken}` },
          cache: "no-store",
        });
        const data = await parseResponse(response);
        if (!response.ok || !data.user?._id) throw new Error("Session invalid");
        if (generation !== validationGeneration.current || getAuthToken() !== storedToken) return false;
        const id = String(data.user._id);
        localStorage.setItem(USER_ID_KEY, id);
        setCurrentUserState(id);
        setUser(data.user);
        lastValidatedAt.current = Date.now();
        return true;
      } catch {
        if (generation === validationGeneration.current) clearSession();
        return false;
      } finally {
        if (generation === validationGeneration.current) {
          setIsLoading(false);
          setIsValidating(false);
          validation.current = null;
        }
      }
    })();
    validation.current = { token: storedToken, promise };
    return promise;
  }, [clearSession]);

  const login = useCallback(async ({ token: nextToken, userId }) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    if (userId) localStorage.setItem(USER_ID_KEY, String(userId));
    setToken(nextToken);
    return validateSession();
  }, [validateSession]);

  const setCurrentUser = useCallback((value) => {
    const id = value?._id || value || null;
    setCurrentUserState(id ? String(id) : null);
    if (!id) setUser(null);
  }, []);

  useEffect(() => { validateSession(); }, [validateSession]);

  useEffect(() => {
    const handlePageShow = (event) => {
      if (!getAuthToken()) {
        clearSession();
        setIsLoading(false);
      } else if (event.persisted) validateSession();
    };
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!getAuthToken()) {
        clearSession();
        setIsLoading(false);
      } else if (Date.now() - lastValidatedAt.current > REVALIDATE_AFTER_MS) validateSession();
    };
    const handleUnauthorized = () => logout();
    const handleStorage = (event) => {
      if (event.key !== TOKEN_KEY) return;
      if (!event.newValue) {
        clearSession();
        setIsLoading(false);
      } else validateSession();
    };
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
  }, [clearSession, logout, validateSession]);

  const isAuthenticated = Boolean(user && currentUser && token);
  return <AuthContext.Provider value={{ currentUser, setCurrentUser, user, token, isAuthenticated, isLoading, isValidating, login, logout, validateSession }}>{children}</AuthContext.Provider>;
};
