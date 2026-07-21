import test from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../core/store.js";
import { selectTasksForRole } from "../core/selectors.js";
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

function scoreSnapshot(state, userId) {
  const score = state.scores.find((candidate) => candidate.userId === userId);
  return { rawBaseScore: score.rawBaseScore, baseScore: score.baseScore, hLevel: score.hLevel };
}

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
  assert.ok(agent.every((row) => row.task.assigneeTeam === "agent" || row.route.team === "agent" || row.task.status === "escalation"));
  assert.ok(learning.every((row) => ["learning", "after-sales", "learning-intervention", "learning-planning"].includes(row.task.assigneeTeam) || (row.route.team === "learning" && row.route.bindingMode === "unbound")));
  assert.ok(sales.length > 0 && sales.every((row) => row.task.assigneeTeam === "sales" || (row.route.team === "sales" && row.route.bindingMode === "bound")));
});

test("a renewal H4 stays visible to Sales as front owner while its explicit after-sales task stays in Learning", () => {
  const state = freshStore().getState();
  const learningRefund = buildRoleTaskRows(state, "learning").find((row) => row.userId === "high-score-risk");
  const salesRefund = buildRoleTaskRows(state, "sales").find((row) => row.userId === "high-score-risk");

  assert.equal(learningRefund.task.assigneeTeam, "after-sales");
  assert.equal(learningRefund.task.category, "repair");
  assert.equal(salesRefund.route.team, "sales");
  assert.equal(salesRefund.frozenRepair, true);
  assert.equal(salesRefund.internalSupportOwner, "learning/after-sales");
});

test("role task selection recognizes assigneeTeam, subteam, and role assignments", () => {
  const state = freshStore().getState();
  const tasks = [
    { id: "assignment-team", userId: "team", assigneeTeam: "after-sales" },
    { id: "assignment-subteam", userId: "subteam", subteam: "learning-planning" },
    { id: "assignment-role", userId: "role", role: "learning-intervention" }
  ];

  assert.deepEqual(selectTasksForRole({ ...state, tasks }, "learning").map((task) => task.id), ["assignment-team", "assignment-subteam", "assignment-role"]);
});

test("an unassigned Sales-front renewal H4 row is a frozen repair state with internal support and no conversion controls", () => {
  const state = freshStore().getState();
  const withoutSupportAssignment = { ...state, tasks: state.tasks.filter((task) => task.userId !== "high-score-risk") };
  const row = buildRoleTaskRows(withoutSupportAssignment, "sales").find((candidate) => candidate.userId === "high-score-risk");

  assert.equal(row.route.team, "sales");
  assert.equal(row.route.bindingMode, "bound");
  assert.equal(row.task.category, "repair");
  assert.equal(row.frozenRepair, true);
  assert.equal(row.internalSupportOwner, "learning/after-sales");
  assert.equal(row.conversionControls, false);
});

test("a Sales-assigned renewal H4 task is rendered as repair even when its stored task category is conversion", () => {
  const state = freshStore().getState();
  const tasks = state.tasks.map((task) => task.userId === "high-score-risk"
    ? { ...task, assigneeTeam: "sales", category: "conversion", subtype: "待付款" }
    : task);
  const row = buildRoleTaskRows({ ...state, tasks }, "sales").find((candidate) => candidate.userId === "high-score-risk");

  assert.equal(row.frozenRepair, true);
  assert.equal(row.task.category, "repair");
  assert.equal(row.task.subtype, "退款投诉");
  assert.equal(row.conversionControls, false);
});

test("H4 and sales-frozen tasks expose restricted repair feedback options in every visible role", () => {
  const state = freshStore().getState();
  const learningRow = buildRoleTaskRows(state, "learning").find((row) => row.userId === "high-score-risk");
  const strategyRow = buildRoleTaskRows(state, "strategy").find((row) => row.userId === "high-score-risk");
  const agentState = { ...state, tasks: state.tasks.map((task) => task.userId === "high-score-risk" ? { ...task, assigneeTeam: "agent" } : task) };
  const agentRow = buildRoleTaskRows(agentState, "agent").find((row) => row.userId === "high-score-risk");
  const salesState = { ...state, tasks: state.tasks.map((task) => task.userId === "high-score-risk" ? { ...task, assigneeTeam: "sales" } : task) };
  const salesRow = buildRoleTaskRows(salesState, "sales").find((row) => row.userId === "high-score-risk");

  for (const row of [learningRow, strategyRow, agentRow, salesRow]) {
    assert.equal(row.frozenRepair, true);
    assert.equal(row.conversionControls, false);
    assert.deepEqual(row.feedbackOptions.nextAction, ["service-repair"]);
    assert.deepEqual(row.feedbackOptions.finalResult, ["follow-up", "resolved"]);
  }
});

