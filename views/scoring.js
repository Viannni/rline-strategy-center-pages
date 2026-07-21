import { scoreUser } from "../core/scoring-engine.js";
import { FIELD_DEFINITIONS, SCORING_RULES } from "../data/rules.js";
import {
  downloadFile,
  escapeAttribute,
  escapeHtml,
  openDrawer,
  renderBadge,
  renderPlacementPanel,
  renderTable,
  toast
} from "../ui/components.js";
import { icon, refreshIcons } from "../ui/icons.js";

export const SCORING_TABS = Object.freeze([
  { id: "base", label: "基础高优分" },
  { id: "uplift", label: "运营提分潜力" },
  { id: "signals", label: "独立信号" },
  { id: "risk", label: "风险与熔断" },
  { id: "trial", label: "规则试算" }
]);

export const RULE_EDITOR_MIN_WIDTH = 900;

export function isRuleEditorAvailable(viewportWidth) {
  return Number(viewportWidth) >= RULE_EDITOR_MIN_WIDTH;
}

const FIELD_PLACEMENTS = Object.freeze({
  F03: "learning-data", F04: "learning-data", F05: "learning-data", F06: "learning-data", F07: "learning-data", F08: "learning-data", F09: "front-entry",
  F10: "activity-uplift", F11: "touch-feedback", F12: "routing-policy", F13: "activity-uplift", F14: "task-queue", F15: "risk-fuse", F16: "touch-feedback"
});

let activeTab = "base";
let localDraft = createRuleDraft();

export function createRuleDraft() {
  return structuredClone({ ...SCORING_RULES, version: "local-draft" });
}

export function restoreOnlineBaseline() {
  return structuredClone(SCORING_RULES);
}

export function ruleDraftJson(draft = localDraft) {
  return `${JSON.stringify(structuredClone(draft), null, 2)}\n`;
}

function flattenRules(groupId, rules = SCORING_RULES) {
  const pointRules = rules.pointRules[groupId] ?? {};
  return Object.values(pointRules).map((rule) => ({
    id: rule.id,
    groupId,
    label: rule.label,
    points: Number(rule.points ?? 0),
    fieldIds: rule.fieldIds ?? [],
    window: rule.window ?? "当前",
    condition: Object.entries(rule).filter(([key]) => !["id", "label", "points", "fieldIds", "window"].includes(key)).map(([key, value]) => `${key}=${value}`).join("；") || "命中即计分",
    status: "online"
  }));
}

export function buildBaseRuleRows(rules = SCORING_RULES) {
  const labels = Object.fromEntries(rules.baseDimensions.map(({ id, label }) => [id, label]));
  return ["learningHealth", "courseExperience", "outcomes", "parentEngagement", "fit"].flatMap((groupId) => (
    flattenRules(groupId, rules).map((row) => ({ ...row, dimension: labels[groupId] ?? groupId }))
  ));
}

export function previewRuleDraft(state, userId, draft) {
  const user = (state?.users ?? []).find((candidate) => candidate.id === userId);
  if (!user) throw new Error(`Unknown user: ${userId}`);
  const before = (state?.scores ?? []).find((score) => score.userId === userId) ?? scoreUser(user);
  const after = scoreUser(structuredClone(user), structuredClone(draft));
  return { userId, before: structuredClone(before), after, draftRuleVersion: "local-draft" };
}

function fieldButtons(fieldIds) {
  return fieldIds.map((fieldId) => `<button type="button" class="field-chip" data-field-id="${escapeAttribute(fieldId)}">${escapeHtml(fieldId)}</button>`).join("");
}

