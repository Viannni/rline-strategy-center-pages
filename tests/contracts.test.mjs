import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_DEFINITIONS, SCORING_RULES } from "../data/rules.js";
import { SYSTEM_CAPABILITIES } from "../data/system-capabilities.js";
import { SEED_STATE } from "../data/seed-data.js";

test("latest model keeps F13/F14 independent and F12 outside base score", () => {
  assert.equal(FIELD_DEFINITIONS.length, 16);
  assert.equal(FIELD_DEFINITIONS.find((field) => field.id === "F07").name, "课程评价分");
  assert.equal(FIELD_DEFINITIONS.find((field) => field.id === "F12").scoreRole, "gate");
  assert.equal(FIELD_DEFINITIONS.find((field) => field.id === "F13").scoreRole, "independent");
  assert.deepEqual(SCORING_RULES.baseDimensions.map((dimension) => dimension.id), [
    "learningHealth", "courseExperience", "outcomes", "parentEngagement", "fit"
  ]);
});

test("system map distinguishes confirmed entry from confirmed field support", () => {
  const salesOps = SYSTEM_CAPABILITIES.find((item) => item.id === "sales-ops");
  assert.equal(salesOps.status, "entry-confirmed");
  assert.match(salesOps.gaps.join(" "), /触发原因|回写/);
});

test("seed state covers roles, products and H levels", () => {
  assert.ok(SEED_STATE.users.length >= 24);
  assert.deepEqual(new Set(SEED_STATE.users.map((user) => user.productType)), new Set(["monthly", "annual"]));
  assert.ok(SEED_STATE.users.some((user) => user.risk?.fuse));
});
