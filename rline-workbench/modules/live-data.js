const LIVE_NESTED_KEYS = ["current", "references", "sop", "weekly", "monthly", "report", "history"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateLivePayload(payload) {
  const current = payload?.current;
  if (!isRecord(payload) || !isRecord(current)) return false;
  if (!isNonEmptyString(current.date) || !isNonEmptyString(current.stage) || !isNonEmptyString(current.asOf)) return false;
  if (!Array.isArray(current.points) || current.points.length === 0) return false;
  return current.points.every((point) => isRecord(point) && isNonEmptyString(point.time));
}

export function mergeLiveSnapshot(fallback, payload) {
  if (!validateLivePayload(payload)) throw new Error("实时快照格式不完整");
  const merged = { ...fallback, ...payload };
  LIVE_NESTED_KEYS.forEach((key) => {
    if (isRecord(payload[key])) merged[key] = { ...(fallback[key] || {}), ...payload[key] };
  });
  return merged;
}
