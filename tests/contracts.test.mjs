import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_DEFINITIONS, H_LEVEL_RULES, SCORING_RULES } from "../data/rules.js";
import * as systemMap from "../data/system-capabilities.js";
import { scenarioUser, SEED_STATE } from "../data/seed-data.js";

const field = (id) => FIELD_DEFINITIONS.find((item) => item.id === id);
const dimension = (id) => SCORING_RULES.baseDimensions.find((item) => item.id === id);
const { FEATURE_PLACEMENTS, SYSTEM_CAPABILITIES } = systemMap;
const CAPABILITY_STATUSES = systemMap.CAPABILITY_STATUSES ?? {};

test("scoring contract keeps F13 and F14 independent of the base score", () => {
  assert.equal(FIELD_DEFINITIONS.length, 16);
  assert.equal(field("F12").scoreRole, "gate");
  assert.equal(field("F13").scoreRole, "independent");
  assert.equal(field("F14").scoreRole, "independent");
  assert.deepEqual(SCORING_RULES.independentSignals, ["F13", "F14"]);
  assert.deepEqual(SCORING_RULES.baseDimensions.map((item) => item.id), [
    "learningHealth", "courseExperience", "outcomes", "parentEngagement", "fit"
  ]);
  const baseFields = SCORING_RULES.baseDimensions.flatMap((item) => item.fields);
  assert.deepEqual(baseFields.filter((id) => ["F12", "F13", "F14"].includes(id)), []);
});

test("risk fuse evaluates H4 first and suppresses downstream priorities", () => {
  const h4 = H_LEVEL_RULES.find((item) => item.id === "H4");

  assert.equal(H_LEVEL_RULES[0].id, "H4");
  assert.equal(h4.order, 1);
  assert.deepEqual(SCORING_RULES.riskPrecedence, {
    evaluatedBy: "H4",
    field: "F15",
    trigger: "fuse",
    supersedes: [
      "score-ordering",
      "F13-marketing-priority",
      "F14-transaction-priority",
      "sales-task-routing"
    ]
  });
});

test("scoring contract defines F03 fallback and F07 normalized input semantics", () => {
  assert.equal(field("F03").missingScore, 60);
  assert.equal(SCORING_RULES.missingScoreDefaults.F03, 60);
  assert.equal(dimension("courseExperience").omitWhenMissing, true);
  assert.deepEqual(SCORING_RULES.scoreInputs.F07, {
    field: "normalizedScore",
    scale: 100,
    omitWhenMissing: true
  });

  const missingEvaluation = scenarioUser("missing-f07");
  const scoredEvaluation = scenarioUser("high-base").courseEvaluation;
  assert.equal(missingEvaluation.courseEvaluation, null);
  assert.equal(scoredEvaluation.sourceScale, 5);
  assert.equal(scoredEvaluation.normalizedScore, 98);
});

test("system map exposes the full evidence-aware capability taxonomy", () => {
  assert.deepEqual(Object.keys(CAPABILITY_STATUSES), [
    "confirmed-reusable",
    "entry-confirmed",
    "needs-adaptation",
    "must-add",
    "degradable"
  ]);

  const usedStatuses = new Set([
    ...SYSTEM_CAPABILITIES.map((item) => item.status),
    ...FEATURE_PLACEMENTS.map((item) => item.status)
  ]);
  assert.deepEqual(usedStatuses, new Set(Object.keys(CAPABILITY_STATUSES)));
  assert.ok([...SYSTEM_CAPABILITIES, ...FEATURE_PLACEMENTS].every((item) => (
    item.statusMeta?.code === item.status && item.statusMeta.label
  )));

  const salesOps = SYSTEM_CAPABILITIES.find((item) => item.id === "sales-ops");
  assert.equal(salesOps.status, "entry-confirmed");
  assert.equal(salesOps.statusMeta.liveFieldSupport, "unverified");
  assert.match(salesOps.gaps.join(" "), /触发原因|回写/);
  assert.equal(FEATURE_PLACEMENTS.find((item) => item.id === "activity-uplift").status, "needs-adaptation");
  assert.equal(FEATURE_PLACEMENTS.find((item) => item.id === "ai-assist").status, "degradable");
});

test("seed state represents product types and operational edge scenarios", () => {
  assert.ok(SEED_STATE.users.length >= 24);
  assert.deepEqual(new Set(SEED_STATE.users.map((user) => user.productType)), new Set(["monthly", "annual"]));

  const reportOnly = scenarioUser("report-generated-only");
  assert.deepEqual(reportOnly.report, {
    status: "generated",
    opened: false,
    dwellMinutes: 0,
    shared: false,
    generatedAt: "2026-07-18"
  });

  const manualActivity = scenarioUser("manual-live");
  assert.equal(manualActivity.activity.source, "MANUAL");
  assert.equal(SEED_STATE.activities.find((item) => item.id === manualActivity.activity.activityId).status, "review-only");

  const riskUser = scenarioUser("high-score-risk");
  assert.equal(riskUser.risk.fuse, true);
  assert.equal(riskUser.risk.salesFrozen, true);
  assert.equal(SEED_STATE.tasks.find((item) => item.userId === riskUser.id).category, "repair");
});
