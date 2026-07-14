import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

export const API_BASE = "https://api.codehub.sbs";
export const discoveryRequest = async (path, options = {}) => {
  const response = await authenticatedFetch(`${API_BASE}${path}`, options);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(getResponseError(data, `Request failed (${response.status})`));
  return data;
};
