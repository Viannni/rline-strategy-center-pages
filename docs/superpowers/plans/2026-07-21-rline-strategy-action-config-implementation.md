# R线策略动作配置与48期本机验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only strategy configuration and K2 48 validation workspace that lets strategy users match lifecycle users to RG actions without exposing real user data publicly.

**Architecture:** Add a data-driven strategy rule catalog, a pure matching/validation engine, and one new UI module wired into the existing static ES module shell. Reuse current scoring, routing, import/export, localStorage, drawers, tables, and badge components; keep all K2 48 data browser-local and out of public seed data.

**Tech Stack:** Static HTML, ES modules, vanilla JavaScript, Node `node:test`, localStorage, GitHub Pages.

## Global Constraints

- All real 48期 details can only be imported through the front end.
- Public seed data stays simulated and must not contain real UID values.
- New code must follow the current static-site structure, localStorage state, and ES module pattern.
- Scoring and routing should reuse `core/scoring-engine.js` and `core/routing-engine.js`.
- Strategy configuration must be data-driven; do not scatter T0-T28 and M1-M12 logic across view code.
- Tests must cover rule matching, risk precedence, renewal windows, anonymous import, missing fields, and sanitized export.
- The site must not perform real message sending, CRM task creation, external calls, login, or production integration.
- Do not display real names, private chat text, phone recordings, IP ownership, teacher ownership, or other re-identifiable fields.

---

## File Structure

Create:

- `data/strategy-actions.js`: Data catalog for monthly/annual node strategies, RG01-RG08 templates, condition labels, required fields, fallback fields, and product-placement notes.
- `core/strategy-engine.js`: Pure functions that match scored/routed users against strategy rules and compute summary counts and validation metrics.
- `core/k2-privacy-import.js`: Pure functions for K2 48 row normalization, anonymous token generation, sensitive-field quarantine, missing-field reports, validation metrics, UID local lookup, and sanitized export rows.
- `views/strategy-config.js`: New strategy configuration and 48 validation view.
- `tests/strategy-engine.test.mjs`: Unit tests for rule catalog and matching precedence.
- `tests/k2-privacy-import.test.mjs`: Unit tests for local-only K2 import/privacy/export.
- `tests/strategy-config-view.test.mjs`: View-model and shell integration tests for the new module.

Modify:

- `app.js`: Add `strategy-config` nav entry and wire `views/strategy-config.js`.
- `core/import-export.js`: Add only the extra flat field mappings needed for K2 48 validation rows.
- `core/store.js`: Persist local strategy workspace state fields in existing snapshots without adding remote persistence.
- `styles.css`: Add compact dashboard/table/detail styles for the strategy configuration page.
- `README.md`: Document the private-data boundary and the new local validation workflow.

Do not modify:

- `data/seed-data.js` with any real K2 48 UID or user-level data.
- `index.html` for external scripts or network integrations.

---

### Task 1: Strategy Catalog and Matching Engine

**Files:**
- Create: `data/strategy-actions.js`
- Create: `core/strategy-engine.js`
- Create: `tests/strategy-engine.test.mjs`

**Interfaces:**
- Consumes: `scoreUser(user)` output, `routeUser(user, score)` output, current user shape.
- Produces:
  - `STRATEGY_RULES: Array<StrategyRule>`
  - `RG_TEMPLATES: Array<RgTemplate>`
  - `matchStrategyForUser(user, score, route): StrategyMatch`
  - `buildStrategyMatches(users, scores, routes): Array<StrategyMatch>`
  - `summarizeStrategyMatches(matches): StrategySummary`

`StrategyMatch` shape:

```js
{
  userId: "U1",
  productType: "monthly",
  stageCode: "T22",
  rgId: "RG06",
  actionId: "monthly-t22-h1-evidence-payment",
  actionTitle: "成果与权益接续",
  channel: "text",
  phoneEligible: true,
  ownerTeam: "sales",
  ownerSubteam: "renewal",
  touchGateStatus: "eligible",
  priority: "P1",
  lifecycleWindow: "renewal",
  blocked: false,
  blockReason: "",
  reasons: ["T22月课续费窗口", "H1/H2无风险", "F12可派"],
  writebackFields: ["F09", "F11", "F13", "F14", "F16"],
  placementStatus: "needs-adaptation",
  productNotes: {
    current: "已有入口待核对",
    system: "CRM/营销中心/订单支付",
    fallback: "先用标签名单与人工任务回写"
  }
}
```

- [ ] **Step 1: Write failing tests for RG risk precedence and renewal action matching**

Add `tests/strategy-engine.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { scoreUser } from "../core/scoring-engine.js";
import { routeUser } from "../core/routing-engine.js";
import { scenarioUser } from "../data/seed-data.js";
import {
  RG_TEMPLATES,
  STRATEGY_RULES,
  buildStrategyMatches,
  matchStrategyForUser,
  summarizeStrategyMatches
} from "../core/strategy-engine.js";

test("strategy catalog exposes RG01-RG08 and data-driven monthly/annual rules", () => {
  assert.deepEqual(RG_TEMPLATES.map((item) => item.id), ["RG01", "RG02", "RG03", "RG04", "RG05", "RG06", "RG07", "RG08"]);
  assert.ok(STRATEGY_RULES.some((rule) => rule.productType === "monthly" && rule.stageRange === "T22-T28" && rule.rgId === "RG06"));
  assert.ok(STRATEGY_RULES.some((rule) => rule.productType === "annual" && rule.stageRange === "M8-M12" && rule.rgId === "RG06"));
  assert.ok(STRATEGY_RULES.every((rule) => Array.isArray(rule.writebackFields) && rule.writebackFields.length > 0));
});

test("risk-fused users always match RG07 before renewal or H-level conversion rules", () => {
  const user = scenarioUser("high-score-risk");
  const score = scoreUser(user);
  const route = routeUser(user, score);
  const match = matchStrategyForUser(user, score, route);

  assert.equal(score.hLevel, "H4");
  assert.equal(match.rgId, "RG07");
  assert.equal(match.blocked, true);
  assert.match(match.blockReason, /风险/);
  assert.equal(match.ownerTeam, "sales");
  assert.equal(match.supportTeam, "learning");
  assert.ok(match.reasons.includes("风险优先"));
});

test("monthly T22-T28 H1 without risk matches RG06 bound renewal action", () => {
  const user = scenarioUser("high-base");
  const score = scoreUser(user);
  const route = routeUser(user, score);
  const match = matchStrategyForUser(user, score, route);

  assert.equal(match.rgId, "RG06");
  assert.equal(match.lifecycleWindow, "renewal");
  assert.equal(match.ownerTeam, "sales");
  assert.equal(match.ownerSubteam, "renewal");
  assert.equal(match.blocked, false);
  assert.ok(match.writebackFields.includes("F14"));
});

test("non-renewal template question matches RG01 or Agent service without sales binding", () => {
  const user = scenarioUser("template-question");
  const score = scoreUser(user);
  const route = routeUser(user, score);
  const match = matchStrategyForUser(user, score, route);

  assert.equal(match.ownerTeam, "agent");
  assert.equal(match.ownerSubteam, "guidance");
  assert.equal(match.channel, "text");
  assert.notEqual(match.rgId, "RG06");
});

test("strategy summary counts risk blocks, phone tasks, text tasks, and placement gaps", () => {
  const users = [scenarioUser("high-base"), scenarioUser("high-score-risk"), scenarioUser("template-question")];
  const scores = users.map(scoreUser);
  const routes = Object.fromEntries(users.map((user, index) => [user.id, routeUser(user, scores[index])]));
  const matches = buildStrategyMatches(users, scores, routes);
  const summary = summarizeStrategyMatches(matches);

  assert.equal(summary.total, 3);
  assert.equal(summary.riskBlocked, 1);
  assert.ok(summary.textActions >= 1);
  assert.ok(summary.phoneActions >= 1);
  assert.ok(summary.byRg.RG07 >= 1);
  assert.ok(summary.productGapCount >= 1);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/strategy-engine.test.mjs`

