# R线策略中台后台 V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 GitHub Pages 原型升级为基于公司现有后台能力的高保真策略工作台，完整演示用户导入、最新版计分、H层级、触达准入、三类角色派单、任务回写、重新计算及产研系统落位。

**Architecture:** 保留无构建静态站点，用浏览器原生 ES Modules 拆分规则、评分、路由、状态、导入导出、视图与系统能力映射。业务计算保持纯函数并用 Node 内置测试锁定；UI只消费计算结果。正式系统落位通过独立能力矩阵和每个详情页的“产研落位”面板呈现，不把新建独立后台作为P0前提。

**Tech Stack:** HTML5、CSS3、原生 JavaScript ES Modules、Node.js `node:test`、浏览器 `localStorage`、本地静态服务器、Playwright CLI、GitHub Pages。

## Global Constraints

- 业务事实源是钉钉文档 `dQPGYqjpJYgoM27OcBp667plWakx1Z5N` 的线上最新版。
- 基础高优分只包含学习健康、课程体验、成果外化、家长互动、用户适配；F13/F14独立输出，F12只做触达准入。
- F07缺失时课程体验维度不参与分母；报告生成不加分；外部活动 `MANUAL` 不与端内活动自动数据混算。
- 风险熔断优先于分数、营销、交易和销售任务。
- 每项能力必须展示“已确认可复用、已有入口待核对、需要改造、必须新增、可降级”状态。
- 角色切换只模拟工作视图，不声明真实安全权限。
- 导入数据只存当前浏览器，页面明确提醒不上传真实敏感用户数据。
- 不增加构建步骤；站点根目录保持 GitHub Pages 可直接发布。
- 桌面端优先，同时保证手机端查看、任务回写和关键下钻可用。
- 所有代码提交保持小步、可测试、可回滚。

---

## File Map

```text
package.json                         Node测试与本地预览脚本
index.html                           语义化应用外壳、弹窗和抽屉容器
styles.css                           全局tokens、布局、组件和响应式样式
app.js                               应用启动、导航、角色切换和全局事件
data/rules.js                        最新评分、H层级、任务和刷新规则
data/seed-data.js                    24名以上模拟用户、任务、活动和需求
data/system-capabilities.js          公司现有后台能力、路径、状态和降级方案
core/scoring-engine.js               纯函数评分、独立信号、风险和H层级
core/routing-engine.js               F12准入、团队/小组/渠道/SLA路由
core/import-export.js                CSV/JSON解析、验证、合并和序列化
core/store.js                        本地状态、持久化、撤销、重算和订阅
core/selectors.js                    用户池、任务、角色和看板聚合选择器
ui/components.js                     标签、表格、抽屉、空状态和落位面板
ui/icons.js                          Lucide风格统一图标封装和可访问名称
views/dashboard.js                   总控台
views/users.js                       用户池、详情、行为模拟与逐项计分
views/scoring.js                     评分规则、独立信号和试算
views/intake.js                      进线与路由轨迹
views/tasks.js                       角色任务台和结构化回写
views/lifecycle.js                   月课/年课节点
views/operations.js                  提分活动和奖学金
views/data-foundation.js             F01-F16字段底座
views/system-map.js                  公司系统落位、复用/改造/新增矩阵
views/review.js                      H迁移、任务、活动、误判漏判复盘
views/demands.js                     跨部门提需清单
tests/contracts.test.mjs             规则、模拟数据和系统映射契约
tests/scoring-engine.test.mjs        评分和H层级测试
tests/routing-engine.test.mjs        路由与准入测试
tests/import-export.test.mjs         CSV/JSON与校验测试
```

---

### Task 1: 建立规则、数据契约与测试入口

**Files:**
- Create: `package.json`
- Create: `data/rules.js`
- Create: `data/system-capabilities.js`
- Create: `data/seed-data.js`
- Create: `tests/contracts.test.mjs`

**Interfaces:**
- Produces: `SCORING_RULES`, `H_LEVEL_RULES`, `TASK_RULES`, `FIELD_DEFINITIONS`, `SYSTEM_CAPABILITIES`, `FEATURE_PLACEMENTS`, `SEED_STATE`、`scenarioUser(id)`。
- Consumes: 无。

