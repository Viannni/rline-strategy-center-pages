# English Strategy Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current R-line role/workflow prototype into an English-wide strategy operations center where R-line is the first fully populated sample line and K/E lines can be added through the same data model.

**Architecture:** Keep the static GitHub Pages app and existing vanilla ES module pattern. Replace the role-based frontline shell with a strategy-only shell, add shared domain data for business lines, strategy assets, audience packs, dispatch batches, effectiveness metrics, inbound review, and product/data demands, then build focused views over that data. Existing scoring and routing code stays available where useful, but this iteration changes the visible product from frontline execution to strategy management.

**Tech Stack:** Static HTML, vanilla JavaScript ES modules, CSS, Node.js built-in test runner, GitHub Pages.

## Global Constraints

- The backend is for English business strategy management, not a frontline service, sales, teacher, or intake dispatch system.
- R-line is the first fully populated sample line; K-line and E-line must appear as supported business domains through the same data model.
- Do not build an intake dispatch page, personal teacher workbench, real private-message sender, outbound call creator, CRM task creator, or real production connector.
- Do not expose real names, private chat text, call recordings, IP ownership, teacher ownership, or K2 48-period real user-level details.
- Every strategy asset must support business domain, strategy scope, reuse flag, difference configuration, lifecycle node, owner, status, data dependencies, and observation window.
- All UI is local/static simulation and must remain safe for GitHub Pages publication.
- Use TDD for code changes. Every task writes or updates tests before implementation.
- Use existing local patterns: ES modules, `render(container, context)` views, `renderTable`, `renderBadge`, seed state in `data/seed-data.js`, and Node tests under `tests/*.test.mjs`.

---

## File Structure

- Modify `app.js`: remove frontline role switch behavior, define the new strategy-only navigation, add business-domain route parsing, and wire new/reworked views.
- Modify `data/seed-data.js`: add English-wide `businessLines`, `lifecycleTemplates`, `strategyAssets`, `audiencePacks`, `dispatchBatches`, `effectivenessMetrics`, `inboundReviews`, and `dataRequirements`; keep R-line sample data rich and K/E sample data lightweight.
- Create `core/strategy-domain.js`: pure selectors and aggregators for business domains, strategy coverage, reusable asset lookup, dashboard metrics, audience summaries, dispatch summaries, and inbound attribution.
- Modify `ui/components.js`: add small reusable domain tabs, metric strips, strategy cards, and empty-state helpers used by multiple views.
- Replace/modify `views/dashboard.js`: render the all-line strategy command center.
- Create `views/business-lines.js`: render line/level/cohort drilldown.
- Create `views/strategy-assets.js`: render strategy asset library and detail drawer.
- Modify `views/lifecycle.js`: turn it into multi-line strategy coverage map.
- Modify `views/operations.js`: turn it into strategy workspaces for content/application/execution/model/insight.
- Modify `views/users.js`: turn it into audience builder and anonymous examples.
- Modify `views/tasks.js`: turn it into dispatch tracking, not personal task management.
- Modify `views/review.js`: render strategy effectiveness and inbound review.
- Modify `views/data-foundation.js`, `views/system-map.js`, `views/demands.js`: consolidate around data foundation and product/engineering requirement tables while preserving existing placement evidence.
- Modify `styles.css`: update brand, dashboard layout, tabs, matrices, drilldown panels, cards, and mobile behavior.
- Modify tests:
  - `tests/ui-shell.test.mjs`
  - `tests/contracts.test.mjs`
  - `tests/task-6-workspaces.test.mjs`
  - `tests/task-7-intake-feedback.test.mjs`
  - `tests/task-8-reference-views.test.mjs`
  - Add `tests/strategy-domain.test.mjs`
  - Add `tests/english-strategy-shell.test.mjs`

---

### Task 1: Strategy Domain Model And Selectors

**Files:**
- Modify: `data/seed-data.js`
- Create: `core/strategy-domain.js`
- Test: `tests/strategy-domain.test.mjs`

**Interfaces:**
- Consumes: `SEED_STATE` from `data/seed-data.js`.
- Produces:
  - `getBusinessLines(state): BusinessLine[]`
  - `getActiveBusinessDomain(state): BusinessDomain`
  - `strategyAssetsForDomain(state, domainFilter): StrategyAsset[]`
  - `coverageByBusinessLine(state): CoverageSummary[]`
  - `strategyDashboardSummary(state): StrategyDashboardSummary`
  - `audienceSummary(state, audiencePackId): AudienceSummary | null`
  - `dispatchSummary(state): DispatchSummary`

- [ ] **Step 1: Write the failing selector tests**

Add `tests/strategy-domain.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { SEED_STATE } from "../data/seed-data.js";
import {
  audienceSummary,
  coverageByBusinessLine,
  dispatchSummary,
  getBusinessLines,
  strategyAssetsForDomain,
  strategyDashboardSummary
} from "../core/strategy-domain.js";

test("business domain seed data supports English-wide strategy management", () => {
  assert.deepEqual(getBusinessLines(SEED_STATE).map((line) => line.id), ["english-all", "r-line", "k-line", "e-line"]);
  assert.equal(getBusinessLines(SEED_STATE).find((line) => line.id === "r-line").sampleDepth, "full");
  assert.equal(getBusinessLines(SEED_STATE).find((line) => line.id === "k-line").sampleDepth, "structure");
});

test("strategy assets can be reused across lines while keeping R-line differences", () => {
  const assets = strategyAssetsForDomain(SEED_STATE, { businessLine: "r-line" });
  const reusable = assets.find((asset) => asset.id === "ES-OUTCOME-REPORT-001");

  assert.equal(reusable.scope, "line-reusable");
  assert.equal(reusable.reusable, true);
  assert.equal(reusable.differenceConfig["r-line"].valueHook, "阅读成长 + 奖学金提醒");
  assert.ok(reusable.target.businessLines.includes("k-line"));
});

test("coverage summary compares R, K, and E lines", () => {
  const coverage = coverageByBusinessLine(SEED_STATE);
  assert.deepEqual(coverage.map((item) => item.businessLine), ["r-line", "k-line", "e-line"]);
  assert.equal(coverage.find((item) => item.businessLine === "r-line").coverageStatus, "healthy");
  assert.equal(coverage.find((item) => item.businessLine === "e-line").coverageStatus, "needs-setup");
});

test("dashboard and dispatch summaries expose strategy-level operations", () => {
  const summary = strategyDashboardSummary(SEED_STATE);
  assert.equal(summary.businessLineCount, 3);
  assert.ok(summary.onlineAssetCount >= 3);
  assert.ok(summary.strategyHealthRate > 0);

  const dispatch = dispatchSummary(SEED_STATE);
  assert.equal(dispatch.totalBatches, SEED_STATE.dispatchBatches.length);
  assert.ok(dispatch.writebackCompleteRate > 0);
});

test("audience pack summary explains target, exclusions, and freshness", () => {
  const summary = audienceSummary(SEED_STATE, "AUD-RLINE-HIGH-RENEWAL");
  assert.equal(summary.id, "AUD-RLINE-HIGH-RENEWAL");
  assert.equal(summary.businessLine, "r-line");
  assert.ok(summary.excludedCount > 0);
  assert.equal(summary.dataFreshness, "T+1");
});
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run: `npm test -- tests/strategy-domain.test.mjs`

Expected: FAIL with module not found for `core/strategy-domain.js` or missing exported functions.

- [ ] **Step 3: Add English-wide seed data**

Modify `data/seed-data.js` by adding these constants above `export const SEED_STATE`:

```js
const businessLines = [
  { id: "english-all", name: "英语全线", shortName: "全线", sampleDepth: "aggregate", levels: ["R1-R6", "K2", "E1"], status: "active" },
  { id: "r-line", name: "R线", shortName: "R", sampleDepth: "full", levels: ["R1", "R2", "R3", "R4", "R5", "R6"], status: "pilot" },
  { id: "k-line", name: "K线", shortName: "K", sampleDepth: "structure", levels: ["K1", "K2"], status: "supported" },
  { id: "e-line", name: "E线", shortName: "E", sampleDepth: "structure", levels: ["E1", "E2"], status: "supported" }
];

