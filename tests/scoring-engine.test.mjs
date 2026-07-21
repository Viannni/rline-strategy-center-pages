import test from "node:test";
import assert from "node:assert/strict";
import { scoreUser, scoreUsers } from "../core/scoring-engine.js";
import { H_LEVEL_RULES } from "../data/rules.js";
import { scenarioUser } from "../data/seed-data.js";

test("missing F07 is removed from denominator", () => {
  const withEvaluation = scoreUser(scenarioUser("high-base"));
  const withoutEvaluation = scoreUser({ ...scenarioUser("high-base"), courseEvaluation: null });

  assert.equal(withoutEvaluation.dimensions.courseExperience.status, "not-participating");
  assert.ok(withoutEvaluation.baseScore >= withEvaluation.baseScore - 2);
  assert.ok(withoutEvaluation.dimensions.courseExperience.items.every((item) => item.status === "missing"));
});

test("fully missing learning-health inputs are marked missing and removed from the denominator", () => {
  const user = scenarioUser("high-base");
  user.learning = {};

  const result = scoreUser(user);

  assert.equal(result.dimensions.learningHealth.status, "not-participating");
  assert.equal(result.dimensions.learningHealth.cap, 0);
  assert.ok(result.dimensions.learningHealth.items.every((entry) => entry.status === "missing"));
  assert.ok(Number.isFinite(result.rawBaseScore));
});

test("F14 keeps no event distinct from the P2 reminder state", () => {
  const none = scoreUser(scenarioUser("high-base"));
  const reminderUser = scenarioUser("high-base");
  reminderUser.transaction = { status: "coupon-received", observedAt: "2026-07-20T10:00:00+08:00" };
  const reminder = scoreUser(reminderUser);

  assert.equal(none.transactionSignal.priority, null);
  assert.equal(reminder.transactionSignal.priority, "P2");
});

test("refund fuses a high scoring user into H4", () => {
  const result = scoreUser({ ...scenarioUser("high-base"), risk: { fuse: true, type: "退款" } });

  assert.equal(result.hLevel, "H4");
  assert.equal(result.risk.salesFrozen, true);
});

test("marketing and transaction signals never raise base score", () => {
  const base = scenarioUser("mid-base");
  const signaled = {
    ...base,
    marketing: { exposureEligible: true, cohortId: "test-cohort", renewalQuestion: true, events: ["price-question"] },
    transaction: { unpaid: true, status: "unpaid" }
  };

  assert.equal(scoreUser(base).baseScore, scoreUser(signaled).baseScore);
});

test("report generation alone earns no outcomes points", () => {
  const result = scoreUser(scenarioUser("report-generated-only"));
  const generated = result.dimensions.outcomes.items.find((item) => item.ruleId === "F09-report-generated");

  assert.deepEqual(generated, {
    ruleId: "F09-report-generated",
    label: "报告仅生成",
    points: 0,
    actual: "generated",
    window: "报告节点",
    fieldIds: ["F09"],
    status: "not-scored"
  });
});

test("MANUAL activity never enters automatic uplift scoring", () => {
  const manual = scenarioUser("manual-live");
  const withoutActivity = { ...manual, activity: { ...manual.activity, source: "IN_APP", participated: false, response: "not-started" } };
  const manualResult = scoreUser(manual);
  const noActivityResult = scoreUser(withoutActivity);

  assert.equal(manualResult.upliftScore, noActivityResult.upliftScore);
  assert.ok(manualResult.reasons.some((reason) => reason.ruleId === "F10-manual-review-only"));
});

test("F12 touch status never changes the base score", () => {
  const base = scenarioUser("mid-base");
  const blocked = { ...base, touch: { ...base.touch, status: "blocked", total7d: 10 } };

  assert.equal(scoreUser(base).baseScore, scoreUser(blocked).baseScore);
});

test("H2 takes precedence over H3 when outcomes are strong", () => {
  const result = scoreUser(scenarioUser("annual-h2-outcomes"));

  assert.equal(result.hLevel, "H2");
  assert.ok(result.dimensions.outcomes.normalized >= 70);
});

