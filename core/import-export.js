const PRODUCT_STAGES = {
  monthly: new Set(Array.from({ length: 29 }, (_, index) => `T${index}`)),
  annual: new Set(Array.from({ length: 12 }, (_, index) => `M${index + 1}`))
};

const FLAT_FIELDS = {
  user_id: ["id"],
  child_id: ["childId"],
  product_type: ["productType"],
  stage_code: ["stageCode"],
  issue_type: ["issueType"],
  effective_completion_rate: ["learning", "completionRate"],
  completion_rate: ["learning", "completionRate"],
  active_learning_days_7d: ["learning", "activeDays7"],
  active_days_7d: ["learning", "activeDays7"],
  consecutive_missed_days: ["learning", "consecutiveMissedDays"],
  negative_feedback: ["learning", "negativeFeedback"],
  learning_observed_at: ["learning", "observedAt"],
  observed_at: ["learning", "observedAt"],
  course_evaluation_score: ["courseEvaluation", "normalizedScore"],
  assessment_score: ["assessment", "score"],
  assessment_observed_at: ["assessment", "observedAt"],
  report_generated_at: ["report", "generatedAt"],
  parent_reply_rate_30d: ["parent", "replyRate30d"],
  transaction_observed_at: ["transaction", "observedAt"]
};

const NUMERIC_FIELDS = [
  ["effective_completion_rate", 0, 100],
  ["completion_rate", 0, 100],
  ["active_learning_days_7d", 0, 7],
  ["active_days_7d", 0, 7],
  ["consecutive_missed_days", 0, 365],
  ["course_evaluation_score", 0, 100],
  ["assessment_score", 0, 100],
  ["parent_reply_rate_30d", 0, 1]
];

const NESTED_NUMERIC_FIELDS = [
  [["learning", "completionRate"], 0, 100],
  [["learning", "activeDays7"], 0, 7],
  [["learning", "consecutiveMissedDays"], 0, 365],
  [["courseEvaluation", "score"], 0, 100],
  [["courseEvaluation", "sourceScale"], 0.0001, 100],
  [["courseEvaluation", "normalizedScore"], 0, 100],
  [["courseEvaluation", "validResponses"], 0, 1000000],
  [["assessment", "score"], 0, 100],
  [["report", "dwellMinutes"], 0, 1000000],
  [["parent", "replyRate30d"], 0, 1],
  [["touch", "total7d"], 0, 1000000],
  [["touch", "globalLimit7d"], 0, 1000000],
  [["touch", "channels", "text7d"], 0, 1000000],
  [["touch", "channels", "phone7d"], 0, 1000000],
  [["risk", "deduction"], 0, 30]
];

const NESTED_RECORD_FIELDS = [
  "learning", "courseEvaluation", "assessment", "report", "activity", "parent",
  "touch", "marketing", "transaction", "risk", "taskFeedback"
];

const NESTED_BOOLEAN_FIELDS = [
  ["learning", "firstLessonCompleted"], ["learning", "onTrack"], ["learning", "negativeFeedback"],
  ["assessment", "challengeEligible"], ["report", "opened"], ["report", "shared"],
  ["activity", "participated"], ["parent", "reachable"], ["parent", "messageOpened"],
  ["touch", "p0Exception"], ["touch", "channelLimit"], ["touch", "channelHardLimit"],
  ["marketing", "exposureEligible"], ["marketing", "renewalQuestion"], ["marketing", "couponClick"],
  ["transaction", "unpaid"], ["transaction", "couponUnused"], ["transaction", "paymentFailed"],
  ["risk", "fuse"], ["risk", "salesFrozen"], ["risk", "resolved"], ["risk", "unresolvedService"],
  ["taskFeedback", "contacted"]
];

const NESTED_ENUM_FIELDS = [
  [["assessment", "status"], new Set(["completed", "not-applicable"])],
  [["report", "status"], new Set(["opened", "generated", "not-applicable"])],
  [["activity", "source"], new Set(["IN_APP", "MANUAL"])],
  [["touch", "status"], new Set(["eligible", "queued", "blocked"])],
  [["parent", "preferredChannel"], new Set(["text", "phone"])],
  [["transaction", "status"], new Set(["none", "unpaid", "payment-failed", "pending-payment", "coupon-unused", "coupon-received"])]
];