const lifecycleTemplates = [
  { id: "monthly-t", name: "月课T模板", nodes: ["T0", "T7", "T14", "T21", "T22", "T24", "T28"], renewalWindow: ["T22", "T28"] },
  { id: "annual-m", name: "年课M模板", nodes: ["M1", "M3", "M6", "M8", "M11", "M12"], renewalWindow: ["M8", "M12"] },
  { id: "custom-k", name: "K线中心化SOP模板", nodes: ["M0", "M3", "M6", "M8"], renewalWindow: ["M6", "M8"] }
];

const strategyAssets = [
  {
    id: "ES-OUTCOME-REPORT-001",
    name: "成长报告打开后价值认知强化",
    type: "outcome-content",
    ownerRole: "content-strategy",
    scope: "line-reusable",
    reusable: true,
    target: { businessLines: ["r-line", "k-line", "e-line"], productTypes: ["monthly", "annual"], lifecycleNodes: ["T21", "T24", "M8", "M11", "M12"] },
    exclusions: ["risk-fuse", "refund-open", "touch-frequency-blocked"],
    action: "报告打开后展示价值解释、下一步学习路径和对应权益入口",
    observationWindow: "3天",
    metrics: ["report_open_rate", "next_action_click_rate", "renewal_signal_lift"],
    dataDependencies: ["report_opened", "strategy_id", "audience_pack_id", "touch_writeback"],
    status: "online",
    differenceConfig: {
      "r-line": { valueHook: "阅读成长 + 奖学金提醒", benefit: "奖学金可兑换续费券" },
      "k-line": { valueHook: "K2能力成长路径 + 中心化SOP", benefit: "阶段规划权益" },
      "e-line": { valueHook: "升阶规划 + 长期学习目标", benefit: "升阶体验权益" }
    }
  },
  {
    id: "ES-EXEC-MISS-001",
    name: "连续漏学修复策略包",
    type: "centralized-touch",
    ownerRole: "execution-strategy",
    scope: "line-reusable",
    reusable: true,
    target: { businessLines: ["r-line", "k-line", "e-line"], productTypes: ["monthly", "annual"], lifecycleNodes: ["T7", "T14", "M3", "M6"] },
    exclusions: ["risk-fuse", "after-sales-unclosed"],
    action: "识别漏学后发送补读路径，并在7天观察回流",
    observationWindow: "7天",
    metrics: ["completion_rate_lift_7d", "active_days_lift_7d", "inbound_risk_rate"],
    dataDependencies: ["completion_rate", "missed_days", "touch_writeback", "activity_writeback"],
    status: "online",
    differenceConfig: {
      "r-line": { valueHook: "阅读补读 + 轻活动提分", benefit: "补读奖学金" },
      "k-line": { valueHook: "词汇/表达复习任务", benefit: "复习直播预约" },
      "e-line": { valueHook: "综合能力薄弱项复习", benefit: "升阶规划提醒" }
    }
  },
  {
    id: "ES-MODEL-HIGH-001",
    name: "高优续费识别与关单SOP",
    type: "renewal-model",
    ownerRole: "model-strategy",
    scope: "line-reusable",
    reusable: true,
    target: { businessLines: ["r-line", "k-line", "e-line"], productTypes: ["monthly", "annual"], lifecycleNodes: ["T22", "T24", "T28", "M8", "M11", "M12"] },
    exclusions: ["risk-fuse", "h4-low-maintenance"],
    action: "识别H1/H2高优、领券未付、支付失败和报告已开未转化用户，进入策略关单路径",
    observationWindow: "续费窗口内",
    metrics: ["h1_h2_renewal_rate", "coupon_to_pay_rate", "high_score_miss_rate"],
    dataDependencies: ["score_snapshot", "transaction_status", "marketing_events", "risk_status"],
    status: "online",
    differenceConfig: {
      "r-line": { valueHook: "月转年/年转年权益解释", benefit: "奖学金抵扣上限" },
      "k-line": { valueHook: "K2路径价值解释", benefit: "续费权益包" },
      "e-line": { valueHook: "升阶课程价值解释", benefit: "升阶规划权益" }
    }
  }
];

const audiencePacks = [
  { id: "AUD-RLINE-HIGH-RENEWAL", name: "R线高优续费窗口人群", businessLine: "r-line", levelCode: "R1-R6", productType: "annual", lifecycleNodes: ["M8", "M11", "M12"], targetCount: 1280, excludedCount: 96, overlapRate: 0.18, dataFreshness: "T+1", rules: ["H1/H2", "无风险熔断", "报告已打开或领券未付"] },
  { id: "AUD-KLINE-MISS-REPAIR", name: "K线连续漏学修复人群", businessLine: "k-line", levelCode: "K2", productType: "annual", lifecycleNodes: ["M3", "M6"], targetCount: 640, excludedCount: 42, overlapRate: 0.11, dataFreshness: "T+1", rules: ["近7天漏学>=3天", "可触达", "无售后未完结"] },
  { id: "AUD-ELINE-STRUCTURE", name: "E线升阶规划样例人群", businessLine: "e-line", levelCode: "E1", productType: "annual", lifecycleNodes: ["M6", "M8"], targetCount: 0, excludedCount: 0, overlapRate: 0, dataFreshness: "待接入", rules: ["结构样例，待接入真实字段"] }
];

const dispatchBatches = [
  { id: "DSP-20260722-001", strategyId: "ES-OUTCOME-REPORT-001", audiencePackId: "AUD-RLINE-HIGH-RENEWAL", businessLine: "r-line", downstreamSystem: "私聊/前台卡片", status: "completed", plannedCount: 1280, reachedCount: 1096, failedCount: 48, writebackStatus: "complete", observationWindow: "3天" },
  { id: "DSP-20260722-002", strategyId: "ES-EXEC-MISS-001", audiencePackId: "AUD-KLINE-MISS-REPAIR", businessLine: "k-line", downstreamSystem: "中心化触达系统", status: "running", plannedCount: 640, reachedCount: 412, failedCount: 31, writebackStatus: "partial", observationWindow: "7天" }
];

const effectivenessMetrics = [
  { id: "EFF-RLINE-REPORT", strategyId: "ES-OUTCOME-REPORT-001", businessLine: "r-line", metric: "报告打开后下一步点击率", value: 31.4, benchmark: 24.0, direction: "positive", window: "3天" },
  { id: "EFF-KLINE-MISS", strategyId: "ES-EXEC-MISS-001", businessLine: "k-line", metric: "7天活跃天数提升", value: 1.2, benchmark: 0.8, direction: "positive", window: "7天" },
  { id: "EFF-RLINE-HIGH", strategyId: "ES-MODEL-HIGH-001", businessLine: "r-line", metric: "H1/H2续费率", value: 42.6, benchmark: 30.0, direction: "positive", window: "续费窗口" }
];

