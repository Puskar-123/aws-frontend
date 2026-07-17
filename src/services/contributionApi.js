import { authenticatedFetch, getResponseError, parseResponse } from "../utils/api";

export const API_BASE = String(import.meta.env.VITE_API_URL || "https://api.codehub.sbs").replace(/\/$/, "");
export async function contributionRequest(path, options = {}) {
  const request = { ...options };
  if (request.body && typeof request.body !== "string" && !(request.body instanceof FormData)) request.body = JSON.stringify(request.body);
  const response = await authenticatedFetch(`${API_BASE}${path}`, request);
  const data = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(getResponseError(data, "Unable to complete contribution request"));
    error.code = data?.code; error.status = response.status; throw error;
  }
  return data;
}
