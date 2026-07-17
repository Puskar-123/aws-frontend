import { authenticatedFetch, parseResponse } from "../../utils/api";

export const API_BASE = "https://api.codehub.sbs";

export async function collaboratorRequest(path, options = {}) {
  const response = await authenticatedFetch(`${API_BASE}${path}`, options);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data?.message || data?.error || "Request failed");
  return data;
}