const inboundReviews = [
  { id: "INB-001", businessLine: "r-line", sourceStrategyId: "ES-OUTCOME-REPORT-001", type: "报告", quality: "high-value", solved: true, scoreImpact: "plus", suggestion: "保留报告入口，补充奖学金解释" },
  { id: "INB-002", businessLine: "k-line", sourceStrategyId: "ES-EXEC-MISS-001", type: "学习", quality: "normal", solved: true, scoreImpact: "none", suggestion: "补读路径文案减少催学感" }
];

const dataRequirements = [
  { id: "REQ-DOMAIN-001", name: "业务域主数据", owner: "产研/数据", status: "must-add", refreshCycle: "每日", reason: "全线中台必须按业务线、级别、班期和生命周期模板聚合", fallback: "R线样板静态配置" },
  { id: "REQ-STRATEGY-001", name: "策略ID/版本ID", owner: "策略/产研", status: "must-add", refreshCycle: "实时/T+1", reason: "策略下发、回写和复盘必须能追溯到版本", fallback: "人工维护策略资产表" },
  { id: "REQ-WRITEBACK-001", name: "触达和活动回写", owner: "CRM/活动/数据", status: "needs-adaptation", refreshCycle: "T+1", reason: "判断策略动作是否真的影响学习和转化", fallback: "批次级汇总回填" }
];
```

Then update `SEED_STATE` to include the new arrays:

```js
export const SEED_STATE = {
  version: "seed-2026-07-22-english-strategy",
  generatedAt: "2026-07-22T10:00:00+08:00",
  businessLines,
  lifecycleTemplates,
  strategyAssets,
  audiencePacks,
  dispatchBatches,
  effectivenessMetrics,
  inboundReviews,
  dataRequirements,
  users,
  tasks,
  activities,
  scholarship,
  demands: []
};
```

- [ ] **Step 4: Implement selector module**

Create `core/strategy-domain.js`:

```js
function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function getBusinessLines(state) {
  return Array.isArray(state?.businessLines) ? state.businessLines : [];
}

export function getActiveBusinessDomain(state) {
  const id = state?.ui?.businessLine || "english-all";
  return getBusinessLines(state).find((line) => line.id === id) || getBusinessLines(state)[0] || null;
}

export function strategyAssetsForDomain(state, domainFilter = {}) {
  const assets = Array.isArray(state?.strategyAssets) ? state.strategyAssets : [];
  const businessLine = domainFilter.businessLine || "english-all";
  if (businessLine === "english-all") return assets;
  return assets.filter((asset) => asset.target?.businessLines?.includes(businessLine) || asset.businessLine === businessLine);
}

export function coverageByBusinessLine(state) {
  return getBusinessLines(state)
    .filter((line) => line.id !== "english-all")
    .map((line) => {
      const assets = strategyAssetsForDomain(state, { businessLine: line.id });
      const onlineCount = assets.filter((asset) => asset.status === "online").length;
      const coverageStatus = onlineCount >= 3 ? "healthy" : onlineCount >= 1 ? "partial" : "needs-setup";
      return {
        businessLine: line.id,
        name: line.name,
        sampleDepth: line.sampleDepth,
        assetCount: assets.length,
        onlineCount,
        coverageStatus
      };
    });
}

export function strategyDashboardSummary(state) {
  const lines = getBusinessLines(state).filter((line) => line.id !== "english-all");
  const assets = Array.isArray(state?.strategyAssets) ? state.strategyAssets : [];
  const onlineAssetCount = assets.filter((asset) => asset.status === "online").length;
  const reusableAssetCount = assets.filter((asset) => asset.reusable).length;
  const batches = Array.isArray(state?.dispatchBatches) ? state.dispatchBatches : [];
  const completedBatches = batches.filter((batch) => batch.status === "completed").length;
  return {
    businessLineCount: lines.length,
    assetCount: assets.length,
    onlineAssetCount,
    reusableAssetCount,
    strategyHealthRate: percent(onlineAssetCount, Math.max(assets.length, 1)),
    completedBatchRate: percent(completedBatches, Math.max(batches.length, 1)),
    dataRequirementCount: state?.dataRequirements?.length || 0
  };
}

export function audienceSummary(state, audiencePackId) {
  const pack = (state?.audiencePacks || []).find((item) => item.id === audiencePackId);
  if (!pack) return null;
  return {
    ...pack,
    totalConsidered: pack.targetCount + pack.excludedCount,
    exclusionRate: percent(pack.excludedCount, pack.targetCount + pack.excludedCount)
  };
}

export function dispatchSummary(state) {
  const batches = Array.isArray(state?.dispatchBatches) ? state.dispatchBatches : [];
  const planned = batches.reduce((sum, batch) => sum + (batch.plannedCount || 0), 0);
  const reached = batches.reduce((sum, batch) => sum + (batch.reachedCount || 0), 0);
  const complete = batches.filter((batch) => batch.writebackStatus === "complete").length;
  return {
    totalBatches: batches.length,
    plannedCount: planned,
    reachedCount: reached,
    reachRate: percent(reached, planned),
    writebackCompleteRate: percent(complete, Math.max(batches.length, 1))
  };
}
```

- [ ] **Step 5: Run selector tests**

Run: `npm test -- tests/strategy-domain.test.mjs`

Expected: PASS.

- [ ] **Step 6: Run all tests to surface existing contract failures**

Run: `npm test`

Expected: existing shell/navigation tests may fail because app labels still use old R-line frontline navigation. Record failures for Task 2.

- [ ] **Step 7: Commit**

```bash
git add data/seed-data.js core/strategy-domain.js tests/strategy-domain.test.mjs
git commit -m "feat: add english strategy domain model"
```

---

### Task 2: Strategy-Only Shell And Navigation

**Files:**
- Modify: `app.js`
- Test: `tests/ui-shell.test.mjs`
- Add: `tests/english-strategy-shell.test.mjs`

**Interfaces:**
- Consumes: Task 1 seed state and selectors.
- Produces:
  - `NAV_ITEMS` with 13 strategy modules.
  - `STRATEGY_AREAS` replacing frontline `ROLES`.
  - `routeFromHash(hash)` still supports old hash behavior.
  - `visibleItems()` returns all strategy nav items because the shell is not role-permission based.

- [ ] **Step 1: Write failing shell tests**

Update `tests/ui-shell.test.mjs` first test:

```js
test("shell exposes the English strategy center navigation", () => {
  assert.deepEqual(ROLES.map(({ id }) => id), ["strategy"]);
  assert.deepEqual(NAV_ITEMS.map(({ label }) => label), [
    "全线总控",
    "业务线下钻",
    "策略资产库",
    "内容策略",
    "应用策略",
    "执行策略",
    "模型策略",
    "用户洞察",
    "人群圈选",
    "下发追踪",
    "有效性看板",
    "进线复盘",
    "数据底座"
  ]);
  assert.ok(NAV_ITEMS.every((item) => item.stage === "strategy"));
});
```

Update the routing test:

```js
test("hash routing restores strategy views without frontline role filtering", () => {
  assert.equal(routeFromHash("#audiences"), "audiences");
  assert.equal(routeFromHash("#view=dispatch"), "dispatch");
  assert.equal(routeFromHash("#%E0%A4%A"), "dashboard");
  assert.deepEqual(visibleItems("strategy").map(({ id }) => id), NAV_ITEMS.map(({ id }) => id));
  assert.equal(ensureVisibleView("models", "strategy"), "models");
});
```

Add `tests/english-strategy-shell.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { FLOW_STAGES, NAV_ITEMS } from "../app.js";

