import assert from "node:assert/strict";
import test from "node:test";
import { FIELD_DEFINITIONS } from "../data/rules.js";
import { serializeCsv } from "../core/import-export.js";
import { LIFECYCLE_PHASES, lifecycleNode } from "../views/lifecycle.js";
import { SCHOLARSHIP_POLICY, buildOperationAssets } from "../views/operations.js";
import { buildFieldRows } from "../views/data-foundation.js";
import { buildSystemRows } from "../views/system-map.js";
import { buildReviewTables } from "../views/review.js";
import { DEMAND_ROWS, demandCsvRows } from "../views/demands.js";

test("Task 8 lifecycle phases cover approved monthly and annual ranges with sales only in renewal windows", () => {
  assert.deepEqual(LIFECYCLE_PHASES.map((phase) => phase.range), ["T0-T10", "T11-T21", "T22-T28", "M1-M7", "M8-M12"]);
  assert.equal(lifecycleNode("monthly", "T10").salesBinding, false);
  assert.equal(lifecycleNode("monthly", "T22").salesBinding, true);
  assert.equal(lifecycleNode("annual", "M7").salesBinding, false);
  assert.equal(lifecycleNode("annual", "M8").salesBinding, true);
  assert.ok(lifecycleNode("monthly", "T24").acceptanceKpi);
});

test("Task 8 keeps scholarships outside base scoring and maps click and transaction evidence to F13/F14", () => {
  assert.equal(SCHOLARSHIP_POLICY.countsTowardBaseScore, false);
  assert.equal(SCHOLARSHIP_POLICY.annualRedemptionCap, 200);
  assert.equal(SCHOLARSHIP_POLICY.expiredCouponReturn, "scholarship-account");
  const assets = buildOperationAssets();
  assert.ok(assets.some((asset) => asset.source === "IN_APP" && asset.scoreField === "F10"));
  assert.ok(assets.some((asset) => asset.source === "MANUAL" && asset.scoreField === "复盘，不进F10"));
  assert.ok(assets.some((asset) => asset.id === "scholarship" && asset.clickField === "F13" && asset.resultField === "F14"));
});

test("Task 8 exposes every F01-F16 contract and separates gate, independent signals, and feedback", () => {
  const rows = buildFieldRows(FIELD_DEFINITIONS);
  assert.equal(rows.length, 16);
  assert.match(rows.find((row) => row.id === "F12").semantic, /触达准入/);
  assert.match(rows.find((row) => row.id === "F13").semantic, /独立营销意向/);
  assert.match(rows.find((row) => row.id === "F14").semantic, /独立交易状态/);
  assert.match(rows.find((row) => row.id === "F16").semantic, /结构化回写/);
  assert.ok(rows.every((row) => row.window && row.downstream && row.placement));
});

test("Task 8 system topology retains source evidence and CRM 403 tag-first fallback", () => {
  const rows = buildSystemRows();
  assert.equal(rows.length, 12);
  const tags = rows.find((row) => row.id === "crm-tags");
  const segments = rows.find((row) => row.id === "crm-segments");
  assert.match(tags.evidence, /scopeData/);
  assert.match(segments.evidence, /403/);
  assert.match(segments.fallback, /标签优先/);
  assert.equal(rows.find((row) => row.id === "rules-engine").status, "must-add");
});

test("Task 8 review tables are explicitly simulated and filterable", () => {
  const tables = buildReviewTables();
  assert.deepEqual(tables.map((table) => table.id), ["high-priority", "h3-migration", "task-effectiveness", "misclassification"]);
  assert.ok(tables.every((table) => table.simulated && table.rows.every((row) => row.simulationLabel === "模拟数据")));
  assert.ok(tables.every((table) => table.filterKeys.includes("team") && table.filterKeys.includes("activity")));
});

test("Task 8 demand P0 set and CSV export are complete and formula-safe", () => {
  const p0 = DEMAND_ROWS.filter((row) => row.priority === "P0");
  assert.deepEqual(p0.map((row) => row.id), ["unified-id", "scoring", "crm-tags", "task-fields", "risk-writeback", "activity-writeback", "daily-score-snapshot"]);
  const csv = serializeCsv(demandCsvRows([{ ...p0[0], existing: "=unsafe" }]));
  assert.match(csv, /'=unsafe/);
  assert.match(csv, /优先级,部门,现有能力/);
});