function rulesTable(rows, { editable = false, editorAvailable = true } = {}) {
  return renderTable({
    columns: [
      { key: "dimension", label: "维度", className: "col-dimension" },
      { key: "label", label: "指标", className: "col-rule" },
      { key: "points", label: "分值", className: "col-number", trustedHtml: (value, row) => editable ? `<input class="rule-points-input" data-rule-id="${escapeAttribute(row.id)}" data-rule-group="${escapeAttribute(row.groupId)}" type="number" min="0" max="30" step="1" value="${escapeAttribute(value)}" aria-label="${escapeAttribute(row.label)}分值"${editorAvailable ? "" : " disabled"}>` : escapeHtml(value) },
      { key: "condition", label: "适用条件", className: "col-condition" },
      { key: "fieldIds", label: "字段", className: "col-fields", trustedHtml: (value) => fieldButtons(value) },
      { key: "window", label: "观察窗口", className: "col-window" },
      { key: "status", label: "状态", className: "col-status", trustedHtml: () => renderBadge(editable ? "warning" : "success", editable ? "本地草稿" : "线上基准") }
    ],
    rows,
    emptyText: "暂无规则"
  });
}

function renderBase() {
  return `<section class="score-toolbar"><div><strong>线上基准 ${escapeHtml(SCORING_RULES.version)}</strong><span>F13/F14 独立计算，不进入基础高优分。</span></div></section>${rulesTable(buildBaseRuleRows())}<div class="placement-slot">${renderPlacementPanel("scoring-routing")}</div>`;
}

function renderUplift() {
  const weights = SCORING_RULES.pointRules.uplift;
  const rows = [
    { id: "learning", factor: "学习修复空间", weight: weights.learningRepairWeight, fieldIds: ["F04", "F05", "F06"], note: "学习健康标准化分的反向空间" },
    { id: "outcomes", factor: "成果外化缺口", weight: weights.outcomesGapWeight, fieldIds: ["F08", "F09"], note: "成果标准化分的反向空间" },
    { id: "parent", factor: "家长可达", weight: weights.parentReachabilityWeight, fieldIds: ["F11"], note: "可达且有回复率" },
    { id: "activity", factor: "端内活动响应", weight: weights.activityResponseWeight, fieldIds: ["F10"], note: "仅 IN_APP 活动进入自动计算" }
  ];
  return `<section class="score-toolbar"><div><strong>运营提分潜力</strong><span>风险熔断或已有风险扣分时提分潜力归零。</span></div></section>${renderTable({ columns: [{ key: "factor", label: "因子" }, { key: "weight", label: "权重", format: (value) => `${Math.round(value * 100)}%` }, { key: "fieldIds", label: "字段", trustedHtml: (value) => fieldButtons(value) }, { key: "note", label: "口径" }], rows })}<div class="placement-slot">${renderPlacementPanel("activity-uplift")}</div>`;
}

function renderSignals() {
  const rows = [
    { id: "f13", signal: "营销意向（独立）", fieldIds: ["F13"], levels: "L0-L3", behavior: "保留曝光、问价、领券与预约事件；仅同曝光组可排名", placement: "activity-uplift" },
    { id: "f14", signal: "交易状态（独立）", fieldIds: ["F14"], levels: "P0-P2", behavior: "待付款/支付失败为P0，领券未用为P1；实时覆盖任务优先级", placement: "task-queue" },
    { id: "f12", signal: "触达准入", fieldIds: ["F12"], levels: "eligible / queued / blocked", behavior: "派单前即时校验，不进入基础分", placement: "routing-policy" }
  ];
  return `<section class="signal-rule-strip"><div><strong>基础高优分</strong><span>F03-F11 / 0-100</span></div><i aria-hidden="true"></i><div><strong>F13 营销意向</strong><span>独立信号</span></div><div><strong>F14 交易状态</strong><span>独立信号</span></div><div><strong>F12 触达准入</strong><span>独立闸门</span></div></section>${renderTable({ columns: [{ key: "signal", label: "信号" }, { key: "levels", label: "等级" }, { key: "fieldIds", label: "字段", trustedHtml: (value) => fieldButtons(value) }, { key: "behavior", label: "规则" }, { key: "placement", label: "落位", trustedHtml: (value, row) => `<button type="button" class="table-link table-link--inline" data-placement-id="${escapeAttribute(value)}">查看${escapeHtml(row.signal)}落位</button>` }], rows })}`;
}