test("flow rail no longer describes frontline dispatch flow", () => {
  assert.deepEqual(FLOW_STAGES.map((stage) => stage.label), ["策略配置", "人群圈选", "下发追踪", "数据回写", "效果复盘"]);
});

test("static shell copy names English strategy center", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /英语业务策略经营中台/);
  assert.doesNotMatch(app, /Agent协同/);
  assert.doesNotMatch(app, /角色任务台/);
});

test("navigation ids are stable for GitHub Pages hashes", () => {
  assert.deepEqual(NAV_ITEMS.map((item) => item.id), [
    "dashboard",
    "business-lines",
    "strategy-assets",
    "content",
    "applications",
    "execution",
    "models",
    "insights",
    "audiences",
    "dispatch",
    "effectiveness",
    "inbound-review",
    "data-foundation"
  ]);
});
```

- [ ] **Step 2: Run shell tests and verify they fail**

Run: `npm test -- tests/ui-shell.test.mjs tests/english-strategy-shell.test.mjs`

Expected: FAIL because navigation and role copy still use the old role-based frontend.

- [ ] **Step 3: Update imports and navigation in `app.js`**

Replace old role imports and view imports with:

```js
import * as dashboardView from "./views/dashboard.js";
import * as businessLinesView from "./views/business-lines.js";
import * as strategyAssetsView from "./views/strategy-assets.js";
import * as contentView from "./views/content.js";
import * as applicationsView from "./views/applications.js";
import * as executionView from "./views/execution.js";
import * as modelsView from "./views/models.js";
import * as insightsView from "./views/insights.js";
import * as audiencesView from "./views/users.js";
import * as dispatchView from "./views/tasks.js";
import * as effectivenessView from "./views/review.js";
import * as inboundReviewView from "./views/intake.js";
import * as dataFoundationView from "./views/data-foundation.js";
```

Replace `ROLES`, `NAV_ITEMS`, and `FLOW_STAGES` with:

```js
export const ROLES = Object.freeze([
  { id: "strategy", label: "策略团队", permission: "查看英语全线策略配置、下发、回写和复盘；不展示一线个人作业权限。" }
]);

export const NAV_ITEMS = Object.freeze([
  { id: "dashboard", label: "全线总控", icon: "layout-dashboard", stage: "strategy", description: "英语各业务线策略健康、覆盖、执行和风险总览" },
  { id: "business-lines", label: "业务线下钻", icon: "network", stage: "strategy", description: "R线、K线、E线、级别与班期策略明细" },
  { id: "strategy-assets", label: "策略资产库", icon: "folder-kanban", stage: "strategy", description: "策略、SOP、模型、内容、权益和版本统一管理" },
  { id: "content", label: "内容策略", icon: "calendar-range", stage: "strategy", description: "活动、讲座、PK、月测、报告和权益内容配置" },
  { id: "applications", label: "应用策略", icon: "bot", stage: "strategy", description: "AI场景、Agent知识库、解决率和兜底问题" },
  { id: "execution", label: "执行策略", icon: "send", stage: "strategy", description: "中心化触达、频控、冲突和动作包配置" },
  { id: "models", label: "模型策略", icon: "calculator", stage: "strategy", description: "高优识别、续费窗口、关单SOP和模型校准" },
  { id: "insights", label: "用户洞察", icon: "scan-search", stage: "strategy", description: "画像、评分、信号、权益和行为归因" },
  { id: "audiences", label: "人群圈选", icon: "users", stage: "audience", description: "按业务域、标签、分数、风险和行为生成人群包" },
  { id: "dispatch", label: "下发追踪", icon: "list-checks", stage: "dispatch", description: "策略包下发、执行状态、失败原因和回写完整度" },
  { id: "effectiveness", label: "有效性看板", icon: "chart-no-axes-combined", stage: "review", description: "策略覆盖、触达周期、SOP效果和实验校准" },
  { id: "inbound-review", label: "进线复盘", icon: "git-pull-request-arrow", stage: "review", description: "策略归因、进线质量、问题反哺和修正建议" },
  { id: "data-foundation", label: "数据底座", icon: "database", stage: "writeback", description: "业务域、事件、字段、刷新、产研提需和验收" }
]);

export const FLOW_STAGES = Object.freeze([
  { id: "strategy", label: "策略配置" },
  { id: "audience", label: "人群圈选" },
  { id: "dispatch", label: "下发追踪" },
  { id: "writeback", label: "数据回写" },
  { id: "review", label: "效果复盘" }
]);
```

Replace `viewModules` with:

```js
const viewModules = new Map([
  ["dashboard", dashboardView],
  ["business-lines", businessLinesView],
  ["strategy-assets", strategyAssetsView],
  ["content", contentView],
  ["applications", applicationsView],
  ["execution", executionView],
  ["models", modelsView],
  ["insights", insightsView],
  ["audiences", audiencesView],
  ["dispatch", dispatchView],
  ["effectiveness", effectivenessView],
  ["inbound-review", inboundReviewView],
  ["data-foundation", dataFoundationView]
]);
```

- [ ] **Step 4: Simplify role filtering**

Replace `visibleItems`, `validRole`, `roleTaskCount`, and role task count usage:

```js
function validRole(role) {
  return role === "strategy" ? "strategy" : "strategy";
}

export function visibleItems() {
  return NAV_ITEMS;
}

function roleTaskCount() {
  return 0;
}
```

Remove nav count rendering from `renderSidebar` and use:

```js
const links = visibleItems().map((item) => {
  const isCurrent = item.id === app.currentView;
  return `<a class="nav-item${isCurrent ? " is-current" : ""}" href="#${escapeAttribute(item.id)}"${isCurrent ? ' aria-current="page"' : ""}>${icon(item.icon, { className: "nav-item__icon" })}<span>${escapeHtml(item.label)}</span></a>`;
}).join("");
```

Set the brand shell to:

```js
app.sidebar.innerHTML = `<div class="sidebar__header"><a class="brand" href="#dashboard" aria-label="英语业务策略经营中台"><span class="brand__mark" aria-hidden="true">英</span><span class="brand__text"><strong>英语策略中台</strong><small>R线首发样板</small></span></a>${iconButton({ icon: "x", label: "关闭导航", id: "navCloseButton", className: "sidebar__close" })}</div><nav class="nav-list" aria-label="策略中台视图">${links}</nav><div class="sidebar__foot"><strong>策略团队</strong><span>全线经营视角</span><small>仅展示策略配置、下发、回写和复盘，不是一线作业台。</small></div>`;
```

- [ ] **Step 5: Replace topbar role selector with business-domain status**

In `renderTopbar`, remove the `<select id="roleSelect">` block and use:

```js
app.topbar.innerHTML = `<div class="topbar__flow">${iconButton({ icon: "menu", label: "打开导航", id: "navMenuButton", className: "menu-button", controls: "appSidebar", expanded: document.body.classList.contains("nav-open") })}${renderFlowRail(stage)}</div><div class="topbar__tools">${storageTools}${iconButton({ icon: "undo-2", label: "撤销最近一次更改", id: "undoButton", disabled: (state.history?.length ?? 0) === 0 })}${iconButton({ icon: "rotate-ccw", label: "重置本地演示数据", id: "resetButton" })}<span class="role-hint">英语全线策略视角 · R线首发样板</span></div>`;
```

Remove the `roleSelect` event listener from the app initialization block.

- [ ] **Step 6: Run shell tests**

Run: `npm test -- tests/ui-shell.test.mjs tests/english-strategy-shell.test.mjs`

Expected: PASS.

- [ ] **Step 7: Run all tests**

Run: `npm test`

Expected: Some view-specific tests may still fail because old views have not been converted. Record failures for Tasks 3-6.

- [ ] **Step 8: Commit**

```bash
git add app.js tests/ui-shell.test.mjs tests/english-strategy-shell.test.mjs
git commit -m "feat: switch shell to english strategy center"
```

---

### Task 3: All-Line Dashboard, Business Drilldown, And Asset Library

**Files:**
- Modify: `views/dashboard.js`
- Create: `views/business-lines.js`
- Create: `views/strategy-assets.js`
- Modify: `ui/components.js`
- Test: `tests/task-8-reference-views.test.mjs`

**Interfaces:**
- Consumes: `strategyDashboardSummary`, `coverageByBusinessLine`, `strategyAssetsForDomain` from `core/strategy-domain.js`.
- Produces visible views for `dashboard`, `business-lines`, and `strategy-assets`.

- [ ] **Step 1: Write failing reference view tests**

Update `tests/task-8-reference-views.test.mjs` with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { SEED_STATE } from "../data/seed-data.js";
import * as dashboardView from "../views/dashboard.js";
import * as businessLinesView from "../views/business-lines.js";
import * as strategyAssetsView from "../views/strategy-assets.js";

function render(view, routeParams = {}) {
  const dom = new JSDOM(`<main id="root"></main>`);
  const root = dom.window.document.getElementById("root");
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

test("business line drilldown treats R-line as full sample and K\/E as supported structures", () => {
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
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/task-8-reference-views.test.mjs`

