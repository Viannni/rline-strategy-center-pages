import test from "node:test";
import assert from "node:assert/strict";
import {
  importUsers,
  mergeUsers,
  parseCsv,
  parseImport,
  serializeCsv,
  validateUser
} from "../core/import-export.js";
import { createStore, STORAGE_KEY, STORAGE_SCHEMA, STORAGE_VERSION } from "../core/store.js";
import {
  selectDashboardMetrics,
  selectMigrationRows,
  selectTasksForRole,
  selectTeamLoad,
  selectUsers
} from "../core/selectors.js";
import { SEED_STATE, scenarioUser } from "../data/seed-data.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    dump(key) { return values.get(key); }
  };
}

test("CSV parser keeps commas, escaped quotes, CRLF, empty cells, and a final newline", () => {
  const rows = parseCsv('user_id,issue,note\r\nU1,"价格,时间","他说""好"""\r\nU2,,\r\n');

  assert.deepEqual(rows, [
    { user_id: "U1", issue: "价格,时间", note: '他说"好"' },
    { user_id: "U2", issue: "", note: "" }
  ]);
});

test("JSON import accepts both an array and a users wrapper", () => {
  assert.deepEqual(parseImport('[{"user_id":"U1"}]', "json"), [{ user_id: "U1" }]);
  assert.deepEqual(parseImport('{"users":[{"user_id":"U2"}]}', "json"), [{ user_id: "U2" }]);
  assert.deepEqual(parseImport("user_id,product_type\nU3,monthly", "csv"), [{ user_id: "U3", product_type: "monthly" }]);
});

test("validator reports missing IDs, invalid products, incompatible stages, dates, and bounded numeric fields", () => {
  const errors = validateUser({
    product_type: "weekly",
    stage_code: "M9",
    learning_observed_at: "2026-02-30",
    effective_completion_rate: "101",
    assessment_score: -1
  }, 7);

  assert.deepEqual(errors.map(({ row, field, code }) => ({ row, field, code })), [
    { row: 7, field: "user_id", code: "MISSING_USER_ID" },
    { row: 7, field: "product_type", code: "INVALID_PRODUCT" },
    { row: 7, field: "stage_code", code: "INVALID_STAGE" },
    { row: 7, field: "learning_observed_at", code: "INVALID_DATE" },
    { row: 7, field: "effective_completion_rate", code: "OUT_OF_RANGE" },
    { row: 7, field: "assessment_score", code: "OUT_OF_RANGE" }
  ]);
});

test("validator also bounds nested current-contract numeric values", () => {
  const errors = validateUser({
    id: "nested",
    productType: "monthly",
    stageCode: "T7",
    learning: { completionRate: 101 },
    parent: { replyRate30d: 1.1 }
  }, 4);

  assert.deepEqual(errors.map(({ field, code }) => ({ field, code })), [
    { field: "learning.completionRate", code: "OUT_OF_RANGE" },
    { field: "parent.replyRate30d", code: "OUT_OF_RANGE" }
  ]);
});

test("partial imports retain valid rows and never overwrite existing data for invalid rows", () => {
  const existing = [scenarioUser("mid-base")];
  const before = structuredClone(existing);
  const result = importUsers([
    { user_id: "mid-base", product_type: "monthly", stage_code: "T16", effective_completion_rate: 91 },
    { user_id: "bad", product_type: "monthly", stage_code: "M9" }
  ], existing, "update");

  assert.equal(result.imported, 1);
  assert.equal(result.errors[0].code, "INVALID_STAGE");
  assert.equal(result.users[0].learning.completionRate, 91);
  assert.deepEqual(existing, before);
});

test("duplicate update is deterministic, preserves nested fields, and does not mutate inputs", () => {
  const existing = [scenarioUser("mid-base")];
  const incoming = [
    { user_id: "mid-base", product_type: "monthly", stage_code: "T16", active_learning_days_7d: 6 },
    { user_id: "mid-base", product_type: "monthly", stage_code: "T16", active_learning_days_7d: 7 }
  ];
  const beforeExisting = structuredClone(existing);
  const beforeIncoming = structuredClone(incoming);
  const users = mergeUsers(existing, incoming, "update");

  assert.equal(users.length, 1);
  assert.equal(users[0].learning.activeDays7, 7);
  assert.equal(users[0].learning.completionRate, beforeExisting[0].learning.completionRate);
  assert.deepEqual(existing, beforeExisting);
  assert.deepEqual(incoming, beforeIncoming);
});