- [ ] **Step 1: 写规则和能力映射的失败契约测试**

```js
// tests/contracts.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_DEFINITIONS, SCORING_RULES } from "../data/rules.js";
import { SYSTEM_CAPABILITIES } from "../data/system-capabilities.js";
import { SEED_STATE } from "../data/seed-data.js";

test("latest model keeps F13/F14 independent and F12 outside base score", () => {
  assert.equal(FIELD_DEFINITIONS.length, 16);
  assert.equal(FIELD_DEFINITIONS.find((f) => f.id === "F07").name, "课程评价分");
  assert.equal(FIELD_DEFINITIONS.find((f) => f.id === "F12").scoreRole, "gate");
  assert.equal(FIELD_DEFINITIONS.find((f) => f.id === "F13").scoreRole, "independent");
  assert.deepEqual(SCORING_RULES.baseDimensions.map((d) => d.id), [
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
  assert.deepEqual(new Set(SEED_STATE.users.map((u) => u.productType)), new Set(["monthly", "annual"]));
  assert.ok(SEED_STATE.users.some((u) => u.risk?.fuse));
});
```

- [ ] **Step 2: 运行测试确认因模块不存在而失败**

Run: `node --test tests/contracts.test.mjs`

Expected: FAIL，错误包含 `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 创建测试脚本和最新版规则常量**

```json
{
  "name": "rline-strategy-center-pages",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "serve": "python3 -m http.server 4173"
  }
}
```

```js
// data/rules.js（核心形态）
export const SCORING_RULES = {
  version: "online-2026-07-20",
  baseDimensions: [
    { id: "learningHealth", label: "学习健康", cap: 30, fields: ["F04", "F05", "F06"] },
    { id: "courseExperience", label: "课程体验", cap: 15, fields: ["F07"], omitWhenMissing: true },
    { id: "outcomes", label: "成果外化", cap: 15, fields: ["F08", "F09"] },
    { id: "parentEngagement", label: "家长互动", cap: 15, fields: ["F11", "F16"] },
    { id: "fit", label: "用户适配", cap: 5, fields: ["F03"] }
  ],
  independentSignals: ["F13", "F14"],
  touchGate: "F12",
  riskField: "F15"
};
```

- [ ] **Step 4: 创建公司现有后台能力映射**

```js
// data/system-capabilities.js（记录必须与实读结论一致）
export const SYSTEM_CAPABILITIES = [
  {
    id: "marketing",
    name: "营销中心",
    path: "/m/marketing/operation/activity",
    status: "confirmed-reusable",
    confirmedAt: "2026-06-24",
    existing: ["活动筛选", "活动列表", "新建活动", "act code", "生效对象", "推广", "数据入口"],
    reuse: ["任务制活动", "预约活动", "抽奖活动", "领课活动"],
    changes: ["R线场景标签", "act code命名规范", "用户级结果回写"],
    fallback: "活动结果按日导出后导入用户事件宽表"
  }
];
```

- [ ] **Step 5: 创建24名以上跨场景模拟用户与任务**

`SEED_STATE.users` 每名用户使用一致字段组：`id`、`childId`、`productType`、`stageCode`、`issueType`、`learning`、`courseEvaluation`、`assessment`、`report`、`activity`、`parent`、`touch`、`marketing`、`transaction`、`risk`、`taskFeedback`。至少包含缺F07、高分风险、F12阻断、同曝光组F13、F14 P0、H3提分、MANUAL活动等专用样例。

- [ ] **Step 6: 运行契约测试**

Run: `npm test`

Expected: 3 tests PASS，0 FAIL。

- [ ] **Step 7: 提交数据契约**

```bash
git add package.json data tests/contracts.test.mjs
git commit -m "feat: define R-line V2 data contracts"
```

---

### Task 2: 用TDD实现最新版评分与H层级

**Files:**
- Create: `core/scoring-engine.js`
- Create: `tests/scoring-engine.test.mjs`
- Modify: `data/rules.js`

**Interfaces:**
- Consumes: `SCORING_RULES`, `H_LEVEL_RULES`。
- Produces: `scoreUser(user, rules?) -> ScoreResult`、`scoreUsers(users, rules?) -> ScoredUser[]`。
- `ScoreResult`包含 `baseScore`、`dimensions`、`upliftScore`、`hLevel`、`marketingSignal`、`transactionSignal`、`risk`、`reasons`。

- [ ] **Step 1: 写十个关键评分场景的失败测试**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { scoreUser } from "../core/scoring-engine.js";
import { scenarioUser } from "../data/seed-data.js";

test("missing F07 is removed from denominator", () => {
  const withEvaluation = scoreUser(scenarioUser("high-base"));
  const withoutEvaluation = scoreUser({ ...scenarioUser("high-base"), courseEvaluation: null });
  assert.equal(withoutEvaluation.dimensions.courseExperience.status, "not-participating");
  assert.ok(withoutEvaluation.baseScore >= withEvaluation.baseScore - 2);
});

test("refund fuses a high scoring user into H4", () => {
  const result = scoreUser({ ...scenarioUser("high-base"), risk: { fuse: true, type: "退款" } });
  assert.equal(result.hLevel, "H4");
  assert.equal(result.risk.salesFrozen, true);
});

test("marketing and transaction signals never raise base score", () => {
  const base = scenarioUser("mid-base");
  const signaled = { ...base, marketing: { exposureEligible: true, renewalQuestion: true }, transaction: { unpaid: true } };
  assert.equal(scoreUser(base).baseScore, scoreUser(signaled).baseScore);
});
```

