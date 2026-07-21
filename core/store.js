import { scoreUsers } from "./scoring-engine.js";
import { routeUser } from "./routing-engine.js";
import { importUsers, normalizeUser, validateUser } from "./import-export.js";

export const STORAGE_KEY = "rline-strategy-center:state";
export const STORAGE_SCHEMA = "rline-strategy-center-state";
export const STORAGE_VERSION = 1;

export const FEEDBACK_OPTIONS = Object.freeze({
  contactStatus: ["reached", "unreached", "not-contacted"],
  responseStatus: ["replied", "unresolved", "no-response", "not-applicable"],
  intentStatus: ["none", "considering", "ready", "declined"],
  objectionType: ["none", "difficulty", "time", "price", "service"],
  riskChange: ["unchanged", "escalated", "resolved"],
  nextAction: ["send-report-explanation", "learning-plan", "send-payment-link", "service-repair", "wait-window"],
  finalResult: ["follow-up", "resolved", "converted", "closed-lost"]
});

const clone = (value) => structuredClone(value);

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const USER_RECORD_FIELDS = [
  "learning",
  "courseEvaluation",
  "assessment",
  "report",
  "parent",
  "taskFeedback",
  "risk",
  "marketing",
  "transaction",
  "activity",
  "touch"
];

function hasUsableId(user) {
  const id = user?.user_id ?? user?.id;
  return (typeof id === "string" && id.trim() !== "") || (typeof id === "number" && Number.isFinite(id));
}

function hasScorerAndRouterShapes(user) {
  if (!USER_RECORD_FIELDS.every((field) => user[field] === undefined || user[field] === null || isRecord(user[field]))) return false;
  const events = user.marketing?.events;
  return events === undefined || events === null || Array.isArray(events);
}

function isValidStoredUser(user, rowNumber) {
  return isRecord(user)
    && hasUsableId(user)
    && hasScorerAndRouterShapes(user)
    && validateUser(user, rowNumber).length === 0;
}

function hasValidUsers(users) {
  if (!Array.isArray(users) || !users.every(isValidStoredUser)) return false;
  const ids = users.map((user) => user.user_id ?? user.id);
  return new Set(ids).size === ids.length;
}

function isValidHistorySnapshot(snapshot) {
  return isRecord(snapshot) && snapshot.history === undefined && hasValidUsers(snapshot.users);
}

function normalizeStoredState(state) {
  return {
    ...state,
    users: state.users.map(normalizeUser),
    ...(state.history === undefined ? {} : { history: state.history.map((snapshot) => ({ ...snapshot, users: snapshot.users.map(normalizeUser) })) })
  };
}

function defaultStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function snapshot(state) {
  const { history, scores, routes, storage, ...base } = state;
  return clone(base);
}

function historySnapshot(state) {
  return snapshot(state);
}