Expected: FAIL with an import error similar to `Cannot find module '../core/strategy-engine.js'`.

- [ ] **Step 3: Create the strategy catalog**

Add `data/strategy-actions.js` with this structure:

```js
export const RG_TEMPLATES = Object.freeze([
  { id: "RG01", label: "新购/未首课承接", scope: "T0-T10 / M1-M2", phoneGate: "高潜未定级、未首课、操作障碍", forbidden: "用销售代替首课问题解决" },
  { id: "RG02", label: "漏学/下滑修复", scope: "T3-T20 / M4-M5", phoneGate: "多次未动、主动求助、强阻碍", forbidden: "电话催学；对H4触发销售" },
  { id: "RG03", label: "测评/报告效果外化", scope: "T0/T7/T14/T20-T21 / M1-M12", phoneGate: "明确解读、规划需求、学习障碍", forbidden: "只报成绩、不提供下一步" },
  { id: "RG04", label: "挑战/比赛/活动", scope: "T4-T20 / M2/M7/M10", phoneGate: "获奖或权益异常解释", forbidden: "社群打卡、群通知" },
  { id: "RG05", label: "讲座/规划/1V1", scope: "T14-T16 / M1/M3/M6/M8/M11", phoneGate: "同意沟通且满足准入", forbidden: "假定固定老师持续跟进" },
  { id: "RG06", label: "续费价值与权益", scope: "T17-T28 / M8-M12", phoneGate: "强意向、领券未付、支付/决策异议", forbidden: "未绑定即全量转二销；对H4促销" },
  { id: "RG07", label: "风险修复", scope: "全周期", phoneGate: "退款、投诉、重大服务问题", forbidden: "与销售并发；未解除即回转化" },
  { id: "RG08", label: "频控与治理", scope: "全周期", phoneGate: "不直接拨打电话", forbidden: "缺少排除条件即上线" }
]);

export const STRATEGY_RULES = Object.freeze([
  {
    id: "risk-fuse-rg07",
    rgId: "RG07",
    productType: "all",
    stageRange: "all",
    title: "风险确认与修复",
    contentType: "风险确认、进展、修复、回流",
    textAction: "发送风险确认/修复进展说明，不附加支付动作",
    phoneGate: "退款、投诉、强负向、H4或重大服务问题",
    target: { anyHLevel: ["H4"], riskFirst: true },
    owner: { team: "route", subteam: "route" },
    writebackFields: ["F12", "F15", "F16"],
    placement: { current: "需要改造", system: "工单/CRM/学情沟通组", fallback: "人工风险名单冻结二销任务" }
  },
  {
    id: "monthly-t0-t10-rg01",
    rgId: "RG01",
    productType: "monthly",
    stageRange: "T0-T10",
    title: "开课与首课承接",
    contentType: "欢迎、定级、首课、周计划",
    textAction: "发送入门/首课/周计划卡片",
    phoneGate: "高潜未定级、未首课、操作障碍",
    target: { hLevels: ["H1", "H2", "H3", "L"], issueTypes: ["template-question", "learning-decline"] },
    owner: { team: "route", subteam: "route" },
    writebackFields: ["F02", "F04", "F05", "F11", "F16"],
    placement: { current: "已有入口待核对", system: "学习后台/CRM", fallback: "阶段名单+模板任务" }
  },
  {
    id: "monthly-t11-t21-rg03",
    rgId: "RG03",
    productType: "monthly",
    stageRange: "T11-T21",
    title: "月测/PK/成长报告外化",
    contentType: "周单词PK、月测、成长报告、复习直播",
    textAction: "发送趋势卡、报告卡或讲座预约卡",
    phoneGate: "明确解读/规划需求或学习障碍",
    target: { hLevels: ["H1", "H2", "H3", "L"] },
    owner: { team: "route", subteam: "route" },
    writebackFields: ["F08", "F09", "F10", "F11", "F16"],
    placement: { current: "需要改造", system: "报告服务/营销中心/CRM", fallback: "报告打开名单+人工解读任务" }
  },
  {
    id: "monthly-t22-t28-rg06",
    rgId: "RG06",
    productType: "monthly",
    stageRange: "T22-T28",
    title: "月课转年权益与支付接续",
    contentType: "路径、价值、权益、未购问因",
    textAction: "发送成果证据、权益资格或支付入口说明",
    phoneGate: "强意向、领券未付、支付/决策异议",
    target: { hLevels: ["H1", "H2"], renewalWindow: true },
    owner: { team: "sales", subteam: "renewal" },
    writebackFields: ["F09", "F11", "F13", "F14", "F16"],
    placement: { current: "需要改造", system: "CRM/营销中心/订单支付", fallback: "H1/H2名单+二销人工任务" }
  },
  {
    id: "annual-m1-m7-rg03",
    rgId: "RG03",
    productType: "annual",
    stageRange: "M1-M7",
    title: "年课学习循环与成果外化",
    contentType: "月初校准、3次周PK、月末月测、报告/直播",
    textAction: "发送校准、PK、月测、报告和讲座卡",
    phoneGate: "学习障碍、规划需求或多次无改善",
    target: { hLevels: ["H1", "H2", "H3", "L"] },
    owner: { team: "route", subteam: "route" },
    writebackFields: ["F04", "F05", "F08", "F09", "F10", "F16"],
    placement: { current: "需要改造", system: "学习后台/报告服务/CRM", fallback: "月度学习名单+人工复盘" }
  },
  {
    id: "annual-m8-m12-rg06",
    rgId: "RG06",
    productType: "annual",
    stageRange: "M8-M12",
    title: "年转年价值预热与收口",
    contentType: "价值账单、讲座、长期路径、权益、未续归因",
    textAction: "发送价值卡、讲座预约、权益卡或未续原因收集",
    phoneGate: "H1/H2明确需求、领券未付、支付/决策异议",
    target: { hLevels: ["H1", "H2"], renewalWindow: true },
    owner: { team: "sales", subteam: "renewal" },
    writebackFields: ["F09", "F11", "F13", "F14", "F16"],
    placement: { current: "需要改造", system: "CRM/营销中心/订单支付", fallback: "H1/H2名单+二销人工任务" }
  }
]);
```