const MARKETING_EVENTS = new Set(["appointment", "price-question", "coupon-click", "exposed"]);

function clone(value) {
  return structuredClone(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function valueAt(object, path) {
  return path.reduce((value, key) => value?.[key], object);
}

function setAt(object, path, value) {
  let target = object;
  for (const key of path.slice(0, -1)) target = target[key] ??= {};
  target[path.at(-1)] = value;
}

function deepMerge(current, incoming) {
  const output = clone(current ?? {});
  for (const [key, value] of Object.entries(incoming ?? {})) {
    output[key] = isPlainObject(value) && isPlainObject(output[key])
      ? deepMerge(output[key], value)
      : clone(value);
  }
  return output;
}

function numericValue(value) {
  if (!hasValue(value)) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function booleanValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function isIsoDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offset] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText]
    .map((entry) => entry === undefined ? entry : Number(entry));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const calendarDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > calendarDays[month - 1]) return false;
  if (hour === undefined) return true;
  if (hour > 23 || minute > 59 || (second !== undefined && second > 59)) return false;
  if (offset === "Z") return true;

  const [, offsetHour, offsetMinute] = /[+-](\d{2}):(\d{2})/.exec(offset) ?? [];
  return Number(offsetHour) <= 23 && Number(offsetMinute) <= 59;
}

function dateEntries(value, prefix = "") {
  if (!isPlainObject(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(entry)) return dateEntries(entry, field);
    return /(?:_at|_date|At|Date)$/.test(key) ? [[field, entry]] : [];
  });
}

function normalizedValue(key, value) {
  if (NUMERIC_FIELDS.some(([field]) => field === key)) return numericValue(value);
  if (key === "negative_feedback") return booleanValue(value);
  return value;
}

export function normalizeUser(row) {
  const source = clone(row ?? {});
  const normalized = {};

  for (const [key, value] of Object.entries(source)) {
    if (key in FLAT_FIELDS) continue;
    normalized[key] = clone(value);
  }
  for (const [key, path] of Object.entries(FLAT_FIELDS)) {
    if (hasValue(source[key])) setAt(normalized, path, normalizedValue(key, source[key]));
  }
  return normalized;
}

export function parseCsv(text) {
  const source = String(text ?? "");
  const records = [];
  let record = [];
  let cell = "";
  let quoted = false;

  const pushRecord = () => {
    record.push(cell);
    if (record.some((value) => value !== "")) records.push(record);
    record = [];
    cell = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      pushRecord();
    } else {
      cell += character;
    }
  }
  if (quoted) throw new SyntaxError("CSV_UNTERMINATED_QUOTE");
  if (cell !== "" || record.length > 0) pushRecord();
  if (records.length === 0) return [];

  const [header, ...data] = records;
  const keys = header.map((value, index) => index === 0 ? value.replace(/^\uFEFF/, "") : value);
  return data.map((values) => Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ""])));
}

export function parseImport(text, type) {
  const normalizedType = String(type ?? "").toLowerCase();
  if (normalizedType === "csv") return parseCsv(text);
  if (normalizedType !== "json") throw new TypeError("UNSUPPORTED_IMPORT_TYPE");
  const parsed = JSON.parse(String(text ?? ""));
  if (Array.isArray(parsed)) return parsed;
  if (isPlainObject(parsed) && Array.isArray(parsed.users)) return parsed.users;
  throw new TypeError("INVALID_JSON_IMPORT_SHAPE");
}