Expected: FAIL because `views/business-lines.js` and `views/strategy-assets.js` do not exist.

- [ ] **Step 3: Add reusable UI helpers**

Append to `ui/components.js`:

```js
export function renderMetricStrip(items = []) {
  return `<dl class="metric-strip">${items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd><small>${escapeHtml(item.hint || "")}</small></div>`).join("")}</dl>`;
}

export function renderStrategyCard(asset = {}) {
  const target = asset.target || {};
  const lines = Array.isArray(target.businessLines) ? target.businessLines.join(" / ") : "全线";
  const scopeLabel = asset.reusable ? "全线复用" : "单线配置";
  return `<article class="strategy-card" data-strategy-id="${escapeAttribute(asset.id)}"><header><p class="section-kicker">${escapeHtml(asset.id || "")}</p><h3>${escapeHtml(asset.name || "未命名策略")}</h3>${renderBadge(asset.status || "neutral", scopeLabel)}</header><dl><div><dt>业务线</dt><dd>${escapeHtml(lines)}</dd></div><div><dt>动作</dt><dd>${escapeHtml(asset.action || "-")}</dd></div><div><dt>观察窗口</dt><dd>${escapeHtml(asset.observationWindow || "-")}</dd></div></dl></article>`;
}
```

- [ ] **Step 4: Implement dashboard view**

Replace `views/dashboard.js` with:

```js
import { coverageByBusinessLine, strategyDashboardSummary } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const summary = strategyDashboardSummary(state);
  const coverage = coverageByBusinessLine(state);
  const metrics = [
    { label: "业务线", value: `${summary.businessLineCount}条`, hint: "R线完整样板，K/E结构接入" },
    { label: "在线策略", value: `${summary.onlineAssetCount}/${summary.assetCount}`, hint: `${summary.strategyHealthRate}%上线率` },
    { label: "可复用资产", value: `${summary.reusableAssetCount}个`, hint: "支持跨线复制和差异配置" },
    { label: "下发完成", value: `${summary.completedBatchRate}%`, hint: "按策略批次追踪" },
    { label: "产研依赖", value: `${summary.dataRequirementCount}项`, hint: "字段/事件/刷新/验收" }
  ];

  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略团队经营视角</p><h1>英语全线策略总控</h1><p>用同一套后台管理R线、K线、E线和后续级别的策略覆盖、资产配置、下发追踪与效果复盘。</p></div>${renderBadge("info", "R线首发样板")}</section>${renderMetricStrip(metrics)}<section class="panel"><header class="panel__header"><div><p class="section-kicker">业务线覆盖</p><h2>全线健康矩阵</h2></div></header>${renderTable({ columns: [
    { key: "name", label: "业务线" },
    { key: "sampleDepth", label: "样本深度", format: (value) => value === "full" ? "完整样板" : "结构样例" },
    { key: "assetCount", label: "策略资产" },
    { key: "onlineCount", label: "已上线" },
    { key: "coverageStatus", label: "覆盖状态", trustedHtml: (value) => renderBadge(value === "healthy" ? "success" : value === "partial" ? "warning" : "danger", value === "healthy" ? "健康" : value === "partial" ? "部分覆盖" : "待配置") }
  ], rows: coverage })}</section>`;
}
```

- [ ] **Step 5: Implement business line drilldown view**

Create `views/business-lines.js`:

```js
import { coverageByBusinessLine, strategyAssetsForDomain } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const coverage = coverageByBusinessLine(state);
  const rows = coverage.map((line) => ({
    ...line,
    assets: strategyAssetsForDomain(state, { businessLine: line.businessLine })
  }));

  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">业务域下钻</p><h1>业务线 / 级别 / 班期</h1><p>全线先看结构，单线再看节点、策略、人群、执行和数据缺口。R线是当前完整样板，K线/E线先保留结构样例。</p></div>${renderBadge("info", "全线可复用")}</section><section class="line-grid">${rows.map((line) => `<article class="line-card"><header><p class="section-kicker">${escapeHtml(line.businessLine)}</p><h2>${escapeHtml(line.name)}${line.businessLine === "r-line" ? "首发样板" : ""}</h2>${renderBadge(line.coverageStatus === "healthy" ? "success" : line.coverageStatus === "partial" ? "warning" : "danger", line.sampleDepth === "full" ? "完整样板" : "结构样例")}</header>${renderMetricStrip([
    { label: "策略资产", value: `${line.assetCount}` },
    { label: "在线", value: `${line.onlineCount}` },
    { label: "样本", value: line.sampleDepth === "full" ? "完整" : "结构" }
  ])}<ul class="compact-list">${line.assets.map((asset) => `<li><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.observationWindow)}</span></li>`).join("")}</ul></article>`).join("")}</section>`;
}
```

- [ ] **Step 6: Implement strategy asset library view**

Create `views/strategy-assets.js`:

```js
import { strategyAssetsForDomain } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderStrategyCard, renderTable } from "../ui/components.js";

function differenceSummary(asset) {
  return Object.entries(asset.differenceConfig || {})
    .map(([line, config]) => `${line}: ${config.valueHook}`)
    .join("；");
}

