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
import * as audiencesView from "../views/audiences.js";

function render(view, routeParams = {}, state = SEED_STATE) {
  const root = { innerHTML: "" };
  view.render(root, {
    state,
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

function tableRowContaining(html, pattern) {
  const matcher = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  const row = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/g)].find((candidate) => matcher.test(candidate[0]));
  assert.ok(row, `expected a table row matching ${matcher}`);
  return row[0];
}

test("dashboard renders English-wide strategy command center", () => {
  const html = render(dashboardView);
  assert.match(html, /英语策略运营总控台/);
  assert.match(html, /业务覆盖/);
  assert.match(html, /K2策略样例/);
  assert.match(html, /E1待接入样例/);
});

test("business line drilldown maps line-specific operating evidence and separates global dependencies", () => {
  const state = {
    ...SEED_STATE,
    dataRequirements: [
      ...SEED_STATE.dataRequirements,
      { id: "REQ-KLINE-ONLY", name: "K2专属数据缺口", businessLine: "k-line", status: "must-add" }
    ]
  };
  const html = render(businessLinesView, {}, state);
  assert.match(html, /K2策略样例/);
  assert.match(html, /E1待接入样例/);
  assert.match(html, /完整模拟/);
  assert.match(html, /级别/);
  assert.match(html, /班期/);
  assert.match(html, /生命周期节点/);
  assert.match(html, /人群包/);
  assert.match(html, /下发批次/);
  assert.match(html, /数据缺口/);
  const kLineRow = tableRowContaining(html, /<td[^>]*>K2策略样例<\/td>/);
  assert.match(kLineRow, /K2/);
  assert.match(kLineRow, /AUD-KLINE-MISS-REPAIR/);
  assert.match(kLineRow, /DSP-20260722-002/);
  assert.match(kLineRow, /K2专属数据缺口/);
  assert.doesNotMatch(kLineRow, /业务域主数据|策略ID\/版本ID|触达和活动回写/);

  const eLineRow = tableRowContaining(html, /<td[^>]*>E1待接入样例<\/td>/);
  assert.match(eLineRow, /待接入/);
  assert.match(eLineRow, /DSP-E1-FAQ-PLAN/);
  assert.doesNotMatch(eLineRow, /K2专属数据缺口/);

  assert.match(html, /全局依赖/);
  assert.match(html, /业务域主数据.*策略ID\/版本ID.*触达和活动回写/s);
});

test("business line drilldown renders K2 SOP simulation details", () => {
  const html = render(businessLinesView);
  assert.match(html, /K2中心化SOP配置拆解/);
  assert.match(html, /K2-LAYER-RULE/);
  assert.match(html, /每周一/);
  assert.match(html, /取前20节课完成数/);
  assert.match(html, /M9-M11/);
  assert.match(html, /下一阶段规划电话邀约/);
});

test("strategy asset library renders reuse and difference configuration", () => {
  const html = render(strategyAssetsView);
  assert.match(html, /策略资产库/);
  assert.match(html, /成长报告打开后价值认知强化/);
  assert.match(html, /跨级别复用/);
  assert.match(html, /K2能力成长路径 \+ 中心化SOP/);
  const assetRow = tableRowContaining(html, /ES-OUTCOME-REPORT-001/);
  assert.match(assetRow, /生命周期节点|M6\s*\/\s*M8\s*\/\s*M11\s*\/\s*M12/);
  assert.match(assetRow, /content-strategy/);
  assert.match(assetRow, /online|已上线/);
  assert.match(assetRow, /report_opened.*strategy_id.*audience_pack_id.*touch_writeback/);
  assert.match(assetRow, /k-line: K2能力成长路径 \+ 中心化SOP/);
  assert.match(assetRow, /e-line: 升阶规划 \+ 长期学习目标/);
});

test("strategy asset library renders concrete K2 cases and field contracts", () => {
  const html = render(strategyAssetsView);
  assert.match(html, /K2策略资产样例/);
  assert.match(html, /ES-K2-ACTIVITY-001/);
  assert.match(html, /ES-K2-WECHAT-REVIEW-001/);
  assert.match(html, /ES-K2-PHONE-ASK-001/);
  assert.match(html, /字段合同/);
  assert.match(html, /来源策略ID样例/);
  assert.match(html, /补读观察截止时间/);
});

test("audience view renders K2 layered audience packs with refresh rules", () => {
  const html = render(audiencesView);
  assert.match(html, /K2高优与干预人群口径/);
  assert.match(html, /AUD-K2-SA-STABLE/);
  assert.match(html, /S=完成20节/);
  assert.match(html, /AUD-K2-CD-REPAIR/);
  assert.match(html, /每日T\+1\+每周一分层/);
  assert.match(html, /AUD-K2-UNRENEWED-M9M11/);
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