- [ ] **Step 4: Implement the pure matching engine**

Create `core/strategy-engine.js`:

```js
import { RG_TEMPLATES, STRATEGY_RULES } from "../data/strategy-actions.js";
import { TASK_RULES } from "../data/rules.js";

export { RG_TEMPLATES, STRATEGY_RULES };

const H_ORDER = ["H1", "H2", "H3", "H4", "L"];

function stageNumber(stageCode) {
  return Number(String(stageCode ?? "").slice(1));
}

function inStageRange(stageCode, range) {
  if (range === "all") return true;
  const [start, end] = String(range).split("-");
  if (!end) return stageCode === start;
  return String(stageCode).at(0) === start.at(0) && stageNumber(stageCode) >= stageNumber(start) && stageNumber(stageCode) <= stageNumber(end);
}

function isRenewalWindow(user) {
  return TASK_RULES.renewalWindows[user.productType]?.includes(user.stageCode) ?? false;
}

function ruleMatches(rule, user, score, route) {
  if (rule.productType !== "all" && rule.productType !== user.productType) return false;
  if (!inStageRange(user.stageCode, rule.stageRange)) return false;
  if (rule.target?.riskFirst === true) return score.hLevel === "H4" || score.risk?.fused === true || route.salesFrozen === true;
  if (rule.target?.renewalWindow === true && !isRenewalWindow(user)) return false;
  if (rule.target?.anyHLevel && !rule.target.anyHLevel.includes(score.hLevel)) return false;
  if (rule.target?.hLevels && !rule.target.hLevels.includes(score.hLevel)) return false;
  if (rule.target?.issueTypes && user.issueType && !rule.target.issueTypes.includes(user.issueType)) return false;
  return true;
}

function chooseRule(user, score, route) {
  return STRATEGY_RULES.find((rule) => ruleMatches(rule, user, score, route))
    ?? STRATEGY_RULES.find((rule) => rule.id === (isRenewalWindow(user) ? `${user.productType === "monthly" ? "monthly-t22-t28-rg06" : "annual-m8-m12-rg06"}` : `${user.productType === "monthly" ? "monthly-t11-t21-rg03" : "annual-m1-m7-rg03"}`))
    ?? STRATEGY_RULES[0];
}

function ownerFromRule(rule, route) {
  if (rule.owner.team === "route") return { ownerTeam: route.team, ownerSubteam: route.subteam };
  return { ownerTeam: rule.owner.team, ownerSubteam: rule.owner.subteam };
}

function lifecycleWindow(user) {
  return isRenewalWindow(user) ? "renewal" : "learning";
}

function reasonList(rule, user, score, route) {
  const reasons = [];
  if (rule.rgId === "RG07") reasons.push("风险优先");
  reasons.push(`${user.stageCode}${lifecycleWindow(user) === "renewal" ? "续费窗口" : "学习窗口"}`);
  reasons.push(`${score.hLevel}层级`);
  reasons.push(`F12${route.touchGate?.status ?? "待准入校验"}`);
  return reasons;
}

export function matchStrategyForUser(user, score, route) {
  const rule = chooseRule(user, score, route);
  const owner = ownerFromRule(rule, route);
  const blocked = rule.rgId === "RG07" || route.touchGate?.status === "blocked";
  const blockReason = rule.rgId === "RG07" ? "风险未解除，冻结转化与支付动作" : route.touchGate?.status === "blocked" ? route.touchGate.reason : "";

  return {
    userId: user.id,
    productType: user.productType,
    stageCode: user.stageCode,
    rgId: rule.rgId,
    actionId: rule.id,
    actionTitle: rule.title,
    contentType: rule.contentType,
    textAction: rule.textAction,
    channel: route.channel ?? "text",
    phoneEligible: route.channel === "phone",
    ...owner,
    supportTeam: route.supportTeam ?? null,
    supportSubteam: route.supportSubteam ?? null,
    touchGateStatus: route.touchGate?.status ?? "pending",
    priority: route.priority ?? "P2",
    lifecycleWindow: lifecycleWindow(user),
    blocked,
    blockReason,
    reasons: reasonList(rule, user, score, route),
    writebackFields: [...rule.writebackFields],
    placementStatus: rule.placement.current,
    productNotes: { ...rule.placement },
    hLevel: score.hLevel,
    hOrder: H_ORDER.indexOf(score.hLevel)
  };
}

export function buildStrategyMatches(users, scores, routes) {
  const scoreById = new Map(scores.map((score) => [score.userId, score]));
  return users.map((user) => matchStrategyForUser(user, scoreById.get(user.id), routes[user.id]));
}

export function summarizeStrategyMatches(matches) {
  return {
    total: matches.length,
    riskBlocked: matches.filter((match) => match.rgId === "RG07").length,
    textActions: matches.filter((match) => match.channel === "text").length,
    phoneActions: matches.filter((match) => match.channel === "phone").length,
    productGapCount: matches.filter((match) => !["已确认可复用", "confirmed-reusable"].includes(match.placementStatus)).length,
    byRg: Object.fromEntries(RG_TEMPLATES.map((template) => [template.id, matches.filter((match) => match.rgId === template.id).length]))
  };
}
```

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- tests/strategy-engine.test.mjs`

Expected: PASS for all strategy engine tests.

Run: `npm test`

Expected: PASS for existing suite plus new strategy tests.

- [ ] **Step 6: Commit Task 1**

```bash
git add data/strategy-actions.js core/strategy-engine.js tests/strategy-engine.test.mjs
git commit -m "feat: add strategy matching engine"
```

---

### Task 2: K2 48 Local Privacy Import and Validation Metrics

**Files:**
- Create: `core/k2-privacy-import.js`
- Create: `tests/k2-privacy-import.test.mjs`
- Modify: `core/import-export.js`

**Interfaces:**
- Consumes: raw CSV/JSON rows parsed by `parseImport`, current normalized user shape.
- Produces:
  - `normalizeK248Rows(rows): K248ImportResult`
  - `createAnonymousToken(index): string`
  - `findAnonymousByUid(importResult, uid): K248AnonymousUser | null`
  - `buildValidationMetrics(matches, renewalResults): ValidationMetrics`
  - `sanitizeK248ExportRows(validationRows): Array<Record<string, string | number | boolean>>`

- [ ] **Step 1: Write failing privacy import tests**

Add `tests/k2-privacy-import.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { scoreUsers } from "../core/scoring-engine.js";
import { routeUser } from "../core/routing-engine.js";
import { buildStrategyMatches } from "../core/strategy-engine.js";
import {
  buildValidationMetrics,
  findAnonymousByUid,
  normalizeK248Rows,
  sanitizeK248ExportRows
} from "../core/k2-privacy-import.js";

