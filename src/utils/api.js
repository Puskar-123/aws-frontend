export const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  const text = await response.text();
  return text ? { error: text } : {};
};

export const getResponseError = (data, fallback) => {
  const candidate = data?.error || data?.message;
  if (typeof candidate !== "string") return fallback;
  const message = candidate.replace(/[\r\n\t]+/g, " ").trim();
  return message && message.length <= 300 ? message : fallback;
};

const readTokenValue = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("{") && !trimmed.startsWith('"')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed.trim();
    return String(parsed?.token || parsed?.authToken || parsed?.accessToken || "").trim();
  } catch {
    return "";
  }
};

export const getAuthToken = () => {
  for (const key of ["token", "authToken", "accessToken"]) {
    const token = readTokenValue(localStorage.getItem(key));
    if (token) return token;
  }
  for (const key of ["auth", "user"]) {
    const token = readTokenValue(localStorage.getItem(key));
    if (token) return token;
  }
  return "";
};

export const authenticatedFetch = (url, options = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
};