其余测试覆盖：报告仅生成不加分、MANUAL活动不进自动分、F12不扣分、H2先于H3、同曝光组营销等级、非同组不可比、F14 P0、F16难度异议更新风险。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/scoring-engine.test.mjs`

Expected: FAIL，错误包含 `scoreUser is not exported` 或 `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现维度计分与适用性**

```js
export function normalize(earned, cap) {
  return cap > 0 ? Math.round((earned / cap) * 100) : null;
}

function finalizeDimension(label, earned, cap, items, participates = true) {
  if (!participates) return { label, earned: null, cap: 0, normalized: null, status: "not-participating", items };
  const bounded = Math.min(cap, Math.max(0, earned));
  return { label, earned: bounded, cap, normalized: normalize(bounded, cap), status: "scored", items };
}
```

维度函数分别实现 `scoreLearningHealth`、`scoreCourseExperience`、`scoreOutcomes`、`scoreParentEngagement`、`scoreFit`，每个得分项返回 `ruleId`、`label`、`points`、`actual`、`window`、`fieldIds`、`status`。

- [ ] **Step 4: 实现独立信号、风险、提分潜力与H层级顺序**

```js
function classifyHLevel({ baseScore, outcomeNormalized, upliftScore, risk }) {
  if (risk.fused || risk.deduction >= 20) return "H4";
  if (baseScore >= 75) return "H1";
  if (baseScore >= 65 || (baseScore >= 60 && outcomeNormalized >= 70)) return "H2";
  if (baseScore >= 40 && baseScore <= 64 && upliftScore >= 65) return "H3";
  return "L";
}
```

F13返回 `{ level, comparable, cohortId, reasons }`；F14返回 `{ priority, reasons }`。二者不得参与 `baseScore`。

- [ ] **Step 5: 运行评分测试与全量测试**

Run: `npm test`

Expected: 所有评分和契约测试PASS。

- [ ] **Step 6: 提交评分引擎**

```bash
git add core/scoring-engine.js data/rules.js tests/scoring-engine.test.mjs
git commit -m "feat: implement latest R-line scoring model"
```

---

### Task 3: 用TDD实现触达准入、团队路由和系统落位

**Files:**
- Create: `core/routing-engine.js`
- Create: `tests/routing-engine.test.mjs`
- Modify: `data/rules.js`
- Modify: `data/system-capabilities.js`