test("K2 48 import creates anonymous users, quarantines sensitive fields, and maps to annual M12", () => {
  const result = normalizeK248Rows([
    {
      uid: "real-uid-001",
      name: "Sensitive Name",
      private_chat: "do not show",
      ip_owner: "teacher-a",
      completion_rate: "92",
      active_days_7d: "7",
      renewed_flag: "1",
      transaction_status: "pending-payment",
      marketing_events: "appointment|coupon-click"
    }
  ]);

  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].id, "K2-48-U0001");
  assert.equal(result.users[0].productType, "annual");
  assert.equal(result.users[0].stageCode, "M12");
  assert.equal(result.identityMap["real-uid-001"], "K2-48-U0001");
  assert.deepEqual(result.quarantinedFields, ["ip_owner", "name", "private_chat"]);
  assert.equal(result.renewalResults["K2-48-U0001"], true);
  assert.equal(result.users[0].marketing.events.includes("appointment"), true);
});

test("K2 48 import reports missing required UID and missing scoring fields", () => {
  const result = normalizeK248Rows([{ completion_rate: "80", renewed_flag: "0" }]);

  assert.equal(result.users.length, 0);
  assert.equal(result.errors[0].code, "MISSING_UID");
  assert.ok(result.fieldGaps.some((gap) => gap.field === "active_days_7d"));
});

test("local UID lookup returns anonymous user only through the in-memory map", () => {
  const result = normalizeK248Rows([{ uid: "real-uid-002", renewed_flag: "0", completion_rate: "50", active_days_7d: "3" }]);
  const found = findAnonymousByUid(result, "real-uid-002");

  assert.equal(found.id, "K2-48-U0001");
  assert.equal(findAnonymousByUid(result, "unknown"), null);
});

test("validation metrics compute precision, recall, renewal rates, and misclassification examples", () => {
  const importResult = normalizeK248Rows([
    { uid: "r1", renewed_flag: "1", completion_rate: "95", active_days_7d: "7", parent_replied: "1", report_opened: "1" },
    { uid: "r2", renewed_flag: "0", completion_rate: "20", active_days_7d: "0", risk_status: "complaint" },
    { uid: "r3", renewed_flag: "1", completion_rate: "35", active_days_7d: "2", report_opened: "0" }
  ]);
  const scores = scoreUsers(importResult.users);
  const routes = Object.fromEntries(importResult.users.map((user, index) => [user.id, routeUser(user, scores[index])]));
  const matches = buildStrategyMatches(importResult.users, scores, routes);
  const metrics = buildValidationMetrics(matches, importResult.renewalResults);

  assert.equal(metrics.totalWithResult, 3);
  assert.ok(metrics.highPriorityRecall >= 0);
  assert.ok(metrics.highPriorityPrecision >= 0);
  assert.ok(metrics.byHLevel.H4.total >= 1);
  assert.ok(metrics.examples.length > 0);
});

