import assert from "node:assert/strict";
import test from "node:test";
import { serializeCsv } from "../core/import-export.js";
import { LIFECYCLE_PHASES, lifecycleNode } from "../views/lifecycle.js";
import { SCHOLARSHIP_POLICY, buildOperationAssets } from "../views/operations.js";
import { buildSystemRows } from "../views/system-map.js";
import { buildReviewTables } from "../views/review.js";
import { DEMAND_ROWS, demandCsvRows } from "../views/demands.js";
import { SEED_STATE } from "../data/seed-data.js";
import * as dashboardView from "../views/dashboard.js";
import * as businessLinesView from "../views/business-lines.js";
import * as strategyAssetsView from "../views/strategy-assets.js";

function render(view, routeParams = {}) {
  const root = { innerHTML: "" };
  view.render(root, {
    state: SEED_STATE,
    role: "strategy",
    routeParams,
    components: {
      renderBadge: (status, label) => `<span data-badge="${status}">${label || status}</span>`,
      renderTable: ({ columns, rows }) => `<table><thead>${columns.map((col) => `<th>${col.label}</th>`).join("")}</thead><tbody>${rows.map((row) => `<tr>${columns.map((col) => `<td>${typeof col.trustedHtml === "function" ? col.trustedHtml(row[col.key], row) : row[col.key] || ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
      iconButton: () => "<button></button>",
      openDrawer: () => () => {}
    }
  });
  return root.innerHTML;
}

test("dashboard renders English-wide strategy command center", () => {
  const html = render(dashboardView);
  assert.match(html, /英语全线策略总控/);
  assert.match(html, /业务线覆盖/);
  assert.match(html, /R线/);
  assert.match(html, /K线/);
  assert.match(html, /E线/);
});

test("business line drilldown treats R-line as full sample and K/E as supported structures", () => {
  const html = render(businessLinesView);
  assert.match(html, /R线首发样板/);
  assert.match(html, /K线/);
  assert.match(html, /结构样例/);
});

test("strategy asset library renders reuse and difference configuration", () => {
  const html = render(strategyAssetsView);
  assert.match(html, /策略资产库/);
  assert.match(html, /成长报告打开后价值认知强化/);
  assert.match(html, /全线复用/);
  assert.match(html, /阅读成长 \+ 奖学金提醒/);
});

test("Task 8 lifecycle phases cover approved monthly and annual ranges with sales only in renewal windows", () => {
  assert.deepEqual(LIFECYCLE_PHASES.map((phase) => phase.range), ["T0-T10", "T11-T21", "T22-T28", "M1-M7", "M8-M12"]);
  assert.equal(lifecycleNode("monthly", "T10").salesBinding, false);
  assert.equal(lifecycleNode("monthly", "T22").salesBinding, true);
  assert.equal(lifecycleNode("annual", "M7").salesBinding, false);
  assert.equal(lifecycleNode("annual", "M8").salesBinding, true);
  assert.ok(lifecycleNode("monthly", "T24").acceptanceKpi);
  assert.match(lifecycleNode("monthly", "T24").owner, /二销主责/);
  assert.match(lifecycleNode("monthly", "T24").support, /学情沟通组/);
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