**Interfaces:**
- Consumes: `ScoreResult`、`TASK_RULES`、`FEATURE_PLACEMENTS`。
- Produces: `evaluateTouchGate(user, taskType)`、`routeUser(user, scoreResult)`、`getPlacement(featureId)`。
- `routeUser`返回 `team`、`subteam`、`channel`、`taskCategory`、`taskSubtype`、`priority`、`slaHours`、`touchGate`、`trace`、`placementId`。

- [ ] **Step 1: 写路由失败测试**

```js
import { scenarioUser } from "../data/seed-data.js";

test("template question routes to unbound Agent queue", () => {
  const user = scenarioUser("template-question");
  const result = routeUser(user, scoreUser(user));
  assert.equal(result.team, "agent");
  assert.equal(result.bindingMode, "unbound");
});

test("annual M9 H1 with P0 transaction routes to bound sales", () => {
  const user = scenarioUser("annual-renewal-p0");
  const result = routeUser(user, scoreUser(user));
  assert.equal(result.team, "sales");
  assert.equal(result.bindingMode, "bound");
  assert.equal(result.priority, "P0");
});

test("touch limit blocks task without changing score", () => {
  const user = scenarioUser("touch-blocked");
  const score = scoreUser(user);
  const result = routeUser(user, score);
  assert.equal(result.touchGate.status, "blocked");
  assert.equal(result.hLevel, score.hLevel);
});
```

补充测试：H4进入售后/学情修复、续费窗口二销前台接住、漏学进入学情干预、报告解读进入学情规划、复杂问题转电话、P0豁免留痕、系统落位状态返回正确。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/routing-engine.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现F12准入顺序和路由轨迹**

```js
export function evaluateTouchGate(user, taskType) {
  const touch = user.touch ?? {};
  if (taskType === "P0" && touch.p0Exception) {
    return { status: "allowed-with-exception", reason: touch.exceptionReason, supervisorVisible: true };
  }
  if (touch.channelLimit || touch.globalCount7d >= touch.globalLimit7d) {
    return { status: "blocked", reason: touch.channelLimit ? "渠道硬上限" : "家长全局频控" };
  }
  return { status: "allowed", reason: "未命中触达限制" };
}
```

`trace`按“风险 -> 生命周期 -> H层级/F14 -> 问题类型 -> F12 -> 渠道 -> 团队/SLA”输出，每步包含 `label`、`value`、`decision`。

- [ ] **Step 4: 实现三类角色、三小组和文字/电话规则**

默认文字；风险、复杂学情、多次文字未解决、明确预约电话或需要高密度解释时转电话。续费窗口H1/H2与F14 P0/P1进入绑定二销；非续费窗口学情任务进入不绑定队列。

- [ ] **Step 5: 运行全量测试**

Run: `npm test`

Expected: 所有契约、评分和路由测试PASS。

- [ ] **Step 6: 提交路由引擎**

```bash
git add core/routing-engine.js data/rules.js data/system-capabilities.js tests/routing-engine.test.mjs
git commit -m "feat: add role routing and platform placement"
```

---

### Task 4: 用TDD实现CSV/JSON导入和本地状态

**Files:**
- Create: `core/import-export.js`
- Create: `core/store.js`
- Create: `core/selectors.js`
- Create: `tests/import-export.test.mjs`

**Interfaces:**
- Consumes: `scoreUsers`、`routeUser`、`SEED_STATE`。
- Produces: `parseCsv(text)`、`parseImport(text, type)`、`validateUser(row, rowNumber)`、`importUsers(rows, existing, duplicateMode)`、`mergeUsers(current, incoming, mode)`、`serializeCsv(rows)`、`createStore(seedState)`。

- [ ] **Step 1: 写带引号CSV、非法字段和重复用户失败测试**

```js
test("CSV parser keeps commas inside quoted cells", () => {
  const rows = parseCsv('user_id,issue\nU1,"价格,时间"');
  assert.equal(rows[0].issue, "价格,时间");
});

test("validator rejects missing keys without mutating existing users", () => {
  const existingUser = { user_id: "U0", product_type: "monthly", stage_code: "T7" };
  const result = importUsers([{ product_type: "monthly" }], [existingUser]);
  assert.equal(result.errors[0].code, "MISSING_USER_ID");
  assert.deepEqual(result.users, [existingUser]);
});
```