function renderRisk() {
  const risk = SCORING_RULES.pointRules.risk;
  const rows = [
    { id: "objection", rule: "F16 强异议", deduction: risk.objectionDeduction, fieldIds: ["F16", "F15"], condition: "难度、时间或价格异议" },
    { id: "service", rule: "未解决售后", deduction: risk.unresolvedServiceDeduction, fieldIds: ["F15"], condition: "服务问题仍未关闭" },
    { id: "saturation", rule: "触达饱和无响应", deduction: risk.noResponseSaturationDeduction, fieldIds: ["F12", "F16"], condition: "已触达且近7日达到5次仍无回复" },
    { id: "missed", rule: "连续漏学7天", deduction: risk.missedSevenDaysDeduction, fieldIds: ["F06", "F15"], condition: "连续漏学天数大于等于7" }
  ];
  return `<section class="score-toolbar score-toolbar--danger"><div><strong>风险优先级高于分数与销售动作</strong><span>熔断命中后进入H4，销售任务冻结；累计扣分上限 ${risk.maximumDeduction}。</span></div>${renderBadge("danger", "F15优先")}</section>${renderTable({ columns: [{ key: "rule", label: "风险规则" }, { key: "deduction", label: "扣分", format: (value) => `-${value}` }, { key: "fieldIds", label: "字段", trustedHtml: (value) => fieldButtons(value) }, { key: "condition", label: "命中条件" }], rows })}<div class="placement-slot">${renderPlacementPanel("risk-fuse")}</div>`;
}

function updateDraftPoint(groupId, ruleId, points) {
  const rule = Object.values(localDraft.pointRules[groupId] ?? {}).find((candidate) => candidate.id === ruleId);
  if (rule) rule.points = Number(points);
}

function renderTrial(state) {
  const options = (state?.users ?? []).map((user) => `<option value="${escapeAttribute(user.id)}">${escapeHtml(user.childId)} · ${escapeHtml(user.id)}</option>`).join("");
  const editorAvailable = isRuleEditorAvailable(typeof window === "undefined" ? RULE_EDITOR_MIN_WIDTH : window.innerWidth);
  return `<section class="score-toolbar"><div><strong>本地规则草稿</strong><span>只在当前页面内试算，不发布、不修改生产，也不写入用户模拟数据。</span></div><div class="page-actions"><button id="exportRuleDraft" type="button" class="secondary-button">导出草稿 JSON</button><button id="restoreBaselineButton" type="button" class="secondary-button"${editorAvailable ? "" : " disabled"}>${icon("rotate-ccw")}恢复线上基准</button></div></section><p class="desktop-guidance${editorAvailable ? "" : " is-visible"}" role="note">复杂规则编辑请在桌面端完成；手机端可查看评分与任务回写。</p><div class="trial-layout rule-editor${editorAvailable ? "" : " rule-editor--blocked"}"><section class="trial-rules"><header class="analysis-panel__header"><div><p class="section-kicker">可编辑草稿</p><h2>基础分分值</h2></div>${renderBadge("warning", "本地草稿")}</header>${rulesTable(buildBaseRuleRows(localDraft), { editable: true, editorAvailable })}</section><section class="trial-result"><label class="filter-field"><span>试算用户</span><select id="trialUserSelect">${options}</select></label><button id="previewRuleButton" type="button" class="primary-button">${icon("calculator")}预览规则影响</button><div id="rulePreview" aria-live="polite"><p class="empty-copy">选择用户后预览原始/最终基础分、H层级和信号。独立信号不会因基础分草稿被混入。</p></div></section></div>`;
}

function renderTabContent(state) {
  if (activeTab === "uplift") return renderUplift();
  if (activeTab === "signals") return renderSignals();
  if (activeTab === "risk") return renderRisk();
  if (activeTab === "trial") return renderTrial(state);
  return renderBase();
}

