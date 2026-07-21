import test from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../core/store.js";
import { SEED_STATE } from "../data/seed-data.js";
import { buildIntakeRows, INTAKE_STATUSES } from "../views/intake.js";
import { buildRoleTaskRows } from "../views/tasks.js";

const feedback = Object.freeze({
  contactStatus: "reached",
  responseStatus: "replied",
  learningConclusion: "报告价值未被家长感知",
  intentStatus: "considering",
  objectionType: "none",
  riskChange: "unchanged",
  nextAction: "send-report-explanation",
  nextFollowAt: "2026-07-21T10:00:00+08:00",
  finalResult: "follow-up",
  notes: "已约定明日上午回访"
});

const freshStore = () => createStore(SEED_STATE, null);

test("intake exposes the six fixed statuses and a complete seven-step route row", () => {
  const rows = buildIntakeRows(freshStore().getState());

  assert.deepEqual(INTAKE_STATUSES, ["新进线", "待判定", "待分配", "已分配", "排队", "阻断"]);
  assert.ok(rows.every((row) => row.issue && row.lifecycle && row.hLevel && row.risk && row.f12 && row.channel && row.team && row.subteam && row.sla && row.placement.path));
  assert.equal(rows.find((row) => row.id === "touch-blocked").status, "阻断");
  assert.equal(rows.find((row) => row.id === "annual-renewal-p0").trace.length, 7);
});

test("role task rows enforce the four workspace scopes", () => {
  const state = freshStore().getState();
  const strategy = buildRoleTaskRows(state, "strategy");
  const agent = buildRoleTaskRows(state, "agent");
  const learning = buildRoleTaskRows(state, "learning");
  const sales = buildRoleTaskRows(state, "sales");

  assert.equal(strategy.length, state.users.length);
  assert.ok(agent.every((row) => row.route.team === "agent" || row.task.status === "escalation"));
  assert.ok(learning.every((row) => row.route.team === "learning" && row.route.bindingMode === "unbound"));
  assert.ok(sales.length > 0 && sales.every((row) => row.route.team === "sales" && row.route.bindingMode === "bound"));
});

test("blocked P0 work requires an explicit exemption and does not change score or H", () => {
  const store = freshStore();
  const before = store.getState();

  assert.throws(() => store.submitFeedback("route-touch-blocked", feedback), /Blocked F12/);
  assert.throws(() => store.applyP0Exemption("task-1022", ""), /reason/i);
  const afterExemption = store.applyP0Exemption("task-1022", "支付窗口内需人工确认");
  const route = afterExemption.routes["touch-queued-p0-exemption"];

  assert.equal(route.touchGate.exceptionApplied, true);
  assert.equal(route.touchGate.supervisorVisible, true);
  assert.equal(afterExemption.scores.find((score) => score.userId === "touch-queued-p0-exemption").baseScore, before.scores.find((score) => score.userId === "touch-queued-p0-exemption").baseScore);
  assert.equal(afterExemption.scores.find((score) => score.userId === "touch-queued-p0-exemption").hLevel, before.scores.find((score) => score.userId === "touch-queued-p0-exemption").hLevel);
});

test("feedback is audited and realtime signals update while base-score input remains staged", () => {
  const store = freshStore();
  const before = store.getState();
  const result = store.submitFeedback("task-1009", feedback);
  const after = store.getState();
  const user = after.users.find((candidate) => candidate.id === "annual-renewal-p0");

  assert.equal(result.record.fieldId, "F16");
  assert.equal(after.feedbackRecords.length, (before.feedbackRecords ?? []).length + 1);
  assert.equal(user.taskFeedback.learningConclusion, before.users.find((candidate) => candidate.id === user.id).taskFeedback.learningConclusion);
  assert.equal(after.scores.find((score) => score.userId === user.id).marketingSignal.level, "L2");
  assert.throws(() => store.submitFeedback("task-1009", { ...feedback, nextFollowAt: "tomorrow" }), /ISO/i);
});

test("feedback preview is immutable and next-day simulation alone applies base-score feedback", () => {
  const store = freshStore();
  store.submitFeedback("task-1016", { ...feedback, objectionType: "difficulty", riskChange: "escalated" });
  const beforePreview = store.getState();
  const snapshot = structuredClone(beforePreview);
  const preview = store.previewNextDay("annual-h2-outcomes");

  assert.deepEqual(store.getState(), snapshot);
  assert.notEqual(preview.before.baseScore, preview.after.baseScore);
  const applied = store.simulateNextDay("annual-h2-outcomes");
  const user = applied.users.find((candidate) => candidate.id === "annual-h2-outcomes");
  assert.equal(user.taskFeedback.objectionType, "difficulty");
  assert.ok(applied.feedbackRecords.find((record) => record.userId === user.id).appliedAt);
});

test("monthly T24 P0 remains bound sales through feedback and high-score refund stays H4 repair", () => {
  const store = freshStore();
  const monthly = store.getState().routes["monthly-t24-p0"];
  const refund = store.getState().routes["high-score-risk"];

  assert.deepEqual([monthly.team, monthly.bindingMode, monthly.taskCategory], ["sales", "bound", "conversion"]);
  assert.deepEqual([refund.hLevel, refund.team, refund.taskCategory], ["H4", "sales", "repair"]);
  assert.equal(store.getState().scores.find((score) => score.userId === "high-score-risk").risk.salesFrozen, true);
});