覆盖正常JSON、非法日期、非法产品、非法阶段、数值越界、重复更新/跳过、部分成功不覆盖失败行。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/import-export.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现无依赖CSV状态机解析器和字段验证**

```js
export function validateUser(row, rowNumber) {
  const errors = [];
  if (!row.user_id) errors.push({ row: rowNumber, field: "user_id", code: "MISSING_USER_ID", message: "缺少用户统一ID" });
  if (!['monthly', 'annual'].includes(row.product_type)) {
    errors.push({ row: rowNumber, field: "product_type", code: "INVALID_PRODUCT", message: "课程类型必须是monthly或annual" });
  }
  return errors;
}
```

- [ ] **Step 4: 实现版本化localStorage、撤销和重算**

```js
export function createStore(seedState, storage = window.localStorage) {
  let state = loadState(storage) ?? structuredClone(seedState);
  const listeners = new Set();
  return {
    getState: () => state,
    subscribe: (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    update: (recipe) => {
      const previous = structuredClone(state);
      state = recipe(structuredClone(state));
      state.history = [...(state.history ?? []), previous].slice(-10);
      persistState(storage, state);
      listeners.forEach((listener) => listener(state));
    },
    reset: () => { state = structuredClone(seedState); persistState(storage, state); listeners.forEach((l) => l(state)); }
  };
}
```

- [ ] **Step 5: 实现看板与角色选择器**

`selectDashboardMetrics`、`selectUsers`、`selectTasksForRole`、`selectTeamLoad`、`selectMigrationRows`必须只消费状态，不修改状态。

- [ ] **Step 6: 运行全量测试并提交**

Run: `npm test`

Expected: 所有测试PASS。

```bash
git add core tests/import-export.test.mjs
git commit -m "feat: add import and local state engine"
```

---

### Task 5: 重建应用外壳、视觉系统和通用组件

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Create: `ui/components.js`
- Create: `ui/icons.js`

**Interfaces:**
- Consumes: `createStore`、视图模块的 `render(container, context)`。
- Produces: `renderBadge`、`renderTable`、`renderPlacementPanel`、`openDrawer`、`openModal`、`toast`、`iconButton`。

- [ ] **Step 1: 用语义化HTML替换旧版固定页面内容**

```html
<div class="app-shell">
  <aside class="sidebar" aria-label="R线策略中台导航"></aside>
  <main class="workspace">
    <header class="topbar"></header>
    <div id="viewRoot" tabindex="-1"></div>
  </main>
</div>
<div id="drawerRoot"></div>
<div id="modalRoot"></div>
<div id="toastRoot" aria-live="polite"></div>
<script type="module" src="./app.js"></script>
```

- [ ] **Step 2: 定义后台视觉tokens和稳定尺寸**

```css
:root {
  --bg: #f4f6f3;
  --surface: #ffffff;
  --surface-muted: #eef2ee;
  --ink: #202621;
  --muted: #687169;
  --line: #d8ded8;
  --accent: #237a55;
  --accent-soft: #dcefe5;
  --danger: #b53a36;
  --warning: #a96512;
  --info: #2f65a7;
  --radius: 6px;
  --sidebar-width: 228px;
  --topbar-height: 68px;
}
```

- [ ] **Step 3: 实现角色切换、导航和URL hash恢复**

角色值固定为 `strategy`、`agent`、`learning`、`sales`。切换后更新导航可见项、任务数量和页面权限提示；刷新后从hash和store恢复当前视图。

- [ ] **Step 4: 实现通用抽屉、弹窗、状态标签和产研落位面板**

`renderPlacementPanel(featureId)`必须显示现有系统、路径、状态、已有能力、复用、改造、新增、依赖、负责人、验收和降级方案。已确认与待核对使用不同文本和图标，不只靠颜色。