function isStrictIso(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function normalizeFeedback(feedback) {
  if (!isRecord(feedback)) throw new TypeError("Feedback must be an object");
  const normalized = {};
  for (const [field, options] of Object.entries(FEEDBACK_OPTIONS)) {
    const value = String(feedback[field] ?? "");
    if (!options.includes(value)) throw new RangeError(`Invalid feedback ${field}`);
    normalized[field] = value;
  }
  if (!isStrictIso(feedback.nextFollowAt)) throw new RangeError("nextFollowAt must be a strict ISO timestamp");
  normalized.nextFollowAt = feedback.nextFollowAt;
  normalized.learningConclusion = String(feedback.learningConclusion ?? "").trim();
  normalized.notes = String(feedback.notes ?? "").trim();
  return normalized;
}

function feedbackToTaskFeedback(feedback) {
  return {
    contacted: feedback.contactStatus === "reached",
    replyStatus: feedback.responseStatus === "no-response" ? "unreached" : feedback.responseStatus,
    learningConclusion: feedback.learningConclusion || null,
    marketingIntent: feedback.intentStatus,
    objectionType: feedback.objectionType,
    riskChange: feedback.riskChange,
    nextAction: feedback.nextAction,
    nextFollowUpAt: feedback.nextFollowAt,
    finalResult: feedback.finalResult
  };
}

function realtimeProjection(user, signal) {
  if (!signal) return user;
  const projected = clone(user);
  const feedback = signal.feedback;
  // Only F13/F14/F15 feedback is projected realtime; F16 base-score inputs stay staged.
  const events = new Set(projected.marketing?.events ?? []);
  if (feedback.intentStatus === "considering") events.add("price-question");
  if (feedback.intentStatus === "ready") events.add("appointment");
  projected.marketing = {
    ...(projected.marketing ?? {}),
    events: [...events],
    renewalQuestion: projected.marketing?.renewalQuestion || ["considering", "ready"].includes(feedback.intentStatus)
  };
  if (feedback.nextAction === "send-payment-link") {
    projected.transaction = { ...(projected.transaction ?? {}), status: "pending-payment", unpaid: true, observedAt: signal.submittedAt };
  }
  if (feedback.riskChange === "escalated") {
    projected.risk = {
      ...(projected.risk ?? {}),
      fuse: true,
      type: "F15风险升级",
      deduction: Math.max(Number(projected.risk?.deduction) || 0, 20),
      salesFrozen: true,
      resolved: false
    };
  } else if (feedback.riskChange === "resolved") {
    projected.risk = { ...(projected.risk ?? {}), fuse: false, resolved: true, salesFrozen: false };
  }
  return projected;
}

function nextDayState(base, userId, appliedAt = null) {
  const next = snapshot(base);
  const records = (next.feedbackRecords ?? []).map((record) => clone(record));
  const pending = records.filter((record) => record.userId === userId && !record.appliedAt);
  if (pending.length === 0) return { next, applied: 0 };
  const latest = pending.at(-1);
  next.users = next.users.map((user) => user.id === userId
    ? { ...user, taskFeedback: { ...(user.taskFeedback ?? {}), ...feedbackToTaskFeedback(latest.feedback) } }
    : user);
  if (appliedAt) {
    pending.forEach((record) => { record.appliedAt = appliedAt; });
    next.feedbackRecords = records;
  }
  return { next, applied: pending.length };
}

function taskUserId(state, taskId) {
  const existing = (state.tasks ?? []).find((task) => task.id === taskId);
  if (existing) return existing.userId;
  return String(taskId).startsWith("route-") ? String(taskId).slice("route-".length) : null;
}

function derive(base, history, storageMeta) {
  const users = clone(Array.isArray(base.users) ? base.users : []);
  const realtimeSignals = isRecord(base.realtimeSignals) ? base.realtimeSignals : {};
  const scoringUsers = users.map((user) => realtimeProjection(user, realtimeSignals[user.id]));
  const scores = scoreUsers(scoringUsers);
  const scoreById = new Map(scores.map((score) => [score.userId, score]));
  const routes = Object.fromEntries(scoringUsers.map((user) => [user.id, routeUser(user, scoreById.get(user.id))]));
  return { ...snapshot(base), users, feedbackRecords: clone(base.feedbackRecords ?? []), realtimeSignals: clone(realtimeSignals), scores, routes, history: history.map(historySnapshot), storage: storageMeta };
}

function readStoredState(seed, storage) {
  const meta = { key: STORAGE_KEY, schema: STORAGE_SCHEMA, version: STORAGE_VERSION, notice: null };
  if (!storage) return { state: clone(seed), meta };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: clone(seed), meta };
    const parsed = JSON.parse(raw);
    const storedState = parsed?.state;
    const validHistory = storedState?.history === undefined
      || (Array.isArray(storedState.history) && storedState.history.every(isValidHistorySnapshot));
    if (
      parsed?.schema !== STORAGE_SCHEMA
      || parsed?.version !== STORAGE_VERSION
      || !isRecord(storedState)
      || !hasValidUsers(storedState.users)
      || !validHistory
    ) {
      const invalidCurrentUsers = isRecord(storedState)
        && Array.isArray(storedState.users)
        && !hasValidUsers(storedState.users);
      const invalidHistoryUsers = Array.isArray(storedState?.history)
        && storedState.history.some((snapshot) => isRecord(snapshot)
          && Array.isArray(snapshot.users)
          && !hasValidUsers(snapshot.users));
      const notice = invalidCurrentUsers || invalidHistoryUsers ? "STORAGE_INVALID_USER" : "STORAGE_INCOMPATIBLE";
      return { state: clone(seed), meta: { ...meta, notice: { code: notice, recoverable: true } } };
    }
    return { state: normalizeStoredState(storedState), meta };
  } catch {
    return { state: clone(seed), meta: { ...meta, notice: { code: "STORAGE_RECOVERED", recoverable: true } } };
  }
}

function persist(storage, state) {
  if (!storage) return;
  const saved = snapshot(state);
  saved.history = state.history.map(historySnapshot);
  storage.setItem(STORAGE_KEY, JSON.stringify({ schema: STORAGE_SCHEMA, version: STORAGE_VERSION, state: saved }));
}