test("duplicate skip keeps the first existing user and reports skipped rows", () => {
  const existing = [scenarioUser("mid-base")];
  const result = importUsers([
    { user_id: "mid-base", product_type: "monthly", stage_code: "T16", active_learning_days_7d: 7 },
    { user_id: "new-user", product_type: "annual", stage_code: "M1" }
  ], existing, "skip");

  assert.equal(result.users.length, 2);
  assert.equal(result.users[0].learning.activeDays7, existing[0].learning.activeDays7);
  assert.deepEqual(result.skipped, [{ row: 1, userId: "mid-base", code: "DUPLICATE_SKIPPED" }]);
});

test("CSV export quotes delimiters and prevents spreadsheet formula execution", () => {
  const csv = serializeCsv([
    { user_id: "U1", note: "A,B", formula: "=SUM(A1:A2)", negative: "-10", safe: "plain" }
  ]);

  assert.equal(csv, 'user_id,note,formula,negative,safe\r\nU1,"A,B","\'=SUM(A1:A2)","\'-10",plain\r\n');
});

test("store loads corrupt or incompatible storage safely with a recoverable notice", () => {
  const corrupt = createStore(SEED_STATE, memoryStorage({ [STORAGE_KEY]: "not json" }));
  const incompatible = createStore(SEED_STATE, memoryStorage({
    [STORAGE_KEY]: JSON.stringify({ schema: STORAGE_SCHEMA, version: STORAGE_VERSION + 1, state: { users: [] } })
  }));
  const malformedHistory = createStore(SEED_STATE, memoryStorage({
    [STORAGE_KEY]: JSON.stringify({ schema: STORAGE_SCHEMA, version: STORAGE_VERSION, state: { users: [], history: [null] } })
  }));

  assert.equal(corrupt.getState().users.length, SEED_STATE.users.length);
  assert.equal(corrupt.getState().storage.notice.code, "STORAGE_RECOVERED");
  assert.equal(incompatible.getState().storage.notice.code, "STORAGE_INCOMPATIBLE");
  assert.equal(malformedHistory.getState().users.length, SEED_STATE.users.length);
  assert.equal(malformedHistory.getState().storage.notice.code, "STORAGE_INCOMPATIBLE");
});

test("store recomputes scores and routes after user changes, keeps non-recursive history, and supports undo and reset", () => {
  const storage = memoryStorage();
  const store = createStore(SEED_STATE, storage);
  const seedUser = store.getState().users.find((user) => user.id === "mid-base");
  const seedScore = store.getState().scores.find((score) => score.userId === "mid-base");

  store.replaceUsers([{ ...seedUser, risk: { ...seedUser.risk, fuse: true, type: "退款" } }]);
  const updated = store.getState();
  assert.equal(updated.scores.find((score) => score.userId === "mid-base").hLevel, "H4");
  assert.equal(updated.routes["mid-base"].taskCategory, "repair");
  assert.equal(updated.history.length, 1);
  assert.equal("history" in updated.history[0], false);

  for (let index = 0; index < 11; index += 1) store.update((state) => ({ ...state, generatedAt: `2026-07-${index + 1}` }));
  assert.equal(store.getState().history.length, 10);
  assert.equal(store.undo(), true);
  store.reset();
  assert.deepEqual(store.getState().users, SEED_STATE.users);
  assert.equal(store.getState().scores.find((score) => score.userId === "mid-base").baseScore, seedScore.baseScore);
  assert.match(storage.dump(STORAGE_KEY), /"schema":"rline-strategy-center-state"/);
});

test("store state and selectors are pure snapshots that do not mutate source state", () => {
  const store = createStore(SEED_STATE, memoryStorage());
  const state = store.getState();
  const before = structuredClone(state);
  const users = selectUsers(state);
  const dashboard = selectDashboardMetrics(state);
  const tasks = selectTasksForRole(state, "sales");
  const teamLoad = selectTeamLoad(state);
  const migration = selectMigrationRows(state);

  users[0].user.id = "mutated";
  dashboard.totalUsers = 0;
  tasks.push({ id: "mutated" });
  teamLoad[0].count = 0;
  migration.reverse();

  assert.deepEqual(state, before);
  assert.equal(selectUsers(state).length, SEED_STATE.users.length);
  assert.equal(selectDashboardMetrics(state).totalUsers, SEED_STATE.users.length);
  assert.ok(selectTasksForRole(state, "sales").every((task) => task.assigneeTeam === "sales"));
  assert.ok(selectTeamLoad(state).every((entry) => entry.count > 0));
  assert.ok(selectTeamLoad(state).every((entry) => entry.userIds.length === entry.count));
  assert.ok(selectMigrationRows(state).every((entry) => entry.userId && entry.hLevel));
});
