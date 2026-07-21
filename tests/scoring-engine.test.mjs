import test from "node:test";
import assert from "node:assert/strict";
import { scoreUser, scoreUsers } from "../core/scoring-engine.js";
import { scenarioUser } from "../data/seed-data.js";

test("missing F07 is removed from denominator", () => {
  const withEvaluation = scoreUser(scenarioUser("high-base"));
  const withoutEvaluation = scoreUser({ ...scenarioUser("high-base"), courseEvaluation: null });

  assert.equal(withoutEvaluation.dimensions.courseExperience.status, "not-participating");
  assert.ok(withoutEvaluation.baseScore >= withEvaluation.baseScore - 2);
  assert.ok(withoutEvaluation.dimensions.courseExperience.items.every((item) => item.status === "not-applicable"));
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
