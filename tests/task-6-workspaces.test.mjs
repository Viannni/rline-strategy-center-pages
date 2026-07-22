import test from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../core/store.js";
import { SEED_STATE } from "../data/seed-data.js";
import { escapeHtml, renderTable } from "../ui/components.js";
import {
  DETAIL_FLOW,
  applyUserPreset,
  buildUserDetailModel,
  buildUserRows,
  diffSimulationValues,
  filterUserRows,
  previewSimulation
} from "../views/users.js";
import {
  SCORING_TABS,
  buildBaseRuleRows,
  createRuleDraft,
  previewRuleDraft,
  restoreOnlineBaseline
} from "../views/scoring.js";

const state = () => createStore(SEED_STATE, null).getState();

test("dashboard presets become composable user filters", () => {
  const rows = buildUserRows(state());
  const h1h2 = filterUserRows(rows, applyUserPreset({}, "h1-h2"), "baseScore-desc");
  const blocked = filterUserRows(rows, applyUserPreset({}, "f12-blocked"));

  assert.ok(h1h2.length > 0);
  assert.ok(h1h2.every((row) => ["H1", "H2"].includes(row.hLevel)));
  assert.ok(h1h2.every((row, index) => index === 0 || h1h2[index - 1].baseScore >= row.baseScore));
  assert.deepEqual(blocked.map(({ id }) => id), ["touch-blocked"]);
});

test("text, product, lifecycle, signal, risk, gate, and team filters can combine", () => {
  const rows = buildUserRows(state());
  const filtered = filterUserRows(rows, {
    text: "child-1018",
    productType: "monthly",
    stageCode: "T13",
    hLevel: "H4",
    signal: "none",
    risk: "active",
    gate: "eligible",
    team: "learning"
  });

  assert.deepEqual(filtered.map(({ id }) => id), ["difficulty-objection"]);
});

test("user detail keeps base score, F13, F14, F12, and risk in separate groups", () => {
  const model = buildUserDetailModel(state(), "annual-renewal-p0");

  assert.deepEqual(model.scoreGroups.map(({ id }) => id), ["base", "f13", "f14", "f12", "risk"]);
  assert.ok(model.scoreGroups.find(({ id }) => id === "base").fieldIds.every((fieldId) => !["F12", "F13", "F14", "F15"].includes(fieldId)));
  assert.equal(model.scoreGroups.find(({ id }) => id === "f14").value, "P0");
  assert.deepEqual(DETAIL_FLOW, ["行为进入", "基础计分", "H层级", "触达准入", "主责团队", "当前任务", "回写", "下次重算"]);
  assert.ok(model.scoringRows.length > 0);
  assert.ok(model.scoringRows.every((row) => (
    Object.hasOwn(row, "actual")
      && Object.hasOwn(row, "points")
      && row.fieldIds.length > 0
      && row.window
      && row.status
      && row.updatedAt
  )));
});

test("simulation preview supports named safe fields without mutating browser state", () => {
  const current = state();
  const before = structuredClone(current);
  const preview = previewSimulation(current, "annual-renewal-p0", {
    transactionUnpaid: false,
    couponUnused: true,
    reportDwellMinutes: 20,
    touchTotal7d: 6
  });

  assert.deepEqual(current, before);
  assert.equal(preview.simulatedUser.transaction.unpaid, false);
  assert.equal(preview.simulatedUser.transaction.couponUnused, true);
  assert.notStrictEqual(preview.before.score, preview.after.score);
  assert.equal(preview.after.score.transactionSignal.priority, "P1");
  assert.equal(preview.after.route.touchGate.status, "blocked");
});

test("simulation rejects fields outside the named safe list", () => {
  assert.throws(
    () => previewSimulation(state(), "high-base", { productType: "annual" }),
    /Unsupported simulation field: productType/
  );
});

test("unchanged simulation controls do not clear hidden payment failure or coerce missing scores", () => {
  const current = state();
  const paymentFailed = current.users.find(({ id }) => id === "p0-outside-renewal-window");
  const missingEvaluation = current.users.find(({ id }) => id === "missing-f07");

  assert.deepEqual(diffSimulationValues(paymentFailed, {
    courseEvaluationScore: paymentFailed.courseEvaluation.normalizedScore,
    reportOpened: paymentFailed.report.opened,
    reportDwellMinutes: paymentFailed.report.dwellMinutes,
    reportShared: paymentFailed.report.shared,
    parentReplied: paymentFailed.parent.replyStatus === "replied",
    couponUnused: false,
    transactionUnpaid: false,
    riskFuse: paymentFailed.risk.fuse,
    riskDeduction: paymentFailed.risk.deduction,
    touchTotal7d: paymentFailed.touch.total7d
  }), {});
  assert.deepEqual(diffSimulationValues(missingEvaluation, { courseEvaluationScore: null }), {});
});

test("scoring workspace exposes the five approved tabs and traceable base rules", () => {
  assert.deepEqual(SCORING_TABS.map(({ label }) => label), [
    "基础高优分",
    "运营提分潜力",
    "独立信号",
    "风险与熔断",
    "规则试算"
  ]);
  assert.ok(buildBaseRuleRows().every((row) => row.fieldIds.length > 0 && row.window && Number.isFinite(row.points)));
});

test("rule drafts are local clones and can restore the online baseline", () => {
  const current = state();
  const draft = createRuleDraft();
  draft.pointRules.learningHealth.completionHigh.points = 1;
  const preview = previewRuleDraft(current, "high-base", draft);
  const restored = restoreOnlineBaseline();

  assert.equal(preview.draftRuleVersion, "local-draft");
  assert.equal(current.scores.find(({ userId }) => userId === "high-base").baseScore, preview.before.baseScore);
  assert.equal(restored.pointRules.learningHealth.completionHigh.points, 8);
  assert.notStrictEqual(restored, draft);
});

test("table custom markup requires the explicit trustedHtml boundary", () => {
  const html = renderTable({
    columns: [
      { key: "name", label: "名称" },
      { key: "id", label: "操作", trustedHtml: (value) => `<button>${escapeHtml(value)}</button>` }
    ],
    rows: [{ id: "<open>", name: "<unsafe>" }]
  });

  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /<button>&lt;open&gt;<\/button>/);
});