图标通过固定版本的Lucide浏览器脚本加载，`ui/icons.js`只生成 `data-lucide` 标记并在渲染后调用 `window.lucide?.createIcons()`；脚本不可用时保留按钮文字和`aria-label`，功能不能依赖图标加载。

- [ ] **Step 5: 启动本地服务器做应用外壳烟测**

Run: `npm run serve`

Expected: `Serving HTTP on ... port 4173`，打开 `http://localhost:4173` 可见侧栏、顶部角色切换和空视图容器，控制台无错误。

- [ ] **Step 6: 提交外壳与设计系统**

```bash
git add index.html styles.css app.js ui
git commit -m "feat: rebuild strategy center application shell"
```

---

### Task 6: 实现总控台、用户中心和评分中心

**Files:**
- Create: `views/dashboard.js`
- Create: `views/users.js`
- Create: `views/scoring.js`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `ui/components.js`

**Interfaces:**
- Consumes: store、selectors、`ScoreResult`、`renderPlacementPanel`。
- Produces: 可下钻总控台、筛选用户池、用户详情、行为模拟、规则试算。

- [ ] **Step 1: 实现总控台指标与下钻筛选**

KPI固定为H1/H2、H3提分、H4风险、F14实时任务、F12阻断、数据异常。点击指标调用 `navigate("users", { preset: "h1-h2" })` 等预设筛选。

- [ ] **Step 2: 实现用户池筛选、排序和列显示**

表格至少显示用户、产品/阶段、基础分、H层级、提分潜力、F13、F14、风险、F12、主责、任务。筛选器与表格行高使用稳定尺寸，最长状态允许换行而不覆盖相邻内容。

- [ ] **Step 3: 实现用户详情和固定流转轨迹**

```text
行为进入 -> 基础计分 -> H层级 -> 触达准入 -> 主责团队 -> 当前任务 -> 回写 -> 下次重算
```

详情内基础高优分、F13、F14、F12和风险分栏展示，F13/F14不得画入基础分圆环或堆叠条。

- [ ] **Step 4: 实现逐项计分与行为模拟**

每个规则行显示实际值、得分、字段、观察窗口、状态和更新时间。行为模拟仅开放课程评价、报告打开/停留/分享、家长回复、领券/待付款、风险和触达次数等关键字段；点击“预览重算”展示前后差异，点击“应用到模拟数据”前确认。

- [ ] **Step 5: 实现评分中心规则页和规则试算**

标签页为基础高优分、运营提分潜力、独立信号、风险与熔断、规则试算。每页都能下钻到字段和系统落位；规则草稿只保存在本地并可恢复线上基准。

- [ ] **Step 6: Playwright烟测三个页面**