export function render(container, { state }) {
  const assets = strategyAssetsForDomain(state, { businessLine: "english-all" });
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略资产</p><h1>策略资产库</h1><p>统一管理内容、执行、模型、用户洞察和AI应用策略。每个资产都要能看出是否全线复用，以及单线差异如何配置。</p></div>${renderBadge("success", "版本化")}</section><section class="strategy-card-grid">${assets.map(renderStrategyCard).join("")}</section><section class="panel"><header class="panel__header"><div><p class="section-kicker">复用与差异</p><h2>策略模板对照</h2></div></header>${renderTable({ columns: [
    { key: "id", label: "策略ID" },
    { key: "name", label: "名称" },
    { key: "scope", label: "复用范围", format: (value) => value === "line-reusable" ? "全线复用" : value },
    { key: "difference", label: "差异配置" }
  ], rows: assets.map((asset) => ({ ...asset, difference: differenceSummary(asset) })) })}</section>`;
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/task-8-reference-views.test.mjs`

Expected: PASS.

- [ ] **Step 8: Run all tests**

Run: `npm test`

Expected: Remaining failures only in views that still assert old intake/task/lifecycle behavior. Address them in Tasks 4-6.

- [ ] **Step 9: Commit**

```bash
git add ui/components.js views/dashboard.js views/business-lines.js views/strategy-assets.js tests/task-8-reference-views.test.mjs
git commit -m "feat: add english strategy dashboard and assets"
```

---

### Task 4: Five Strategy Workspaces

**Files:**
- Create: `views/content.js`
- Create: `views/applications.js`
- Create: `views/execution.js`
- Create: `views/models.js`
- Create: `views/insights.js`
- Modify: `views/lifecycle.js`
- Test: `tests/task-6-workspaces.test.mjs`

**Interfaces:**
- Consumes: `SEED_STATE.strategyAssets`, `SEED_STATE.effectivenessMetrics`, existing users and scholarship examples.
- Produces views for the five strategy roles and updated lifecycle coverage map.

- [ ] **Step 1: Write failing workspace tests**

Replace `tests/task-6-workspaces.test.mjs` with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { SEED_STATE } from "../data/seed-data.js";
import * as contentView from "../views/content.js";
import * as applicationsView from "../views/applications.js";
import * as executionView from "../views/execution.js";
import * as modelsView from "../views/models.js";
import * as insightsView from "../views/insights.js";
import * as lifecycleView from "../views/lifecycle.js";

function htmlFor(view) {
  const dom = new JSDOM(`<main></main>`);
  const root = dom.window.document.querySelector("main");
  view.render(root, { state: SEED_STATE, role: "strategy", components: {} });
  return root.innerHTML;
}

test("content strategy workspace manages content assets not marketing landing copy", () => {
  const html = htmlFor(contentView);
  assert.match(html, /内容策略工作区/);
  assert.match(html, /内容日历/);
  assert.match(html, /成长报告/);
  assert.match(html, /奖学金/);
});

test("application strategy workspace covers AI scene boundaries", () => {
  const html = htmlFor(applicationsView);
  assert.match(html, /应用策略工作区/);
  assert.match(html, /AI场景地图/);
  assert.match(html, /转人工率/);
});

test("execution strategy workspace covers centralized touch and conflicts", () => {
  const html = htmlFor(executionView);
  assert.match(html, /执行策略工作区/);
  assert.match(html, /中心化触达/);
  assert.match(html, /频控/);
});

test("model and insight workspaces support user's core role", () => {
  assert.match(htmlFor(modelsView), /高优续费识别/);
  assert.match(htmlFor(modelsView), /关单SOP/);
  assert.match(htmlFor(insightsView), /用户洞察工作区/);
  assert.match(htmlFor(insightsView), /权益\/奖学金规则/);
});

test("lifecycle view becomes multi-line strategy coverage map", () => {
  const html = htmlFor(lifecycleView);
  assert.match(html, /策略覆盖地图/);
  assert.match(html, /T0-T28/);
  assert.match(html, /M1-M12/);
  assert.match(html, /K线中心化SOP模板/);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/task-6-workspaces.test.mjs`

Expected: FAIL because new views do not exist and lifecycle still uses the old wording.

- [ ] **Step 3: Create shared workspace renderer**

Each new view should follow this structure. For `views/content.js`:

```js
import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

const rows = [
  { module: "内容日历", example: "活动、节日比赛、单词PK、复习直播、讲座、月测、成长报告", metric: "参与率 / 完成率 / 报告打开" },
  { module: "内容资产库", example: "R线奖学金、K线能力路径、E线升阶规划", metric: "资产复用率 / 缺口数" },
  { module: "内容效果复盘", example: "报告打开后是否产生下一步点击和续费信号", metric: "行为提升 / 进线质量 / 转化信号" }
];

export function render(container) {
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">内容策略</p><h1>内容策略工作区</h1><p>配置和复盘能提升学习健康、效果外化和续费认知的内容资产。</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "核心产出", value: "活动+内容资产" },
    { label: "首发样板", value: "R线奖学金" },
    { label: "复用方向", value: "K/E权益替换" }
  ])}<section class="panel"><header class="panel__header"><h2>内容日历与资产</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" },
    { key: "example", label: "示例" },
    { key: "metric", label: "复盘指标" }
  ], rows })}</section>`;
}
```

- [ ] **Step 4: Create the other four workspace views**

Use the same pattern with these exact titles and rows:

`views/applications.js`:

```js
const rows = [
  { module: "AI场景地图", example: "课程入口、活动规则、报告解读、权益说明、常规售后", metric: "命中率 / 解决率 / 转人工率" },
  { module: "知识库缺口", example: "AI无法回答、用户反复追问、转人工后仍未解决", metric: "缺口数 / 修复时长" },
  { module: "AI动作策略", example: "哪些场景先AI解释，哪些场景必须人工介入", metric: "人工节省 / 风险率" }
];
```

`views/execution.js`:

```js
const rows = [
  { module: "触达规则库", example: "节点、人群、渠道、文案版本、卡片、排除条件", metric: "触达率 / 回复率" },
  { module: "周期触达日历", example: "同一人群一周内会收到哪些策略", metric: "冲突数 / 频控命中" },
  { module: "策略动作包", example: "触发条件、动作、回写、观察窗口", metric: "执行完整率 / 回写完整率" }
];
```

`views/models.js`:

```js
const rows = [
  { module: "高优续费识别", example: "H1/H2/H3/H4阈值、加分项、扣分项、风险熔断", metric: "命中率 / 误判率" },
  { module: "续费窗口", example: "R线月课T22-T28、年课M8-M12，其他线可配置", metric: "窗口转化率" },
  { module: "关单SOP", example: "领券未付、支付失败、高优未续、报告已开未转化", metric: "关单率 / 未续原因" }
];
```

`views/insights.js`:

```js
const rows = [
  { module: "用户画像", example: "学习健康、成果外化、家长互动、活动参与、转化信号、风险状态", metric: "画像完整率" },
  { module: "权益/奖学金规则", example: "R线奖学金，K/E可替换为成长值、积分、优惠券", metric: "领取 / 兑换 / 行为提升" },
  { module: "行为归因", example: "策略动作后用户分数、标签、行为是否变化", metric: "H层迁移 / 提分贡献" }
];
```

For each file, wrap rows with page header and table matching Step 3. Use titles `应用策略工作区`, `执行策略工作区`, `模型策略工作区`, `用户洞察工作区`.

- [ ] **Step 5: Convert lifecycle view**

Replace the top-level output in `views/lifecycle.js` with a coverage-focused page:

```js
import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = (state.lifecycleTemplates || []).map((template) => ({
    name: template.name,
    nodes: template.nodes.join(" / "),
    renewalWindow: template.renewalWindow.join(" - "),
    status: template.id === "monthly-t" || template.id === "annual-m" ? "R线样板可用" : "结构样例"
  }));

  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">生命周期</p><h1>策略覆盖地图</h1><p>生命周期页不再是一线服务流程，而是用来查看各业务线节点策略密度、空白和过密风险。</p></div>${renderBadge("info", "多业务线")}</section>${renderMetricStrip([
    { label: "月课模板", value: "T0-T28" },
    { label: "年课模板", value: "M1-M12" },
    { label: "扩展模板", value: "K线中心化SOP模板" }
  ])}<section class="panel"><header class="panel__header"><h2>生命周期模板</h2></header>${renderTable({ columns: [
    { key: "name", label: "模板" },
    { key: "nodes", label: "关键节点" },
    { key: "renewalWindow", label: "续费窗口" },
    { key: "status", label: "状态" }
  ], rows })}</section>`;
}
```

- [ ] **Step 6: Run workspace tests**

Run: `npm test -- tests/task-6-workspaces.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add views/content.js views/applications.js views/execution.js views/models.js views/insights.js views/lifecycle.js tests/task-6-workspaces.test.mjs
git commit -m "feat: add strategy role workspaces"
```

---

### Task 5: Audience Builder And Dispatch Tracking

**Files:**
- Modify: `views/users.js`
- Modify: `views/tasks.js`
- Test: `tests/task-9-interactions.test.mjs`

**Interfaces:**
- Consumes: `SEED_STATE.audiencePacks`, `SEED_STATE.dispatchBatches`, `audienceSummary`, `dispatchSummary`.
- Produces:
  - `views/users.js` as audience builder view.
  - `views/tasks.js` as dispatch tracking view.

- [ ] **Step 1: Write failing tests**

Add to `tests/task-9-interactions.test.mjs`:

```js
test("audience and dispatch views are strategy-level not teacher task pages", async () => {
  const usersSource = await readFile(new URL("../views/users.js", import.meta.url), "utf8");
  const tasksSource = await readFile(new URL("../views/tasks.js", import.meta.url), "utf8");

  assert.match(usersSource, /人群圈选/);
  assert.match(usersSource, /排除人数/);
  assert.match(usersSource, /数据新鲜度/);
  assert.doesNotMatch(usersSource, /真实姓名/);

  assert.match(tasksSource, /下发追踪/);
  assert.match(tasksSource, /策略包/);
  assert.match(tasksSource, /回写完整/);
  assert.doesNotMatch(tasksSource, /老师待办/);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/task-9-interactions.test.mjs`

Expected: FAIL because the source still describes users/tasks in frontline terms.

- [ ] **Step 3: Replace users view with audience builder**

Replace `views/users.js` with:

```js
import { audienceSummary } from "../core/strategy-domain.js";
import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.audiencePacks || [];
  const selected = audienceSummary(state, rows[0]?.id);
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">人群圈选</p><h1>策略人群包</h1><p>按业务线、级别、产品、生命周期、分数、标签、风险和行为圈选目标人群，只输出策略包，不展示一线老师待办。</p></div>${renderBadge("info", "匿名样例")}</section>${selected ? renderMetricStrip([
    { label: "命中人数", value: `${selected.targetCount}` },
    { label: "排除人数", value: `${selected.excludedCount}`, hint: `${selected.exclusionRate}%` },
    { label: "重叠率", value: `${Math.round(selected.overlapRate * 100)}%` },
    { label: "数据新鲜度", value: selected.dataFreshness }
  ]) : ""}<section class="panel"><header class="panel__header"><h2>人群包清单</h2></header>${renderTable({ columns: [
    { key: "id", label: "人群包ID" },
    { key: "name", label: "名称" },
    { key: "businessLine", label: "业务线" },
    { key: "levelCode", label: "级别" },
    { key: "targetCount", label: "命中人数" },
    { key: "excludedCount", label: "排除人数" },
    { key: "dataFreshness", label: "刷新" }
  ], rows })}</section>`;
}
```

- [ ] **Step 4: Replace tasks view with dispatch tracking**

Replace `views/tasks.js` with:

```js
import { dispatchSummary } from "../core/strategy-domain.js";
import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const summary = dispatchSummary(state);
  const rows = state.dispatchBatches || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">下发追踪</p><h1>策略包下发追踪</h1><p>只看策略包是否被系统接收、执行、失败和回写，不展示个人老师待办。</p></div>${renderBadge("info", "策略级")}</section>${renderMetricStrip([
    { label: "批次数", value: `${summary.totalBatches}` },
    { label: "计划人数", value: `${summary.plannedCount}` },
    { label: "触达人次", value: `${summary.reachedCount}`, hint: `${summary.reachRate}%` },
    { label: "回写完整", value: `${summary.writebackCompleteRate}%` }
  ])}<section class="panel"><header class="panel__header"><h2>策略包批次</h2></header>${renderTable({ columns: [
    { key: "id", label: "批次ID" },
    { key: "strategyId", label: "策略ID" },
    { key: "audiencePackId", label: "人群包" },
    { key: "downstreamSystem", label: "下发系统" },
    { key: "status", label: "状态" },
    { key: "plannedCount", label: "计划" },
    { key: "reachedCount", label: "触达" },
    { key: "writebackStatus", label: "回写" }
  ], rows })}</section>`;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/task-9-interactions.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add views/users.js views/tasks.js tests/task-9-interactions.test.mjs
git commit -m "feat: add audience and dispatch strategy views"
```

---

### Task 6: Effectiveness, Inbound Review, And Data Foundation

**Files:**
- Modify: `views/review.js`
- Modify: `views/intake.js`
- Modify: `views/data-foundation.js`
- Modify: `views/system-map.js`
- Modify: `views/demands.js`
- Test: `tests/task-7-intake-feedback.test.mjs`
- Test: `tests/contracts.test.mjs`

**Interfaces:**
- Consumes: `SEED_STATE.effectivenessMetrics`, `SEED_STATE.inboundReviews`, `SEED_STATE.dataRequirements`.
- Produces strategy effectiveness, inbound strategy review, and data/product requirement surfaces.

- [ ] **Step 1: Write failing tests**

Replace old intake feedback expectations in `tests/task-7-intake-feedback.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { SEED_STATE } from "../data/seed-data.js";
import * as reviewView from "../views/review.js";
import * as intakeView from "../views/intake.js";
import * as dataFoundationView from "../views/data-foundation.js";

function render(view) {
  const dom = new JSDOM(`<main></main>`);
  const root = dom.window.document.querySelector("main");
  view.render(root, { state: SEED_STATE, role: "strategy", components: {} });
  return root.innerHTML;
}

test("effectiveness view measures strategy performance by business line", () => {
  const html = render(reviewView);
  assert.match(html, /有效性看板/);
  assert.match(html, /H1\/H2续费率/);
  assert.match(html, /报告打开后下一步点击率/);
});

test("inbound review is strategy attribution not dispatch", () => {
  const html = render(intakeView);
  assert.match(html, /进线复盘/);
  assert.match(html, /策略归因/);
  assert.match(html, /质量评级/);
  assert.doesNotMatch(html, /派单/);
});

