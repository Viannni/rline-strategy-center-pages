import test from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../core/store.js";
import { SEED_STATE } from "../data/seed-data.js";
import { escapeHtml, renderTable } from "../ui/components.js";
import {
  DETAIL_FLOW,
  applyUserPreset,
  buildUserDetailModel,
  buildUserRows,
  diffSimulationValues,
  filterUserRows,
  previewSimulation
} from "../views/users.js";
import {
  SCORING_TABS,
  buildBaseRuleRows,
  createRuleDraft,
  previewRuleDraft,
  restoreOnlineBaseline
} from "../views/scoring.js";
import * as contentView from "../views/content.js";
import * as applicationsView from "../views/applications.js";
import * as executionView from "../views/execution.js";
import * as modelsView from "../views/models.js";
import * as insightsView from "../views/insights.js";
import * as lifecycleView from "../views/lifecycle.js";
import * as effectivenessView from "../views/effectiveness.js";
import * as inboundReviewView from "../views/inbound-review.js";
import * as dataFoundationView from "../views/data-foundation.js";
import { renderStrategyWorkspace } from "../views/strategy-workspace.js";

function htmlFor(view) {
  const root = { innerHTML: "" };
  view.render(root, { state: SEED_STATE, role: "strategy", components: {} });
  return root.innerHTML;
}

test("effectiveness view measures strategy performance by business line", () => {
  const html = htmlFor(effectivenessView);

  assert.match(html, /有效性看板/);
  assert.match(html, /微信回复率/);
  assert.match(html, /E1课程QA模板解决率/);
  assert.match(html, /版本/);
  assert.match(html, /证据状态/);
  assert.match(html, /k-line/);
  assert.match(html, /e-line/);
  assert.match(html, /模板模拟/);
  assert.match(html, /观察窗口/);
});

test("inbound review is strategy attribution rather than dispatch", () => {
  const html = htmlFor(inboundReviewView);

  assert.match(html, /进线复盘/);
  assert.match(html, /策略归因/);
  assert.match(html, /质量分布/);
  assert.match(html, /进线量/);
  assert.match(html, /解决率/);
  assert.match(html, /证据状态/);
  assert.match(html, /非派单/);
  assert.match(html, /k-line/);
  assert.match(html, /e-line/);
  assert.match(html, /E1课程\/升阶规划/);
});

test("data foundation shows business-domain and product-engineering requirements", () => {
  const html = htmlFor(dataFoundationView);

  assert.match(html, /业务域主数据/);
  assert.match(html, /策略ID\/版本ID/);
  assert.match(html, /刷新周期/);
  assert.match(html, /业务域/);
  assert.match(html, /首版用K2样例静态配置/);
  assert.match(html, /k-line/);
  assert.match(html, /e-line/);
});

const state = () => createStore(SEED_STATE, null).getState();

test("dashboard presets become composable user filters", () => {
  const rows = buildUserRows(state());
  const h1h2 = filterUserRows(rows, applyUserPreset({}, "h1-h2"), "baseScore-desc");
  const blocked = filterUserRows(rows, applyUserPreset({}, "f12-blocked"));

  assert.ok(h1h2.length > 0);
  assert.ok(h1h2.every((row) => ["H1", "H2"].includes(row.hLevel)));
  assert.ok(h1h2.every((row, index) => index === 0 || h1h2[index - 1].baseScore >= row.baseScore));
  assert.deepEqual(blocked.map(({ id }) => id), ["touch-blocked"]);
});

test("text, product, lifecycle, signal, risk, gate, and team filters can combine", () => {
  const rows = buildUserRows(state());
  const filtered = filterUserRows(rows, {
    text: "child-1018", productType: "monthly", stageCode: "T13", hLevel: "H4",
    signal: "none", risk: "active", gate: "eligible", team: "learning"
  });
  assert.deepEqual(filtered.map(({ id }) => id), ["difficulty-objection"]);
});