Run:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" open http://localhost:4173
"$PWCLI" snapshot
```

Expected: 快照包含“总控台”“用户中心”“评分中心”“基础高优分”“营销意向（独立）”。

- [ ] **Step 7: 提交核心分析视图**

```bash
git add views/dashboard.js views/users.js views/scoring.js app.js styles.css ui/components.js
git commit -m "feat: add dashboard user and scoring workspaces"
```

---

### Task 7: 实现进线中心、角色任务台和回写重算

**Files:**
- Create: `views/intake.js`
- Create: `views/tasks.js`
- Modify: `core/store.js`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `routeUser`、`selectTasksForRole`、store。
- Produces: 路由队列、路由轨迹、任务处理表单、结构化F16回写和前后重算。

- [ ] **Step 1: 实现进线状态与路由轨迹列表**

状态固定为新进线、待判定、待分配、已分配、排队、阻断。每行显示问题、阶段、H层级、风险、F12、建议渠道、团队/小组、SLA和现有系统落点。

- [ ] **Step 2: 实现四种角色的任务过滤和权限提示**

- 策略中心：全量任务和改派模拟。
- Agent：模板服务和待升级任务。
- 学情沟通组：售后、干预、规划及内部文字/电话队列。
- 二销：续费窗口绑定用户、蜜续/结续及全部文字/电话记录。

- [ ] **Step 3: 实现结构化回写表单**

```js
const feedback = {
  contactStatus: "reached",
  responseStatus: "replied",
  learningConclusion: "报告价值未被家长感知",
  intentStatus: "considering",
  objectionType: "none",
  riskChange: "unchanged",
  nextAction: "send-report-explanation",
  nextFollowAt: "2026-07-21T10:00:00+08:00",
  finalResult: "follow-up"
};
```

所有枚举使用下拉/单选，备注只用于补充，不替代结构化字段。

- [ ] **Step 4: 实现回写后的实时与次日口径**

F13/F14/F15实时更新；F16保存记录；基础分变化先显示“立即预览”，用户点击“模拟次日重算”后应用。页面并排显示分数、层级、主责、任务和F12前后变化。

- [ ] **Step 5: 实现F12阻断和P0豁免**

阻断任务不可直接提交触达结果；P0豁免需要填写原因并标记“主管可见”。基础分和H层级不因阻断变化。

- [ ] **Step 6: 手工跑主演示链路**

从F14=P0的月课T24用户进入详情，查看H层级和二销路由，完成回写并模拟次日重算；再验证高分退款用户始终H4且无销售动作。

- [ ] **Step 7: 提交任务闭环**

```bash
git add views/intake.js views/tasks.js core/store.js app.js styles.css
git commit -m "feat: complete intake task and feedback loop"
```

---

### Task 8: 实现生命周期、运营、数据底座、系统落位与复盘

**Files:**
- Create: `views/lifecycle.js`
- Create: `views/operations.js`
- Create: `views/data-foundation.js`
- Create: `views/system-map.js`
- Create: `views/review.js`
- Create: `views/demands.js`
- Modify: `data/seed-data.js`
- Modify: `app.js`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `FIELD_DEFINITIONS`、`SYSTEM_CAPABILITIES`、`FEATURE_PLACEMENTS`、selectors。
- Produces: 产研可核对的系统地图、生命周期、运营和提需页面。

- [ ] **Step 1: 实现月课/年课分段时间轴**

月课明确T0-T10、T11-T21、T22-T28；年课明确M1-M7、M8-M12。点击节点显示字段、触发任务、自动动作、人工动作、主责角色、系统落点和验收指标。

- [ ] **Step 2: 实现运营提分和奖学金独立资产**

活动标记 `IN_APP`/`MANUAL`，只有端内活动进入F10自动分。奖学金不进入基础高优分；兑换点击形成F13，券/订单结果进入F14。

- [ ] **Step 3: 实现F01-F16数据底座**

支持按类型、进分角色、刷新周期、来源、可用状态筛选。字段详情显示技术字段、观察窗口、缺失处理、上下游页面、现有系统与改造/新增项。

- [ ] **Step 4: 实现公司现有系统拓扑与落位矩阵**

必须覆盖营销中心、CRM标签/分群、销售运营、客户关系、教务、工单、外呼、前台卡片、AI中台、可视化看板。CRM分群明确展示403历史阻塞和“标签优先”的MVP降级；销售运营等只确认入口的模块显示“已有入口待核对”。

- [ ] **Step 5: 实现四张固定复盘表**

高优池效果、H3提分迁移、任务有效性、误判漏判。所有数字显示“模拟数据”标记，并支持按课程、阶段、活动、团队筛选。

- [ ] **Step 6: 实现跨部门提需表与CSV导出**

列为优先级、部门、现有能力、需要新增、需要变化、依赖、负责人、验收标准、状态和降级方案。P0至少包含统一用户ID、规则计算、CRM标签、任务字段、风险回写、活动回写和分数快照。

- [ ] **Step 7: 提交产研参考视图**

```bash
git add views data/seed-data.js app.js styles.css
git commit -m "feat: add feasibility and system placement views"
```

---

### Task 9: 实现导入导出UI、空状态、响应式和可访问性

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `ui/components.js`
- Modify: `views/users.js`
- Modify: `views/tasks.js`

**Interfaces:**
- Consumes: `parseImport`、`mergeUsers`、`serializeCsv`、store。
- Produces: 导入向导、导出、恢复、错误报告和完整响应式交互。

- [ ] **Step 1: 实现四步导入向导**

选择文件 -> 字段映射 -> 校验预览 -> 确认导入。显示成功、警告、失败数量；默认不导入失败行；重复用户可选择更新或跳过。

- [ ] **Step 2: 实现导出、撤销和恢复**

支持当前用户JSON、筛选用户CSV、任务CSV、提需CSV、错误报告CSV和规则草稿JSON。重置前显示将清除本地演示修改，确认后恢复 `SEED_STATE`。

- [ ] **Step 3: 补齐加载、空、错误和存储超限状态**

存储不可用时保留内存演示并提示导出快照；无匹配用户时显示清除筛选按钮；解析失败逐行展示错误，不替换当前状态。

- [ ] **Step 4: 完成键盘、焦点和对比度检查**

抽屉和弹窗打开后聚焦标题，Tab不逃出，ESC关闭后焦点返回触发按钮；所有图标按钮有tooltip和`aria-label`；颜色状态同时有文字。

- [ ] **Step 5: 完成1280、1440、768和390宽度响应式**

手机端保留总控、用户、任务和回写；复杂规则编辑与批量导入显示桌面端提示。表格使用固定首列和横向滚动，不让文字覆盖。

- [ ] **Step 6: 提交完整交互与响应式**

```bash
git add app.js styles.css ui views/users.js views/tasks.js
git commit -m "feat: add import responsive and accessible interactions"
```

---

### Task 10: 全量验证、文档、推送和线上复验

**Files:**
- Modify: `README.md`
- Create: `output/playwright/rline-v2-desktop.png`
- Create: `output/playwright/rline-v2-mobile.png`

**Interfaces:**
- Consumes: 完整站点。
- Produces: 测试证据、预览说明、GitHub Pages线上版本。

- [ ] **Step 1: 运行全部规则测试**

Run: `npm test`

Expected: 所有测试PASS，0 FAIL。

- [ ] **Step 2: 启动静态服务器并检查控制台**

Run: `npm run serve`

Expected: `http://localhost:4173`可访问，浏览器控制台无未处理错误。

