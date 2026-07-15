import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";
export const API_BASE = "https://api.codehub.sbs";
export async function actionRequest(path, options = {}) {
  const response = await authenticatedFetch(`${API_BASE}${path}`, options); const data = await parseResponse(response);
  if (!response.ok) throw new Error(getResponseError(data, `Workflow request failed (${response.status})`));
  return data;
}
export const terminalStatuses = new Set(["success", "failure", "cancelled", "timed_out"]);
export const statusLabel = (status) => ({ success: "Passed", failure: "Failed", timed_out: "Timed out", cancelled: "Cancelled", running: "Running", queued: "Queued" }[status] || status);
export const formatDuration = (milliseconds) => milliseconds === null || milliseconds === undefined ? "—" : milliseconds < 1000 ? `${milliseconds}ms` : `${Math.floor(milliseconds / 60000)}m ${Math.round((milliseconds % 60000) / 1000)}s`;