test("user detail keeps base score, F13, F14, F12, and risk in separate groups", () => {
  const model = buildUserDetailModel(state(), "annual-renewal-p0");
  assert.deepEqual(model.scoreGroups.map(({ id }) => id), ["base", "f13", "f14", "f12", "risk"]);
  assert.ok(model.scoreGroups.find(({ id }) => id === "base").fieldIds.every((fieldId) => !["F12", "F13", "F14", "F15"].includes(fieldId)));
  assert.equal(model.scoreGroups.find(({ id }) => id === "f14").value, "P0");
  assert.deepEqual(DETAIL_FLOW, ["行为进入", "基础计分", "H层级", "触达准入", "主责团队", "当前任务", "回写", "下次重算"]);
  assert.ok(model.scoringRows.length > 0);
  assert.ok(model.scoringRows.every((row) => Object.hasOwn(row, "actual") && Object.hasOwn(row, "points") && row.fieldIds.length > 0 && row.window && row.status && row.updatedAt));
});

test("simulation preview supports named safe fields without mutating browser state", () => {
  const current = state();
  const before = structuredClone(current);
  const preview = previewSimulation(current, "annual-renewal-p0", { transactionUnpaid: false, couponUnused: true, reportDwellMinutes: 20, touchTotal7d: 6 });
  assert.deepEqual(current, before);
  assert.equal(preview.simulatedUser.transaction.unpaid, false);
  assert.equal(preview.simulatedUser.transaction.couponUnused, true);
  assert.notStrictEqual(preview.before.score, preview.after.score);
  assert.equal(preview.after.score.transactionSignal.priority, "P1");
  assert.equal(preview.after.route.touchGate.status, "blocked");
});

test("simulation rejects fields outside the named safe list", () => {
  assert.throws(() => previewSimulation(state(), "high-base", { productType: "annual" }), /Unsupported simulation field: productType/);
});

test("unchanged simulation controls do not clear hidden payment failure or coerce missing scores", () => {
  const current = state();
  const paymentFailed = current.users.find(({ id }) => id === "p0-outside-renewal-window");
  const missingEvaluation = current.users.find(({ id }) => id === "missing-f07");
  assert.deepEqual(diffSimulationValues(paymentFailed, {
    courseEvaluationScore: paymentFailed.courseEvaluation.normalizedScore, reportOpened: paymentFailed.report.opened,
    reportDwellMinutes: paymentFailed.report.dwellMinutes, reportShared: paymentFailed.report.shared,
    parentReplied: paymentFailed.parent.replyStatus === "replied", couponUnused: false, transactionUnpaid: false,
    riskFuse: paymentFailed.risk.fuse, riskDeduction: paymentFailed.risk.deduction, touchTotal7d: paymentFailed.touch.total7d
  }), {});
  assert.deepEqual(diffSimulationValues(missingEvaluation, { courseEvaluationScore: null }), {});
});

test("scoring workspace exposes the five approved tabs and traceable base rules", () => {
  assert.deepEqual(SCORING_TABS.map(({ label }) => label), ["基础高优分", "运营提分潜力", "独立信号", "风险与熔断", "规则试算"]);
  assert.ok(buildBaseRuleRows().every((row) => row.fieldIds.length > 0 && row.window && Number.isFinite(row.points)));
});

test("rule drafts are local clones and can restore the online baseline", () => {
  const current = state();
  const draft = createRuleDraft();
  draft.pointRules.learningHealth.completionHigh.points = 1;
  const preview = previewRuleDraft(current, "high-base", draft);
  const restored = restoreOnlineBaseline();
  assert.equal(preview.draftRuleVersion, "local-draft");
  assert.equal(current.scores.find(({ userId }) => userId === "high-base").baseScore, preview.before.baseScore);
  assert.equal(restored.pointRules.learningHealth.completionHigh.points, 8);
  assert.notStrictEqual(restored, draft);
});

test("table custom markup requires the explicit trustedHtml boundary", () => {
  const html = renderTable({
    columns: [{ key: "name", label: "名称" }, { key: "id", label: "操作", trustedHtml: (value) => `<button>${escapeHtml(value)}</button>` }],
    rows: [{ id: "<open>", name: "<unsafe>" }]
  });
  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /<button>&lt;open&gt;<\/button>/);
});