export function createStore(seedState, storage = defaultStorage()) {
  const loaded = readStoredState(seedState, storage);
  let state = derive(loaded.state, Array.isArray(loaded.state.history) ? loaded.state.history.slice(-10) : [], loaded.meta);
  const listeners = new Set();

  const notify = () => listeners.forEach((listener) => listener(clone(state)));
  const save = () => {
    try {
      persist(storage, state);
    } catch {
      state = { ...state, storage: { ...state.storage, notice: { code: "STORAGE_UNAVAILABLE", recoverable: true } } };
    }
  };
  const commit = (next, keepHistory = true) => {
    const history = keepHistory ? [...state.history, historySnapshot(state)].slice(-10) : [];
    state = derive(next, history, state.storage);
    save();
    notify();
    return clone(state);
  };

  return {
    getState: () => clone(state),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(recipe) {
      const draft = clone(state);
      const next = recipe(draft) ?? draft;
      return commit(next);
    },
    replaceUsers(users) {
      return this.update((current) => ({ ...current, users: clone(users) }));
    },
    importRows(rows, duplicateMode = "update") {
      const result = importUsers(rows, state.users, duplicateMode);
      if (result.imported > 0) commit({ ...state, users: result.users });
      return { ...result, users: clone(result.users) };
    },
    submitFeedback(taskId, feedback) {
      const userId = taskUserId(state, taskId);
      const user = state.users.find((candidate) => candidate.id === userId);
      if (!user) throw new Error(`Unknown task: ${taskId}`);
      const route = state.routes[userId];
      if (route?.touchGate?.status === "blocked" && feedback?.contactStatus !== "not-contacted") {
        throw new Error("Blocked F12 task cannot submit a contact result");
      }
      const normalized = normalizeFeedback(feedback);
      const submittedAt = new Date().toISOString();
      const record = {
        id: `F16-${userId}-${(state.feedbackRecords ?? []).length + 1}`,
        fieldId: "F16",
        taskId,
        userId,
        submittedAt,
        appliedAt: null,
        feedback: normalized
      };
      const next = {
        ...state,
        feedbackRecords: [...(state.feedbackRecords ?? []), record],
        realtimeSignals: { ...(state.realtimeSignals ?? {}), [userId]: { feedback: normalized, submittedAt, recordId: record.id } },
        tasks: (state.tasks ?? []).map((task) => task.id === taskId ? { ...task, status: "in-progress" } : task)
      };
      commit(next);
      return { record: clone(record), state: clone(state) };
    },
    previewNextDay(userId) {
      const user = state.users.find((candidate) => candidate.id === userId);
      if (!user) throw new Error(`Unknown user: ${userId}`);
      const staged = nextDayState(state, userId);
      const after = derive(staged.next, state.history, state.storage);
      const beforeScore = state.scores.find((score) => score.userId === userId);
      const afterScore = after.scores.find((score) => score.userId === userId);
      return {
        userId,
        appliedRecords: staged.applied,
        before: { rawBaseScore: beforeScore.rawBaseScore, baseScore: beforeScore.baseScore, hLevel: beforeScore.hLevel, f13: beforeScore.marketingSignal.level, f14: beforeScore.transactionSignal.priority, f12: state.routes[userId].touchGate.status, team: state.routes[userId].team, task: state.routes[userId].taskSubtype },
        after: { rawBaseScore: afterScore.rawBaseScore, baseScore: afterScore.baseScore, hLevel: afterScore.hLevel, f13: afterScore.marketingSignal.level, f14: afterScore.transactionSignal.priority, f12: after.routes[userId].touchGate.status, team: after.routes[userId].team, task: after.routes[userId].taskSubtype }
      };
    },
    simulateNextDay(userId) {
      const staged = nextDayState(state, userId, new Date().toISOString());
      if (staged.applied === 0) throw new Error("No staged F16 feedback for this user");
      return commit(staged.next);
    },
    applyP0Exemption(taskId, reason) {
      const userId = taskUserId(state, taskId);
      const route = state.routes[userId];
      const text = String(reason ?? "").trim();
      if (!text) throw new Error("P0 exemption reason is required");
      if (!userId || route?.priority !== "P0") throw new Error("P0 exemption is only available to P0 tasks");
      return commit({
        ...state,
        users: state.users.map((user) => user.id === userId ? {
          ...user,
          touch: { ...(user.touch ?? {}), p0Exception: true, exceptionReason: text, p0ExemptionReason: text }
        } : user)
      });
    },
    reassignTask(taskId, assigneeTeam) {
      const userId = taskUserId(state, taskId);
      if (!userId || !["agent", "learning", "sales", "after-sales", "learning-intervention", "learning-planning"].includes(assigneeTeam)) {
        throw new Error("Invalid task reassignment");
      }
      const existing = (state.tasks ?? []).some((task) => task.id === taskId);
      const task = { id: taskId, userId, status: "open", assigneeTeam, simulated: true };
      return commit({
        ...state,
        tasks: existing
          ? state.tasks.map((item) => item.id === taskId ? { ...item, assigneeTeam, simulated: true } : item)
          : [...(state.tasks ?? []), task]
      });
    },
    undo() {
      const previous = state.history.at(-1);
      if (!previous) return false;
      state = derive(previous, state.history.slice(0, -1), state.storage);
      save();
      notify();
      return true;
    },
    reset() {
      state = derive(seedState, [], state.storage);
      save();
      notify();
      return clone(state);
    }
  };
}