- [ ] **Step 3: 用Playwright跑桌面主演示链路**

依次验证：策略角色总控 -> H1用户 -> 逐项计分 -> 系统落位 -> 二销角色 -> 任务回写 -> 次日重算 -> 系统落位页。截图保存到 `output/playwright/rline-v2-desktop.png`。

- [ ] **Step 4: 用Playwright跑手机关键链路**

390×844视口验证导航、用户详情、任务查看、回写、抽屉关闭和无重叠。截图保存到 `output/playwright/rline-v2-mobile.png`。

- [ ] **Step 5: 更新README**

README写明站点定位、数据为模拟数据、运行命令、业务事实源、现有系统复用原则、导入隐私提示和主演示步骤。

- [ ] **Step 6: 运行最终差异和工作树检查**

Run: `git diff --check`

Expected: 无输出。

Run: `git status --short`

Expected: 仅包含本任务README和截图等预期文件。

- [ ] **Step 7: 提交验证产物**

```bash
git add README.md output/playwright
git commit -m "docs: verify R-line strategy center V2"
```

- [ ] **Step 8: 推送main并等待GitHub Pages发布**

Run: `git push origin main`

Expected: push成功；GitHub Pages随后更新 `https://viannni.github.io/rline-strategy-center-pages/`。

- [ ] **Step 9: 回读线上站点复验**

线上确认版本文案、基础模型、F13/F14独立展示、F12准入、角色任务、系统落位和移动端均与本地一致；若Pages缓存未更新，等待部署完成后再次读取，不能把旧版截图当作完成证据。

---

## Completion Criteria

- 最新评分、独立信号、风险和H层级测试全部通过。
- 主演示闭环可从用户进入连续跑到回写和重算。
- 四种角色视图能看到不同队列和动作。
- 公司现有系统落位矩阵可被产研逐项核对，已确认与待核对不混淆。
- CSV/JSON导入、本地保存、导出、撤销和恢复可用。
- 桌面和手机无重叠、不可达控件或控制台错误。
- GitHub Pages线上版本完成复验。