test("marketing comparability only supports the same eligible exposure cohort", () => {
  const [strong, light, incomparable] = scoreUsers([
    scenarioUser("marketing-cohort-a-strong"),
    scenarioUser("marketing-cohort-a-light"),
    scenarioUser("marketing-not-comparable")
  ]);

  assert.equal(strong.marketingSignal.comparable, true);
  assert.equal(light.marketingSignal.comparable, true);
  assert.deepEqual([strong.marketingSignal.rank, light.marketingSignal.rank], [1, 2]);
  assert.equal(incomparable.marketingSignal.comparable, false);
  assert.equal(incomparable.marketingSignal.rank, null);
  assert.ok(incomparable.marketingSignal.reasons.length > 0);
});

test("unpaid and failed payments are F14 P0", () => {
  const unpaid = scoreUser(scenarioUser("annual-renewal-p0"));
  const failed = scoreUser(scenarioUser("p0-outside-renewal-window"));

  assert.equal(unpaid.transactionSignal.priority, "P0");
  assert.equal(failed.transactionSignal.priority, "P0");
});

test("F16 strong difficulty objections add risk without mutating the user", () => {
  const user = scenarioUser("difficulty-objection");
  const before = structuredClone(user);
  const result = scoreUser(user);

  assert.equal(result.risk.deduction, 15);
  assert.ok(result.risk.reasons.some((reason) => reason.ruleId === "F16-difficulty-objection"));
  assert.deepEqual(user, before);
});

test("F13, F14, and F12 do not change either base score", () => {
  const user = scenarioUser("mid-base");
  const baseline = scoreUser(user);
  const signaled = scoreUser({
    ...user,
    touch: { ...user.touch, status: "blocked", total7d: 10 },
    marketing: { exposureEligible: true, cohortId: "test-cohort", renewalQuestion: true, events: ["price-question"] },
    transaction: { unpaid: true, status: "unpaid" }
  });

  assert.equal(typeof baseline.rawBaseScore, "number");
  assert.equal(signaled.rawBaseScore, baseline.rawBaseScore);
  assert.equal(signaled.baseScore, baseline.baseScore);
});

test("risk changes only the final risk-adjusted base score", () => {
  const user = scenarioUser("high-base");
  const baseline = scoreUser(user);
  const withRisk = scoreUser({ ...user, risk: { deduction: 10 } });

  assert.equal(typeof baseline.rawBaseScore, "number");
  assert.equal(withRisk.rawBaseScore, baseline.rawBaseScore);
  assert.equal(withRisk.baseScore, baseline.baseScore - 10);
});

test("F13 and F14 retain public reasons and expose complete trace entries", () => {
  const result = scoreUser({
    ...scenarioUser("mid-base"),
    marketing: { exposureEligible: true, cohortId: "test-cohort", renewalQuestion: true, events: ["price-question"] },
    transaction: { unpaid: true, status: "unpaid" }
  });
  const expectedKeys = ["ruleId", "label", "points", "actual", "window", "fieldIds", "status"];

  assert.ok(result.marketingSignal.reasons.every((reason) => typeof reason === "string"));
  assert.ok(result.transactionSignal.reasons.every((reason) => typeof reason === "string"));
  assert.deepEqual(Object.keys(result.marketingSignal.traces[0]), expectedKeys);
  assert.deepEqual(Object.keys(result.transactionSignal.traces[0]), expectedKeys);
  assert.ok(result.reasons.some((reason) => reason.fieldIds.includes("F13")));
  assert.ok(result.reasons.some((reason) => reason.fieldIds.includes("F14")));
});

test("H classification follows H_LEVEL_RULES criteria in their declared order", () => {
  const defaultResult = scoreUser(scenarioUser("high-base"));
  const hLevelRules = structuredClone(H_LEVEL_RULES);
  hLevelRules.find((rule) => rule.id === "H1").criteria.allOf[0].value = 101;
  const ruleDrivenResult = scoreUser(scenarioUser("high-base"), undefined, hLevelRules);

  assert.equal(defaultResult.hLevel, "H1");
  assert.equal(ruleDrivenResult.hLevel, "H2");
  assert.deepEqual(H_LEVEL_RULES.map((rule) => rule.id), ["H4", "H1", "H2", "H3", "L"]);
});
