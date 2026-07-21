import { scoreUsers } from "./scoring-engine.js";
import { routeUser } from "./routing-engine.js";
import { importUsers } from "./import-export.js";

export const STORAGE_KEY = "rline-strategy-center:state";
export const STORAGE_SCHEMA = "rline-strategy-center-state";
export const STORAGE_VERSION = 1;

const clone = (value) => structuredClone(value);

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

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
      || (Array.isArray(storedState.history) && storedState.history.every(isRecord));
    if (
      parsed?.schema !== STORAGE_SCHEMA
      || parsed?.version !== STORAGE_VERSION
      || !isRecord(storedState)
      || !Array.isArray(storedState.users)
      || !validHistory
    ) {
      return { state: clone(seed), meta: { ...meta, notice: { code: "STORAGE_INCOMPATIBLE", recoverable: true } } };
    }
    return { state: parsed.state, meta };
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