test("data foundation shows business-domain and product-engineering requirements", () => {
  const html = render(dataFoundationView);
  assert.match(html, /业务域主数据/);
  assert.match(html, /策略ID\/版本ID/);
  assert.match(html, /刷新周期/);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- tests/task-7-intake-feedback.test.mjs`

Expected: FAIL because old views still use intake/task language.

- [ ] **Step 3: Replace review view with effectiveness dashboard**

Replace `views/review.js`:

```js
import { renderBadge, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.effectivenessMetrics || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略复盘</p><h1>有效性看板</h1><p>按业务线、策略ID、版本、人群、渠道和观察窗口复盘策略是否带来学习、活跃、进线质量和转化改善。</p></div>${renderBadge("success", "观察窗口")}</section><section class="panel"><header class="panel__header"><h2>策略效果指标</h2></header>${renderTable({ columns: [
    { key: "businessLine", label: "业务线" },
    { key: "strategyId", label: "策略ID" },
    { key: "metric", label: "指标" },
    { key: "value", label: "当前值" },
    { key: "benchmark", label: "基准" },
    { key: "window", label: "观察窗口" },
    { key: "direction", label: "方向", trustedHtml: (value) => renderBadge(value === "positive" ? "success" : "warning", value === "positive" ? "正向" : "观察") }
  ], rows })}</section>`;
}
```

- [ ] **Step 4: Replace intake view with inbound review**

Replace `views/intake.js`:

```js
import { renderBadge, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.inboundReviews || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">进线复盘</p><h1>策略归因与进线质量</h1><p>这里不做进线派发，只判断哪个策略导致进线、质量如何、是否解决，以及要反哺文案、入口、频控、内容、模型还是产研。</p></div>${renderBadge("info", "非派单")}</section><section class="panel"><header class="panel__header"><h2>进线质量复盘</h2></header>${renderTable({ columns: [
    { key: "businessLine", label: "业务线" },
    { key: "sourceStrategyId", label: "来源策略ID" },
    { key: "type", label: "进线类型" },
    { key: "quality", label: "质量评级" },
    { key: "solved", label: "是否解决", format: (value) => value ? "已解决" : "未解决" },
    { key: "scoreImpact", label: "分数影响" },
    { key: "suggestion", label: "策略修正建议" }
  ], rows })}</section>`;
}
```

- [ ] **Step 5: Replace data foundation view**

Replace `views/data-foundation.js`:

```js
import { renderBadge, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.dataRequirements || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">数据底座</p><h1>数据底座与产研提需</h1><p>让产研一眼看清楚已有能力、缺口、刷新周期、取数口径、替代方案和验收标准。</p></div>${renderBadge("warning", "需回填")}</section><section class="panel"><header class="panel__header"><h2>字段与系统能力</h2></header>${renderTable({ columns: [
    { key: "id", label: "需求ID" },
    { key: "name", label: "名称" },
    { key: "owner", label: "负责人" },
    { key: "status", label: "状态", trustedHtml: (value) => renderBadge(value, value) },
    { key: "refreshCycle", label: "刷新周期" },
    { key: "reason", label: "新增原因" },
    { key: "fallback", label: "替代方案" }
  ], rows })}</section>`;
}
```

- [ ] **Step 6: Convert system-map and demands to redirect-style strategy references**

Replace `views/system-map.js` with a compact page that points to the same requirement dataset:

```js
export { render } from "./data-foundation.js";
```

Replace `views/demands.js`:

```js
export { render } from "./data-foundation.js";
```

This preserves old imports if tests or bookmarks still reference them, while the visible navigation uses `data-foundation`.

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/task-7-intake-feedback.test.mjs tests/contracts.test.mjs`

Expected: PASS after adjusting any contract expectations that still require old intake/task strings.

- [ ] **Step 8: Commit**

```bash
git add views/review.js views/intake.js views/data-foundation.js views/system-map.js views/demands.js tests/task-7-intake-feedback.test.mjs tests/contracts.test.mjs
git commit -m "feat: add strategy effectiveness and data foundation"
```

---

### Task 7: Visual Polish, Full Verification, And GitHub Pages Push

**Files:**
- Modify: `styles.css`
- Modify: `README.md`
- Test: `tests/english-strategy-shell.test.mjs`

**Interfaces:**
- Consumes: all completed views.
- Produces a polished, shareable GitHub Pages prototype.

- [ ] **Step 1: Add visual regression-oriented text checks**

Append to `tests/english-strategy-shell.test.mjs`:

```js
test("styles include strategy dashboard responsive surfaces", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.metric-strip/);
  assert.match(styles, /\.line-grid/);
  assert.match(styles, /\.strategy-card-grid/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)/);
});
```

- [ ] **Step 2: Run style test and verify it fails if classes are missing**

Run: `npm test -- tests/english-strategy-shell.test.mjs`

Expected: FAIL if the classes are not present.

- [ ] **Step 3: Add CSS for new strategy surfaces**

Append or merge into `styles.css`:

```css
.metric-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
}

.metric-strip div,
.line-card,
.strategy-card,
.panel {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 8px;
}

.metric-strip div {
  padding: 14px;
}

.metric-strip dt {
  color: var(--muted);
  font-size: 12px;
}

.metric-strip dd {
  margin: 6px 0 0;
  font-size: 24px;
  font-weight: 700;
}

.metric-strip small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
}

.line-grid,
.strategy-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.line-card,
.strategy-card {
  padding: 16px;
}

.line-card header,
.strategy-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.line-card h2,
.strategy-card h3 {
  margin: 4px 0 10px;
  font-size: 18px;
}

.compact-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 8px;
}

.compact-list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.panel {
  padding: 16px;
  margin-top: 16px;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 900px) {
  .line-card header,
  .strategy-card header,
  .panel__header,
  .compact-list li {
    display: block;
  }
}
```

- [ ] **Step 4: Update README**

Change the README title and scope:

```md
# 英语业务策略经营中台

这是一个可公开分享的静态原型，用于向产研和项目组说明策略团队后台应该如何管理英语各业务线、各级别和各班期的策略资产、用户圈选、下发追踪、效果复盘和数据提需。

R线是首发样板线；K线、E线以同一套数据模型保留结构接入能力。
```

- [ ] **Step 5: Run all unit tests**

Run: `npm test`

Expected: PASS. Record the total passing count in the final task notes.

- [ ] **Step 6: Start local server**

Run: `npm run serve`

Expected: server starts on `http://localhost:4173`. Keep the session running for Playwright checks.

- [ ] **Step 7: Verify desktop and mobile rendering with Playwright**

Run a Playwright check that:

```js
await page.goto("http://localhost:4173");
await expect(page.getByRole("heading", { name: "英语全线策略总控" })).toBeVisible();
await page.setViewportSize({ width: 390, height: 844 });
await expect(page.getByLabel("打开导航")).toBeVisible();
```

Expected: desktop and mobile render without overlapping text, blank content, or unreachable navigation.

- [ ] **Step 8: Stop local server**

Stop the `npm run serve` process using the running session's interrupt input.

Expected: no long-running terminal session remains.

- [ ] **Step 9: Commit polish and docs**

```bash
git add styles.css README.md tests/english-strategy-shell.test.mjs
git commit -m "polish: prepare english strategy center prototype"
```

- [ ] **Step 10: Push to GitHub Pages branch**

Run:

```bash
git push origin codex/rline-strategy-action-config
```

If the user wants the public URL updated from this branch, merge or fast-forward to the GitHub Pages publishing branch used by this repository, then push that branch.

Expected: [https://viannni.github.io/rline-strategy-center-pages/](https://viannni.github.io/rline-strategy-center-pages/) shows the English strategy center once GitHub Pages finishes deploying.

---

## Self-Review

- Spec coverage: The plan covers English-wide positioning, R-line sample status, business-domain fields, strategy assets, five strategy role workspaces, audience selection, dispatch tracking, effectiveness, inbound review, data foundation, and the removal of frontline workbench surfaces.
- Placeholder scan: The plan contains no TBD/TODO/fill-later instructions. Every code-writing step includes concrete snippets or exact replacement structure.
- Type consistency: The seed arrays created in Task 1 are consumed by selectors and views using the same names: `businessLines`, `lifecycleTemplates`, `strategyAssets`, `audiencePacks`, `dispatchBatches`, `effectivenessMetrics`, `inboundReviews`, and `dataRequirements`.
- Scope check: K2 48-period real-data simulation is intentionally excluded. The plan keeps only structure-level K/K2 references and does not import real user-level details.

