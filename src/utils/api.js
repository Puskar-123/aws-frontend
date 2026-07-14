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