export function validateUser(row, rowNumber) {
  const errors = [];
  const userId = row?.user_id ?? row?.id;
  const product = row?.product_type ?? row?.productType;
  const stage = row?.stage_code ?? row?.stageCode;

  if (!hasValue(userId)) errors.push({ row: rowNumber, field: "user_id", code: "MISSING_USER_ID", message: "缺少用户统一ID" });
  if (!PRODUCT_STAGES[product]) errors.push({ row: rowNumber, field: "product_type", code: "INVALID_PRODUCT", message: "课程类型必须是monthly或annual" });
  if (!PRODUCT_STAGES[product]?.has(stage)) errors.push({ row: rowNumber, field: "stage_code", code: "INVALID_STAGE", message: "生命周期阶段与课程类型不兼容" });

  for (const field of NESTED_RECORD_FIELDS) {
    if (row?.[field] != null && !isPlainObject(row[field])) {
      errors.push({ row: rowNumber, field, code: "INVALID_SHAPE", message: `${field}必须是对象` });
    }
  }

  for (const [field, value] of dateEntries(row)) {
    if (hasValue(value) && !isIsoDate(value)) errors.push({ row: rowNumber, field, code: "INVALID_DATE", message: "日期必须是有效ISO日期" });
  }
  for (const [field, minimum, maximum] of NUMERIC_FIELDS) {
    const value = row?.[field];
    if (!hasValue(value)) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) {
      errors.push({ row: rowNumber, field, code: "OUT_OF_RANGE", message: `${field}必须在${minimum}到${maximum}之间` });
    }
  }
  for (const [path, minimum, maximum] of NESTED_NUMERIC_FIELDS) {
    const value = valueAt(row, path);
    if (!hasValue(value)) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) {
      const field = path.join(".");
      errors.push({ row: rowNumber, field, code: "OUT_OF_RANGE", message: `${field}必须在${minimum}到${maximum}之间` });
    }
  }
  for (const path of NESTED_BOOLEAN_FIELDS) {
    const value = valueAt(row, path);
    if (value !== undefined && value !== null && typeof value !== "boolean") {
      const field = path.join(".");
      errors.push({ row: rowNumber, field, code: "INVALID_BOOLEAN", message: `${field}必须是布尔值` });
    }
  }
  for (const [path, allowed] of NESTED_ENUM_FIELDS) {
    const value = valueAt(row, path);
    if (hasValue(value) && !allowed.has(value)) {
      const field = path.join(".");
      errors.push({ row: rowNumber, field, code: "INVALID_ENUM", message: `${field}取值不合法` });
    }
  }
  const events = row?.marketing?.events;
  if (events !== undefined && events !== null) {
    if (!Array.isArray(events)) {
      errors.push({ row: rowNumber, field: "marketing.events", code: "INVALID_SHAPE", message: "marketing.events必须是数组" });
    } else if (events.some((event) => typeof event !== "string" || !MARKETING_EVENTS.has(event))) {
      errors.push({ row: rowNumber, field: "marketing.events", code: "INVALID_ENUM", message: "marketing.events包含非法事件" });
    }
  }
  return errors;
}

export function mergeUsers(current, incoming, mode = "update") {
  const users = clone(current ?? []).map(normalizeUser);
  const indexById = new Map(users.map((user, index) => [user.id, index]));
  for (const row of incoming ?? []) {
    const user = normalizeUser(row);
    if (!user.id) continue;
    const existingIndex = indexById.get(user.id);
    if (existingIndex === undefined) {
      indexById.set(user.id, users.length);
      users.push(user);
    } else if (mode === "update") {
      users[existingIndex] = deepMerge(users[existingIndex], user);
    }
  }
  return users;
}

export function importUsers(rows, existing, duplicateMode = "update") {
  if (!new Set(["update", "skip"]).has(duplicateMode)) throw new TypeError("INVALID_DUPLICATE_MODE");
  const errors = [];
  const skipped = [];
  const valid = [];
  const knownIds = new Set((existing ?? []).map((user) => normalizeUser(user).id));

  (rows ?? []).forEach((row, index) => {
    const rowNumber = index + 1;
    const rowErrors = validateUser(row, rowNumber);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }
    const normalized = normalizeUser(row);
    if (duplicateMode === "skip" && knownIds.has(normalized.id)) {
      skipped.push({ row: rowNumber, userId: normalized.id, code: "DUPLICATE_SKIPPED" });
      return;
    }
    knownIds.add(normalized.id);
    valid.push(normalized);
  });

  return { users: mergeUsers(existing, valid, duplicateMode), errors, skipped, imported: valid.length };
}

export function serializeCsv(rows) {
  const headers = [];
  for (const row of rows ?? []) {
    for (const key of Object.keys(row ?? {})) if (!headers.includes(key)) headers.push(key);
  }
  const escape = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    const formula = /^[=+\-@]/.test(text);
    if (formula) text = `'${text}`;
    return formula || /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers, ...(rows ?? []).map((row) => headers.map((header) => row?.[header]))]
    .map((row) => row.map(escape).join(","))
    .join("\r\n") + "\r\n";
}