test("frozen after-sales and Strategy feedback cannot submit conversion values but accepts repair feedback", () => {
  const store = freshStore();
  const conversionFeedback = { ...feedback, intentStatus: "ready", nextAction: "send-payment-link", finalResult: "converted" };

  assert.throws(() => store.submitTaskFeedback("task-1004", conversionFeedback), /FROZEN_REPAIR_CONVERSION_BLOCKED/);
  assert.throws(() => store.submitFeedback("task-1004", { ...feedback, nextAction: "offer-coupon", finalResult: "follow-up" }), /FROZEN_REPAIR_CONVERSION_BLOCKED/);
  assert.throws(() => store.submitFeedback("task-1004", { ...feedback, nextAction: "service-repair", finalResult: "converted" }), /FROZEN_REPAIR_CONVERSION_BLOCKED/);
  assert.throws(() => store.submitFeedback("task-1004", { ...feedback, nextAction: "service-repair", finalResult: "paid" }), /FROZEN_REPAIR_CONVERSION_BLOCKED/);
  const accepted = store.submitTaskFeedback("task-1004", { ...feedback, intentStatus: "none", nextAction: "service-repair", finalResult: "resolved" });

  assert.equal(accepted.record.taskId, "task-1004");
  assert.equal(store.getState().feedbackRecords.at(-1).feedback.nextAction, "service-repair");
});

test("projected H4 feedback atomically rejects escalation or strong objection paired with conversion", () => {
  const attempts = [
    { ...feedback, intentStatus: "none", riskChange: "escalated", nextAction: "send-payment-link", finalResult: "follow-up" },
    { ...feedback, intentStatus: "none", objectionType: "difficulty", nextAction: "send-payment-link", finalResult: "converted" }
  ];

  for (const attempt of attempts) {
    const store = freshStore();
    const before = store.getState();

    assert.throws(() => store.submitTaskFeedback("task-1016", attempt), /FROZEN_REPAIR_CONVERSION_BLOCKED/);
    assert.deepEqual(store.getState(), before);
  }
});