test("strategy workspaces render seed-backed asset configuration", () => {
  const content = htmlFor(contentView);
  const execution = htmlFor(executionView);
  const models = htmlFor(modelsView);
  const applications = htmlFor(applicationsView);
  const insights = htmlFor(insightsView);

  assert.match(content, /ES-OUTCOME-REPORT-001/);
  assert.match(content, /k-line/);
  assert.match(content, /3天/);
  assert.match(execution, /ES-EXEC-MISS-001/);
  assert.match(execution, /M3/);
  assert.match(models, /ES-RENEWAL-BRIDGE-001/);
  assert.match(models, /planning_result/);
  assert.match(models, /online/);
  assert.match(applications, /e-line/);
  assert.match(insights, /k-line/);
});

test("strategy workspaces render preset work templates for uncovered materials", () => {
  const content = htmlFor(contentView);
  const execution = htmlFor(executionView);
  const models = htmlFor(modelsView);
  const applications = htmlFor(applicationsView);
  const insights = htmlFor(insightsView);

  assert.match(content, /策略板块工作拆解/);
  assert.match(content, /TPL-CONTENT-CALENDAR/);
  assert.match(content, /资料未覆盖的部分使用预设模板补齐/);
  assert.match(execution, /TPL-EXEC-RULE/);
  assert.match(execution, /频控与冲突检查/);
  assert.match(models, /TPL-MODEL-SCORE/);
  assert.match(models, /每日T\+1\+关键节点快照/);
  assert.match(insights, /TPL-INSIGHT-ATTRIBUTION/);
  assert.match(insights, /进线复盘/);
  assert.match(applications, /TPL-AI-BOUNDARY/);
  assert.match(applications, /知识库缺口维护/);
});

test("strategy workspaces render related effectiveness metrics by strategy ID", () => {
  const content = htmlFor(contentView);
  const execution = htmlFor(executionView);
  const models = htmlFor(modelsView);

  assert.match(content, /效果复盘/);
  assert.match(content, /ES-OUTCOME-REPORT-001/);
  assert.match(content, /微信回复率/);
  assert.match(content, /18\.6/);
  assert.match(content, /14/);
  assert.match(content, /3天/);
  assert.match(content, /positive/);

  assert.match(execution, /ES-EXEC-MISS-001/);
  assert.match(execution, /7天活跃天数提升/);
  assert.match(execution, /1\.2/);
  assert.match(execution, /0\.8/);
  assert.match(execution, /7天/);

  assert.match(models, /ES-RENEWAL-BRIDGE-001/);
  assert.match(models, /下一阶段规划同意率/);
  assert.match(models, /21\.7/);
  assert.match(models, /16/);
  assert.match(models, /续费窗口/);
});

test("strategy workspaces expose each asset's reusable scope", () => {
  assert.match(htmlFor(contentView), /跨级别复用/);
});

test("unmatched strategy workspace renders an empty asset table", () => {
  const root = { innerHTML: "" };
  renderStrategyWorkspace(root, { state: { strategyAssets: [{ id: "UNMATCHED", ownerRole: "other-role", type: "other-type" }] } }, {
    ownerRole: "missing-role",
    types: [],
    kicker: "测试",
    title: "未匹配工作区",
    description: "测试无匹配资产时的空状态。",
    assetHeading: "资产",
    capabilityHeading: "能力",
    capabilityRows: []
  });

  assert.match(root.innerHTML, /暂无数据/);
  assert.doesNotMatch(root.innerHTML, /UNMATCHED/);
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
  assert.match(htmlFor(modelsView), /学习分层/);
  assert.match(htmlFor(modelsView), /关单SOP/);
  assert.match(htmlFor(insightsView), /用户洞察工作区/);
  assert.match(htmlFor(insightsView), /级别权益规则/);
});

test("lifecycle view becomes multi-line strategy coverage map", () => {
  const html = htmlFor(lifecycleView);
  assert.match(html, /策略覆盖地图/);
  assert.match(html, /K2 \/ E1 策略密度/);
  assert.match(html, /M1-M12/);
  assert.match(html, /K2中心化SOP模板/);
  assert.match(html, /E1升阶规划模板/);
  assert.match(html, /E1待接入样例/);
  assert.match(html, /M12/);
  assert.match(html, /过密/);
});
