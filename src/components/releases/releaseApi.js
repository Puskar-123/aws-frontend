import { authenticatedFetch, getResponseError, parseResponse } from "../../utils/api";

export const API_BASE = "https://api.codehub.sbs";
export async function releaseRequest(path, options = {}) {
  const response = await authenticatedFetch(`${API_BASE}${path}`, options);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(getResponseError(data, `Request failed (${response.status})`));
  return data;
}
export async function downloadReleaseFile(path, fallbackName) {
  const response = await authenticatedFetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const data = await parseResponse(response);
    throw new Error(getResponseError(data, "Download failed"));
  }
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}
export const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};