function openField(fieldId) {
  const field = FIELD_DEFINITIONS.find((candidate) => candidate.id === fieldId);
  if (!field) return;
  const placement = FIELD_PLACEMENTS[fieldId] ?? "scoring-routing";
  openDrawer({
    title: `${field.id} · ${field.name}`,
    trustedHtml: `<dl class="field-detail"><div><dt>技术字段</dt><dd><code>${escapeHtml(field.technicalField)}</code></dd></div><div><dt>计分角色</dt><dd>${escapeHtml(field.scoreRole)}</dd></div><div><dt>来源 / 刷新</dt><dd>${escapeHtml(field.source)} / ${escapeHtml(field.refresh)}</dd></div><div><dt>负责人</dt><dd>${escapeHtml(field.owner)}</dd></div><div><dt>缺失处理</dt><dd>${escapeHtml(field.missing)}</dd></div></dl>${renderPlacementPanel(placement)}`
  });
}

function previewMarkup(preview) {
  const rows = [
    ["原始基础分", preview.before.rawBaseScore, preview.after.rawBaseScore],
    ["最终基础分", preview.before.baseScore, preview.after.baseScore],
    ["H层级", preview.before.hLevel, preview.after.hLevel],
    ["F13（独立）", preview.before.marketingSignal.level, preview.after.marketingSignal.level],
    ["F14（独立）", preview.before.transactionSignal.priority, preview.after.transactionSignal.priority]
  ];
  return `<div class="rule-preview-grid"><span>指标</span><strong>线上基准</strong><strong>本地草稿</strong>${rows.map(([label, before, after]) => `<span>${escapeHtml(label)}</span><span>${escapeHtml(before)}</span><span class="${before === after ? "" : "is-changed"}">${escapeHtml(after)}</span>`).join("")}</div>`;
}

export function render(container, context) {
  container.innerHTML = `<section class="workbench-header"><div><p class="section-kicker">计分口径、独立信号与本地试算</p><h1>评分中心</h1><p>线上基准只读；规则草稿仅保存在本地页面</p></div>${renderBadge("info", SCORING_RULES.version)}</section><div class="tab-bar" role="tablist" aria-label="评分中心视图">${SCORING_TABS.map((tab) => `<button id="tab-${escapeAttribute(tab.id)}" type="button" role="tab" data-score-tab="${escapeAttribute(tab.id)}" aria-selected="${activeTab === tab.id}" tabindex="${activeTab === tab.id ? "0" : "-1"}">${escapeHtml(tab.label)}</button>`).join("")}</div><section id="scoreTabPanel" class="tab-panel" role="tabpanel" aria-labelledby="tab-${escapeAttribute(activeTab)}">${renderTabContent(context.state)}</section>`;

  const rerender = () => render(container, context);
  container.onclick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tab = target?.closest("[data-score-tab]");
    if (tab) {
      activeTab = tab.dataset.scoreTab;
      rerender();
      return;
    }
    const field = target?.closest("[data-field-id]");
    if (field) {
      openField(field.dataset.fieldId);
      return;
    }
    const placement = target?.closest("[data-placement-id]");
    if (placement) {
      openDrawer({ title: "系统落位", trustedHtml: renderPlacementPanel(placement.dataset.placementId) });
      return;
    }
    if (target?.closest("#restoreBaselineButton")) {
      localDraft = createRuleDraft();
      toast("已恢复线上基准副本，本地草稿未发布。", "success");
      rerender();
      return;
    }
    if (target?.closest("#exportRuleDraft")) {
      downloadFile({ content: ruleDraftJson(), filename: "rline-local-rule-draft.json", type: "application/json;charset=utf-8" });
      toast("已导出本地规则草稿。", "success");
      return;
    }
    if (target?.closest("#previewRuleButton")) {
      const userId = container.querySelector("#trialUserSelect")?.value;
      const root = container.querySelector("#rulePreview");
      if (root && userId) root.innerHTML = previewMarkup(previewRuleDraft(context.state, userId, localDraft));
      refreshIcons();
    }
  };
  container.onchange = (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches(".rule-points-input")) return;
    if (!isRuleEditorAvailable(typeof window === "undefined" ? RULE_EDITOR_MIN_WIDTH : window.innerWidth)) {
      toast("复杂规则编辑请在桌面端完成。", "warning");
      rerender();
      return;
    }
    updateDraftPoint(input.dataset.ruleGroup, input.dataset.ruleId, input.value);
    toast("分值已更新到本地草稿。", "info", 1800);
  };
}