test("sanitized export never includes raw uid, name, private chat, or ownership fields", () => {
  const rows = sanitizeK248ExportRows([
    { anonymousId: "K2-48-U0001", uid: "real", name: "n", private_chat: "chat", ip_owner: "ip", hLevel: "H1", renewed: true }
  ]);

  assert.deepEqual(Object.keys(rows[0]).sort(), ["H层级", "匿名ID", "是否续费"].sort());
  assert.equal(JSON.stringify(rows).includes("real"), false);
  assert.equal(JSON.stringify(rows).includes("chat"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/k2-privacy-import.test.mjs`

Expected: FAIL with `Cannot find module '../core/k2-privacy-import.js'`.

- [ ] **Step 3: Add flat import mappings for K2 aliases**

Modify `core/import-export.js` by adding these aliases to `FLAT_FIELDS`, `NUMERIC_FIELDS`, and enum normalization where needed:

```js
// In FLAT_FIELDS
missed_days: ["learning", "consecutiveMissedDays"],
risk_status: ["risk", "type"],
followup_result: ["taskFeedback", "finalResult"],
touch_status: ["touch", "status"],

// In NUMERIC_FIELDS
["missed_days", 0, 365],
```

Expected behavior: the generic importer remains compatible with R-line rows and can accept K2 alias columns after privacy normalization.

- [ ] **Step 4: Implement K2 privacy importer**

Create `core/k2-privacy-import.js`:

```js
const SENSITIVE_PATTERNS = [/name/i, /姓名/, /private.*chat/i, /私聊/, /phone/i, /手机号/, /ip.*owner/i, /归属/, /teacher/i, /老师/];
const REQUIRED_SCORE_FIELDS = ["completion_rate", "active_days_7d"];

export function createAnonymousToken(index) {
  return `K2-48-U${String(index + 1).padStart(4, "0")}`;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function booleanFlag(value) {
  if (value === true || value === 1) return true;
  return ["1", "true", "yes", "y", "续费", "已续费"].includes(String(value ?? "").trim().toLowerCase());
}

function marketingEvents(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "").split(/[|,，、]/).map((item) => item.trim()).filter(Boolean);
}

function riskFrom(value) {
  const text = String(value ?? "");
  if (!text) return {};
  const fused = /refund|complaint|退款|投诉|强负向/i.test(text);
  return { type: text, fuse: fused, salesFrozen: fused, deduction: fused ? 20 : 0 };
}

function userFromRow(row, anonymousId) {
  return {
    id: anonymousId,
    childId: anonymousId,
    productType: "annual",
    stageCode: "M12",
    issueType: row.issue_type || undefined,
    learning: {
      completionRate: Number(row.completion_rate ?? 0),
      activeDays7: Number(row.active_days_7d ?? 0),
      consecutiveMissedDays: Number(row.missed_days ?? 0),
      negativeFeedback: /negative|负向/i.test(String(row.followup_result ?? ""))
    },
    assessment: hasValue(row.assessment_score) ? { status: "completed", score: Number(row.assessment_score) } : { status: "not-applicable" },
    report: { status: booleanFlag(row.report_opened) ? "opened" : "generated", opened: booleanFlag(row.report_opened) },
    activity: { source: "IN_APP", participated: booleanFlag(row.activity_participated) },
    parent: { replyStatus: booleanFlag(row.parent_replied) ? "replied" : "unreached", reachable: hasValue(row.parent_replied) ? booleanFlag(row.parent_replied) : true },
    touch: row.touch_status ? { status: row.touch_status } : {},
    marketing: { exposureEligible: true, events: marketingEvents(row.marketing_events) },
    transaction: { status: row.transaction_status || "none", unpaid: row.transaction_status === "pending-payment" || row.transaction_status === "unpaid" },
    risk: riskFrom(row.risk_status),
    taskFeedback: row.followup_result ? { finalResult: row.followup_result } : {}
  };
}

export function normalizeK248Rows(rows) {
  const users = [];
  const identityMap = {};
  const renewalResults = {};
  const errors = [];
  const quarantined = new Set();
  const fieldGaps = [];

  for (const field of REQUIRED_SCORE_FIELDS) {
    if ((rows ?? []).some((row) => !hasValue(row?.[field]))) {
      fieldGaps.push({ field, impact: "影响学习健康和H层级判断", fallback: "用聚合均值只能做演示，不参与精度验证" });
    }
  }

  (rows ?? []).forEach((row, index) => {
    Object.keys(row ?? {}).forEach((key) => {
      if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) quarantined.add(key);
    });
    if (!hasValue(row?.uid)) {
      errors.push({ row: index + 1, field: "uid", code: "MISSING_UID", message: "缺少48期用户UID，无法建立本机匿名映射" });
      return;
    }
    const anonymousId = createAnonymousToken(users.length);
    identityMap[String(row.uid)] = anonymousId;
    users.push(userFromRow(row, anonymousId));
    if (hasValue(row.renewed_flag)) renewalResults[anonymousId] = booleanFlag(row.renewed_flag);
  });

  return { users, identityMap, renewalResults, errors, fieldGaps, quarantinedFields: [...quarantined].sort() };
}

export function findAnonymousByUid(importResult, uid) {
  const id = importResult.identityMap?.[String(uid ?? "")];
  return id ? importResult.users.find((user) => user.id === id) ?? null : null;
}

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
}

export function buildValidationMetrics(matches, renewalResults) {
  const withResult = matches.filter((match) => Object.hasOwn(renewalResults, match.userId));
  const renewed = withResult.filter((match) => renewalResults[match.userId] === true);
  const high = withResult.filter((match) => ["H1", "H2"].includes(match.hLevel));
  const highRenewed = high.filter((match) => renewalResults[match.userId] === true);
  const byHLevel = Object.fromEntries(["H1", "H2", "H3", "H4", "L"].map((level) => {
    const rows = withResult.filter((match) => match.hLevel === level);
    return [level, { total: rows.length, renewed: rows.filter((match) => renewalResults[match.userId] === true).length, renewalRate: rate(rows.filter((match) => renewalResults[match.userId] === true).length, rows.length) }];
  }));
  const examples = withResult
    .filter((match) => (["H1", "H2"].includes(match.hLevel) && renewalResults[match.userId] === false) || (!["H1", "H2"].includes(match.hLevel) && renewalResults[match.userId] === true))
    .slice(0, 8)
    .map((match) => ({ anonymousId: match.userId, hLevel: match.hLevel, rgId: match.rgId, renewed: renewalResults[match.userId] }));

  return {
    totalWithResult: withResult.length,
    highPriorityPrecision: rate(highRenewed.length, high.length),
    highPriorityRecall: rate(highRenewed.length, renewed.length),
    byHLevel,
    examples
  };
}

export function sanitizeK248ExportRows(rows) {
  return (rows ?? []).map((row) => ({
    "匿名ID": row.anonymousId ?? row.userId ?? row.id,
    "H层级": row.hLevel ?? "",
    "是否续费": row.renewed ?? ""
  }));
}
```

- [ ] **Step 5: Run privacy tests and full import tests**

Run: `npm test -- tests/k2-privacy-import.test.mjs tests/import-export.test.mjs`

Expected: PASS for K2 privacy and existing import tests.

Run: `npm test`

Expected: PASS for full suite.

- [ ] **Step 6: Commit Task 2**

```bash
git add core/k2-privacy-import.js core/import-export.js tests/k2-privacy-import.test.mjs
git commit -m "feat: add local K2 48 validation import"
```

---

### Task 3: Store State and Strategy Config View Models

**Files:**
- Create: `views/strategy-config.js`
- Create: `tests/strategy-config-view.test.mjs`
- Modify: `core/store.js`

**Interfaces:**
- Consumes:
  - `buildStrategyMatches(users, scores, routes)`
  - `summarizeStrategyMatches(matches)`
  - `normalizeK248Rows(rows)`
  - `buildValidationMetrics(matches, renewalResults)`
- Produces:
  - `buildStrategyConfigModel(state): StrategyConfigModel`
  - `applyK248ValidationImport(state, rawRows): K248Workspace`
  - `strategyExportCsvRows(model): Array<Record<string, unknown>>`

- [ ] **Step 1: Write failing view-model tests**

Create `tests/strategy-config-view.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createStore } from "../core/store.js";
import { SEED_STATE } from "../data/seed-data.js";
import {
  applyK248ValidationImport,
  buildStrategyConfigModel,
  strategyExportCsvRows
} from "../views/strategy-config.js";

test("strategy config model summarizes rule matches and node sections from current state", () => {
  const store = createStore(SEED_STATE, null);
  const model = buildStrategyConfigModel(store.getState());

  assert.ok(model.summary.total > 0);
  assert.ok(model.nodeSections.monthly.length >= 3);
  assert.ok(model.nodeSections.annual.length >= 2);
  assert.ok(model.rgTemplates.length === 8);
  assert.ok(model.matches.every((match) => match.userId && match.rgId && match.actionTitle));
});

test("K2 validation workspace imports local rows without writing raw UID into public rows", () => {
  const store = createStore(SEED_STATE, null);
  const workspace = applyK248ValidationImport(store.getState(), [
    { uid: "raw-uid-1", renewed_flag: "1", completion_rate: "90", active_days_7d: "7", name: "hidden" }
  ]);

  assert.equal(workspace.importResult.users[0].id, "K2-48-U0001");
  assert.equal(JSON.stringify(workspace.visibleRows).includes("raw-uid-1"), false);
  assert.equal(workspace.validation.totalWithResult, 1);
  assert.deepEqual(workspace.importResult.quarantinedFields, ["name"]);
});

test("strategy export rows contain anonymous IDs and strategy fields only", () => {
  const model = buildStrategyConfigModel(createStore(SEED_STATE, null).getState());
  const rows = strategyExportCsvRows(model);

  assert.ok(rows.length > 0);
  assert.ok(Object.keys(rows[0]).includes("匿名ID"));
  assert.ok(Object.keys(rows[0]).includes("策略组"));
  assert.equal(Object.keys(rows[0]).includes("uid"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/strategy-config-view.test.mjs`

Expected: FAIL with `Cannot find module '../views/strategy-config.js'`.

- [ ] **Step 3: Add store fields for local validation workspace**

Modify `core/store.js` so snapshots preserve these optional fields without derivation errors:

```js
// In derive(...) returned state:
strategyWorkspace: clone(base.strategyWorkspace ?? {
  activeDataset: "seed",
  k248: null
}),
```

And include `strategyWorkspace` in the snapshot base by leaving it in `base`; do not place it in `history` recursively.

- [ ] **Step 4: Implement view-model exports**

Create the top of `views/strategy-config.js`:

```js
import { buildStrategyMatches, summarizeStrategyMatches, RG_TEMPLATES, STRATEGY_RULES } from "../core/strategy-engine.js";
import { normalizeK248Rows, buildValidationMetrics } from "../core/k2-privacy-import.js";
import { scoreUsers } from "../core/scoring-engine.js";
import { routeUser } from "../core/routing-engine.js";
import { serializeCsv } from "../core/import-export.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderTable, toast } from "../ui/components.js";

export function buildStrategyConfigModel(state) {
  const matches = buildStrategyMatches(state.users ?? [], state.scores ?? [], state.routes ?? {});
  return {
    summary: summarizeStrategyMatches(matches),
    matches,
    rgTemplates: RG_TEMPLATES,
    rules: STRATEGY_RULES,
    nodeSections: {
      monthly: [
        { range: "T0-T10", label: "启动与首课", ruleIds: ["monthly-t0-t10-rg01"] },
        { range: "T11-T21", label: "成果外化", ruleIds: ["monthly-t11-t21-rg03"] },
        { range: "T22-T28", label: "月转年", ruleIds: ["monthly-t22-t28-rg06"] }
      ],
      annual: [
        { range: "M1-M7", label: "学习循环", ruleIds: ["annual-m1-m7-rg03"] },
        { range: "M8-M12", label: "年转年", ruleIds: ["annual-m8-m12-rg06"] }
      ]
    },
    workspace: state.strategyWorkspace ?? { activeDataset: "seed", k248: null }
  };
}

export function applyK248ValidationImport(state, rawRows) {
  const importResult = normalizeK248Rows(rawRows);
  const scores = scoreUsers(importResult.users);
  const routes = Object.fromEntries(importResult.users.map((user, index) => [user.id, routeUser(user, scores[index])]));
  const matches = buildStrategyMatches(importResult.users, scores, routes);
  return {
    importResult,
    scores,
    routes,
    matches,
    visibleRows: matches.map((match) => ({
      anonymousId: match.userId,
      productType: match.productType,
      stageCode: match.stageCode,
      hLevel: match.hLevel,
      rgId: match.rgId,
      actionTitle: match.actionTitle,
      owner: `${match.ownerTeam}/${match.ownerSubteam}`,
      renewed: importResult.renewalResults[match.userId] ?? "结果缺失",
      missing: importResult.fieldGaps.map((gap) => gap.field).join(" / ") || "无"
    })),
    validation: buildValidationMetrics(matches, importResult.renewalResults),
    state
  };
}

export function strategyExportCsvRows(model) {
  return model.matches.map((match) => ({
    "匿名ID": match.userId,
    "产品": match.productType,
    "阶段": match.stageCode,
    "H层级": match.hLevel,
    "策略组": match.rgId,
    "策略动作": match.actionTitle,
    "渠道": match.channel,
    "主责": `${match.ownerTeam}/${match.ownerSubteam}`,
    "F12": match.touchGateStatus,
    "拦截": match.blocked ? match.blockReason : "否"
  }));
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/strategy-config-view.test.mjs`

Expected: PASS for view-model tests.

- [ ] **Step 6: Commit Task 3**

```bash
git add views/strategy-config.js core/store.js tests/strategy-config-view.test.mjs
git commit -m "feat: add strategy config view models"
```

---

### Task 4: Strategy Config UI and Navigation

**Files:**
- Modify: `app.js`
- Modify: `views/strategy-config.js`
- Modify: `styles.css`
- Modify: `tests/ui-shell.test.mjs`
- Modify: `tests/strategy-config-view.test.mjs`

**Interfaces:**
- Consumes: `buildStrategyConfigModel`, `applyK248ValidationImport`, `strategyExportCsvRows`.
- Produces: `render(container, context)` for the new nav view.

- [ ] **Step 1: Write failing shell and render tests**

Modify `tests/ui-shell.test.mjs` expected nav labels:

```js
assert.deepEqual(NAV_ITEMS.map(({ label }) => label), [
  "总控台",
  "用户中心",
  "评分中心",
  "策略配置",
  "进线中心",
  "角色任务台",
  "生命周期",
  "提分运营",
  "数据底座",
  "系统落位",
  "效果复盘",
  "提需清单"
]);
```

Append to `tests/strategy-config-view.test.mjs`:

```js
test("strategy config render exposes node config, people rules, and K2 validation sections", async () => {
  const store = createStore(SEED_STATE, null);
  const container = {
    listeners: {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    set innerHTML(value) { this.html = value; },
    get innerHTML() { return this.html; }
  };

  const { render } = await import("../views/strategy-config.js");
  render(container, { state: store.getState(), store, components: {} });

  assert.match(container.innerHTML, /策略配置/);
  assert.match(container.innerHTML, /节点策略配置/);
  assert.match(container.innerHTML, /人群规则构建/);
  assert.match(container.innerHTML, /48期验证/);
  assert.match(container.innerHTML, /RG01/);
  assert.match(container.innerHTML, /RG08/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/ui-shell.test.mjs tests/strategy-config-view.test.mjs`

Expected: FAIL because nav does not include `策略配置` and `render` is not complete.

- [ ] **Step 3: Add nav and view module wiring**

Modify `app.js`:

```js
import * as strategyConfigView from "./views/strategy-config.js";
```

Add nav item after scoring:

```js
{ id: "strategy-config", label: "策略配置", icon: "sliders-horizontal", roles: ["strategy"], stage: "tier", description: "按人群、节点和RG策略组模拟策略动作" },
```

Add to `viewModules`:

```js
["strategy-config", strategyConfigView],
```

- [ ] **Step 4: Implement the rendered page**

Add the render helpers in `views/strategy-config.js`:

```js
function summaryCards(summary) {
  const cards = [
    ["命中用户", summary.total],
    ["风险拦截", summary.riskBlocked],
    ["文字动作", summary.textActions],
    ["电话任务", summary.phoneActions],
    ["待产研核对", summary.productGapCount]
  ];
  return `<section class="metric-grid">${cards.map(([label, value]) => `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}</section>`;
}

function nodeSections(model) {
  return `<section class="operation-band"><header><div><h2>节点策略配置</h2><p>按月课T0-T28、年课M1-M12把人群、动作、电话准入和回写放到同一张配置面。</p></div></header><div class="strategy-node-grid">${[...model.nodeSections.monthly, ...model.nodeSections.annual].map((section) => `<button type="button" class="operation-item" data-strategy-node="${escapeAttribute(section.range)}"><strong>${escapeHtml(section.range)}</strong><small>${escapeHtml(section.label)}</small><em>${escapeHtml(section.ruleIds.join(" / "))}</em></button>`).join("")}</div></section>`;
}

function rgSection(model) {
  return `<section class="operation-band"><header><div><h2>RG策略组模板</h2><p>风险优先，学习与续费分流，所有策略都必须有排除条件和回写字段。</p></div></header><div class="operation-grid">${model.rgTemplates.map((template) => `<button type="button" class="operation-item" data-rg-template="${escapeAttribute(template.id)}"><strong>${escapeHtml(template.id)}</strong><small>${escapeHtml(template.label)}</small><em>${escapeHtml(template.scope)}</em></button>`).join("")}</div></section>`;
}

function peopleRules(model) {
  return `<section class="reference-notice"><strong>人群规则构建</strong><span>可组合 F02生命周期、F04-F11行为、F12准入、F13/F14独立信号、F15风险和H层级；当前为本机模拟，不写入生产系统。</span></section>${renderTable({
    caption: "策略命中样例",
    columns: [
      { key: "userId", label: "匿名ID" },
      { key: "stageCode", label: "节点" },
      { key: "hLevel", label: "H层" },
      { key: "rgId", label: "策略组" },
      { key: "actionTitle", label: "动作" },
      { key: "owner", label: "主责" },
      { key: "touchGateStatus", label: "F12" }
    ],
    rows: model.matches.slice(0, 12).map((match) => ({ ...match, owner: `${match.ownerTeam}/${match.ownerSubteam}` }))
  })}`;
}

function validationSection() {
  return `<section class="operation-band"><header><div><h2>48期验证</h2><p>仅本机导入、匿名展示、浏览器内UID查询；真实明细不进入公开页面。</p></div>${renderBadge("warning", "本机私密")}</header><div class="reference-notice"><strong>导入边界</strong><span>公开站点只提供功能壳。导入文件中的姓名、私聊、IP归属、老师归属字段会被隔离，不参与展示和导出。</span></div></section>`;
}

export function render(container, context) {
  const model = buildStrategyConfigModel(context.state);
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略动作配置</p><h1>策略配置</h1><p>把全周期节点、人群条件、RG策略组、文字/电话动作和三类角色承接配置在同一张面板里。</p></div>${renderBadge("info", "本机模拟")}</section>${summaryCards(model.summary)}${nodeSections(model)}${rgSection(model)}${peopleRules(model)}${validationSection()}`;
}
```

- [ ] **Step 5: Add compact CSS**

Append to `styles.css`:

```css
.strategy-node-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.strategy-node-grid .operation-item {
  min-height: 116px;
}
```

- [ ] **Step 6: Run UI tests and full test suite**

Run: `npm test -- tests/ui-shell.test.mjs tests/strategy-config-view.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add app.js views/strategy-config.js styles.css tests/ui-shell.test.mjs tests/strategy-config-view.test.mjs
git commit -m "feat: add strategy config workspace"
```

---

### Task 5: K2 Validation Controls, Export, Documentation, and Browser Verification

**Files:**
- Modify: `views/strategy-config.js`
- Modify: `README.md`
- Modify: `tests/strategy-config-view.test.mjs`
- Test artifacts: `output/playwright/rline-strategy-config-desktop.png`, `output/playwright/rline-strategy-config-mobile.png`

**Interfaces:**
- Consumes: `parseImport`, `applyK248ValidationImport`, `sanitizeK248ExportRows`, `downloadFile`, `toast`.
- Produces: Import textarea/file workflow, validation summary rendering, sanitized export button, README privacy section.

- [ ] **Step 1: Write failing interaction tests for import/export markup**

Append to `tests/strategy-config-view.test.mjs`:

```js
test("strategy config page includes local K2 import controls and sanitized export affordance", async () => {
  const store = createStore(SEED_STATE, null);
  const container = {
    querySelectorAll() { return []; },
    querySelector() { return null; },
    set innerHTML(value) { this.html = value; },
    get innerHTML() { return this.html; }
  };

  const { render } = await import("../views/strategy-config.js");
  render(container, {
    state: store.getState(),
    store,
    components: { toast() {}, downloadFile() {} }
  });

  assert.match(container.innerHTML, /id="k248ImportText"/);
  assert.match(container.innerHTML, /id="k248ImportType"/);
  assert.match(container.innerHTML, /id="runK248ImportButton"/);
  assert.match(container.innerHTML, /id="exportStrategyValidationButton"/);
  assert.match(container.innerHTML, /不上传GitHub/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/strategy-config-view.test.mjs`

Expected: FAIL because K2 import controls are not rendered yet.

- [ ] **Step 3: Add local import controls and handlers**

Modify `views/strategy-config.js` imports:

```js
import { parseImport, serializeCsv } from "../core/import-export.js";
import { sanitizeK248ExportRows } from "../core/k2-privacy-import.js";
```

Add render section:

```js
function validationSection(model) {
  const saved = model.workspace?.k248;
  const savedSummary = saved ? `<div class="reference-notice"><strong>当前本机验证</strong><span>${escapeHtml(saved.visibleRows.length)}名匿名用户；精度${escapeHtml(saved.validation.highPriorityPrecision ?? 0)}，召回${escapeHtml(saved.validation.highPriorityRecall ?? 0)}</span></div>` : "";
  return `<section class="operation-band"><header><div><h2>48期验证</h2><p>仅本机导入、匿名展示、浏览器内UID查询；真实明细不进入公开页面。</p></div>${renderBadge("warning", "本机私密")}</header><div class="import-panel"><label for="k248ImportType">格式</label><select id="k248ImportType"><option value="csv">CSV</option><option value="json">JSON</option></select><label for="k248ImportText">48期逐用户明细</label><textarea id="k248ImportText" rows="8" spellcheck="false">uid,renewed_flag,completion_rate,active_days_7d</textarea><div class="form-actions"><button id="runK248ImportButton" type="button" class="primary-button">本机模拟导入</button><button id="exportStrategyValidationButton" type="button" class="secondary-button">导出匿名验证结果</button></div><p class="form-hint">只写入当前浏览器 localStorage，不上传GitHub；姓名、私聊、IP归属、老师归属字段默认隔离。</p></div>${savedSummary}</section>`;
}
```

Wire handlers after `container.innerHTML = ...`:

```js
const importButton = container.querySelector("#runK248ImportButton");
importButton?.addEventListener("click", () => {
  try {
    const type = container.querySelector("#k248ImportType")?.value ?? "csv";
    const text = container.querySelector("#k248ImportText")?.value ?? "";
    const rows = parseImport(text, type);
    const workspace = applyK248ValidationImport(context.state, rows);
    context.store.update((state) => ({ ...state, strategyWorkspace: { activeDataset: "k248", k248: workspace } }));
    toast(`已在本机导入${workspace.importResult.users.length}名48期匿名用户。`, "success");
  } catch (error) {
    toast(`导入失败：${error.message}`, "danger");
  }
});

container.querySelector("#exportStrategyValidationButton")?.addEventListener("click", () => {
  const workspace = context.store.getState().strategyWorkspace?.k248;
  const rows = workspace ? sanitizeK248ExportRows(workspace.visibleRows.map((row) => ({ anonymousId: row.anonymousId, hLevel: row.hLevel, renewed: row.renewed }))) : strategyExportCsvRows(buildStrategyConfigModel(context.store.getState()));
  downloadFile({ filename: "rline-strategy-validation-anonymous.csv", type: "text/csv;charset=utf-8", content: serializeCsv(rows) });
  toast("已导出匿名验证结果。", "success");
});
```

Use `context.store.update` exactly as shown above; `core/store.js` already exposes this mutation helper and records history snapshots.

- [ ] **Step 4: Update README privacy workflow**

Add a section to `README.md`:

```md
## 48期本机验证

策略配置页支持导入K2 48期逐用户明细进行本机验证。导入内容只保存在当前浏览器 localStorage，不会写入仓库、seed-data 或 GitHub Pages。页面默认使用 `K2-48-U0001` 形式的匿名令牌展示用户，导出结果只包含匿名ID、H层级、策略组、动作和续费验证字段。

不要把真实姓名、手机号、私聊内容、IP归属、老师归属或UID映射表提交到仓库。公开站点只提供功能壳和模拟数据。
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/strategy-config-view.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Start local server and capture Playwright verification**

Run: `npm run serve`

Expected: server available on `http://localhost:4173/`.

In another command, use Playwright or the existing project verification approach to open:

```text
http://localhost:4173/#strategy-config
```

Check:

- Desktop viewport shows strategy summary, node strategy, RG templates, people rules, and 48 validation sections.
- Mobile viewport does not overlap text or hide import controls.
- Browser console has 0 errors and 0 warnings.

Save screenshots:

```text
output/playwright/rline-strategy-config-desktop.png
output/playwright/rline-strategy-config-mobile.png
```

- [ ] **Step 7: Commit Task 5**

```bash
git add views/strategy-config.js README.md tests/strategy-config-view.test.mjs output/playwright/rline-strategy-config-desktop.png output/playwright/rline-strategy-config-mobile.png
git commit -m "feat: add local strategy validation workflow"
```

---

## Final Verification

- [ ] Run `npm test`; expected all tests pass.
- [ ] Run `git diff --check`; expected no whitespace errors.
- [ ] Run `git status --short`; expected only intentional files before commit, clean after commit.
- [ ] Confirm `data/seed-data.js` contains no real UID or K2 48 user-level data.
- [ ] Confirm `README.md` states the local-only privacy boundary.
- [ ] Confirm the browser verification screenshots render the new page on desktop and mobile.
- [ ] If deploying to GitHub Pages, push only code and simulated/public-safe assets; do not push imported 48期明细 or UID mapping.