test("projected risk escalation accepts a legitimate repair follow-up", () => {
  const store = freshStore();
  const before = store.getState();

  const accepted = store.submitTaskFeedback("task-1016", { ...feedback, intentStatus: "none", riskChange: "escalated", nextAction: "service-repair", finalResult: "follow-up" });
  const after = store.getState();

  assert.equal(accepted.record.taskId, "task-1016");
  assert.equal(after.feedbackRecords.length, (before.feedbackRecords ?? []).length + 1);
  assert.equal(after.scores.find((score) => score.userId === "annual-h2-outcomes").hLevel, "H4");
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

test("F13 and F14 feedback update realtime signals without changing raw base score, base score, or H", () => {
  const store = freshStore();
  const before = store.getState();
  const beforeScore = scoreSnapshot(before, "annual-m12-h1");
  const result = store.submitFeedback("route-annual-m12-h1", { ...feedback, intentStatus: "ready", nextAction: "send-payment-link" });
  const after = store.getState();
  const afterScore = scoreSnapshot(after, "annual-m12-h1");

  assert.equal(result.record.fieldId, "F16");
  assert.equal(after.feedbackRecords.length, (before.feedbackRecords ?? []).length + 1);
  assert.equal(after.scores.find((score) => score.userId === "annual-m12-h1").marketingSignal.level, "L3");
  assert.equal(after.scores.find((score) => score.userId === "annual-m12-h1").transactionSignal.priority, "P0");
  assert.deepEqual(afterScore, beforeScore);
  assert.throws(() => store.submitFeedback("task-1009", { ...feedback, nextFollowAt: "tomorrow" }), /ISO/i);
});

test("F16 parent feedback remains staged until simulateNextDay changes base-score contributions", () => {
  const store = freshStore();
  const before = store.getState();
  const beforeScore = scoreSnapshot(before, "annual-h2-outcomes");
  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", nextAction: "learning-plan", learningConclusion: "家长确认需要阶段规划" });
  const beforePreview = store.getState();
  const snapshot = structuredClone(beforePreview);
  const preview = store.previewNextDay("annual-h2-outcomes");

  assert.deepEqual(store.getState(), snapshot);
  assert.deepEqual(scoreSnapshot(beforePreview, "annual-h2-outcomes"), beforeScore);
  assert.notEqual(preview.before.baseScore, preview.after.baseScore);
  const applied = store.simulateNextDay("annual-h2-outcomes");
  const user = applied.users.find((candidate) => candidate.id === "annual-h2-outcomes");
  assert.equal(user.taskFeedback.learningConclusion, "家长确认需要阶段规划");
  assert.notDeepEqual(scoreSnapshot(applied, "annual-h2-outcomes"), beforeScore);
  assert.ok(applied.feedbackRecords.find((record) => record.userId === user.id).appliedAt);
});

test("F15 risk feedback can immediately change the risk-adjusted base score and H", () => {
  const store = freshStore();
  const before = store.getState();
  const beforeScore = scoreSnapshot(before, "annual-h2-outcomes");

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", nextAction: "service-repair", riskChange: "escalated" });
  const afterScore = scoreSnapshot(store.getState(), "annual-h2-outcomes");

  assert.equal(afterScore.rawBaseScore, beforeScore.rawBaseScore);
  assert.notEqual(afterScore.baseScore, beforeScore.baseScore);
  assert.equal(afterScore.hLevel, "H4");
});

test("realtime feedback accumulates F13 and F14 signals across consecutive writes", () => {
  const store = freshStore();

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "ready", nextAction: "send-payment-link" });
  store.submitFeedback("task-1016", { ...feedback, intentStatus: "considering", nextAction: "learning-plan" });
  const score = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");

  assert.equal(score.marketingSignal.level, "L3");
  assert.equal(score.transactionSignal.priority, "P0");
});

test("realtime risk remains frozen through unchanged repair feedback and clears only on resolution", () => {
  const store = freshStore();

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", riskChange: "escalated", nextAction: "service-repair" });
  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", riskChange: "unchanged", nextAction: "service-repair" });
  const frozen = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");
  assert.equal(frozen.hLevel, "H4");
  assert.equal(frozen.risk.salesFrozen, true);

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", riskChange: "resolved", nextAction: "service-repair", finalResult: "resolved" });
  const resolved = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");
  assert.notEqual(resolved.hLevel, "H4");
  assert.equal(resolved.risk.salesFrozen, false);
});

test("a strong objection becomes an immediate F15/H4 risk until explicitly resolved", () => {
  const store = freshStore();

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", objectionType: "difficulty", nextAction: "service-repair" });
  const score = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");

  assert.equal(score.hLevel, "H4");
  assert.equal(score.risk.salesFrozen, true);
});

test("a strong objection is counted once across next-day application and explicit resolution clears it immediately", () => {
  const store = freshStore();

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", objectionType: "difficulty", nextAction: "service-repair" });
  const immediate = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");
  store.simulateNextDay("annual-h2-outcomes");
  const nextDay = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");

  assert.equal(immediate.risk.deduction, 15);
  assert.equal(nextDay.risk.deduction, 15);
  assert.equal(nextDay.hLevel, "H4");

  store.submitFeedback("task-1016", { ...feedback, intentStatus: "none", objectionType: "none", riskChange: "resolved", nextAction: "service-repair", finalResult: "resolved" });
  const resolved = store.getState().scores.find((candidate) => candidate.userId === "annual-h2-outcomes");
  assert.equal(resolved.risk.deduction, 0);
  assert.equal(resolved.risk.salesFrozen, false);
});

test("monthly T24 P0 remains bound sales through feedback and high-score refund stays H4 repair", () => {
  const store = freshStore();
  const monthly = store.getState().routes["monthly-t24-p0"];
  const refund = store.getState().routes["high-score-risk"];

  assert.deepEqual([monthly.team, monthly.bindingMode, monthly.taskCategory], ["sales", "bound", "conversion"]);
  assert.deepEqual([refund.hLevel, refund.team, refund.taskCategory], ["H4", "sales", "repair"]);
  assert.equal(store.getState().scores.find((score) => score.userId === "high-score-risk").risk.salesFrozen, true);
});
