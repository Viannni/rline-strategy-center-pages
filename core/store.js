import { scoreUsers } from "./scoring-engine.js";
import { routeUser } from "./routing-engine.js";
import { importUsers, normalizeUser, validateUser } from "./import-export.js";

export const STORAGE_KEY = "rline-strategy-center:state";
export const STORAGE_SCHEMA = "rline-strategy-center-state";
export const STORAGE_VERSION = 1;

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

function derive(base, history, storageMeta) {
  const users = clone(Array.isArray(base.users) ? base.users : []);
  const scores = scoreUsers(users);
  const scoreById = new Map(scores.map((score) => [score.userId, score]));
  const routes = Object.fromEntries(users.map((user) => [user.id, routeUser(user, scoreById.get(user.id))]));
  return { ...snapshot(base), users, scores, routes, history: history.map(historySnapshot), storage: storageMeta };
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
