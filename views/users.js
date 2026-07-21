import { routeUser } from "../core/routing-engine.js";
import { scoreUser } from "../core/scoring-engine.js";
import { importUsers, parseImport, serializeCsv } from "../core/import-export.js";
import {
  downloadFile,
  escapeAttribute,
  escapeHtml,
  openDrawer,
  openModal,
  renderBadge,
  renderPlacementPanel,
  renderTable,
  toast
} from "../ui/components.js";
import { icon, refreshIcons } from "../ui/icons.js";

export const DETAIL_FLOW = Object.freeze(["行为进入", "基础计分", "H层级", "触达准入", "主责团队", "当前任务", "回写", "下次重算"]);

export const USER_PRESETS = Object.freeze({
  "h1-h2": { hLevel: "H1/H2" },
  "h3-uplift": { hLevel: "H3" },
  "h4-risk": { hLevel: "H4", risk: "active" },
  "f14-realtime": { signal: "f14" },
  "f12-blocked": { gate: "blocked" },
  "data-anomaly": { anomaly: "yes" },
  "low-maintenance": { hLevel: "L" }
});

const IMPORT_FIELDS = Object.freeze([
  { key: "user_id", label: "用户统一 ID", required: true, candidates: ["user_id", "id", "external_id"] },
  { key: "child_id", label: "孩子 ID", required: false, candidates: ["child_id", "childId"] },
  { key: "product_type", label: "课程类型", required: true, candidates: ["product_type", "productType", "kind"] },
  { key: "stage_code", label: "生命周期阶段", required: true, candidates: ["stage_code", "stageCode", "stage"] }
]);

let latestImportErrors = [];

export function isDesktopOnlyFeatureAvailable(viewportWidth) {
  return Number(viewportWidth) >= 900;
}

export function mapImportRows(rows, mapping = {}) {
  return (rows ?? []).map((source) => {
    const row = structuredClone(source ?? {});
    for (const field of IMPORT_FIELDS) {
      const sourceKey = mapping[field.key];
      if (sourceKey && Object.hasOwn(row, sourceKey)) row[field.key] = row[sourceKey];
    }
    return row;
  });
}

export function createImportPreview(rows, mapping, existingUsers, duplicateMode = "update") {
  const mappedRows = mapImportRows(rows, mapping);
  const result = importUsers(mappedRows, existingUsers, duplicateMode);
  const failedRows = new Set(result.errors.map((error) => error.row));
  return {
    mappedRows,
    result,
    counts: { success: result.imported, warning: result.skipped.length, failure: failedRows.size }
  };
}

export function userExportJson(users) {
  return `${JSON.stringify(structuredClone(users ?? []), null, 2)}\n`;
}

export function userExportCsv(rows) {
  return serializeCsv((rows ?? []).map((row) => ({
    "用户ID": row.id,
    "孩子ID": row.childId,
    "产品": row.productType,
    "阶段": row.stageCode,
    "最终基础分": row.baseScore,
    "H层级": row.hLevel,
    "F13": row.f13,
    "F14": row.f14,
    "风险": row.riskLabel,
    "F12准入": row.gate,
    "主责": row.owner,
    "当前任务": row.task
  })));
}

export function importErrorCsv(errors = latestImportErrors) {
  return serializeCsv((errors ?? []).map((error) => ({ "行号": error.row ?? "-", "字段": error.field ?? "-", "代码": error.code ?? "IMPORT_ERROR", "说明": error.message ?? "导入失败" })));
}

const SAFE_SIMULATION_FIELDS = Object.freeze({
  courseEvaluationScore: "courseEvaluation.normalizedScore",
  reportOpened: "report.opened",
  reportDwellMinutes: "report.dwellMinutes",
  reportShared: "report.shared",
  parentReplied: "parent.replyStatus",
  couponUnused: "transaction.couponUnused",
  transactionUnpaid: "transaction.unpaid",
  riskFuse: "risk.fuse",
  riskDeduction: "risk.deduction",
  touchTotal7d: "touch.total7d"
});

const activeTask = (state, userId) => (state?.tasks ?? []).find((task) => task.userId === userId && !["done", "closed", "cancelled"].includes(task.status));

function isAnomaly(user) {
  return !user?.id
    || !user?.childId
    || !user?.productType
    || !user?.stageCode
    || user?.learning?.completionRate == null
    || user?.learning?.activeDays7 == null
    || user?.learning?.consecutiveMissedDays == null
    || user?.courseEvaluation == null;
}

function signalLabel(score) {
  const labels = [];
  if ((score?.marketingSignal?.strength ?? 0) > 0) labels.push(`F13 ${score.marketingSignal.level}`);
  if (score?.transactionSignal?.priority) labels.push(`F14 ${score.transactionSignal.priority}`);
  return labels.join(" / ") || "无独立信号";
}

export function buildUserRows(state) {
  const users = new Map((state?.users ?? []).map((user) => [user.id, user]));
  return (state?.scores ?? []).map((score) => {
    const user = users.get(score.userId) ?? {};
    const route = state?.routes?.[score.userId] ?? {};
    const task = activeTask(state, score.userId);
    return {
      id: score.userId,
      childId: user.childId ?? "-",
      searchText: [score.userId, user.childId, user.issueType, route.taskSubtype].filter(Boolean).join(" ").toLowerCase(),
      productType: user.productType ?? "unknown",
      stageCode: user.stageCode ?? "unknown",
      rawBaseScore: score.rawBaseScore,
      baseScore: score.baseScore,
      hLevel: score.hLevel,
      upliftScore: score.upliftScore,
      f13: score.marketingSignal?.level ?? "L0",
      f13Active: (score.marketingSignal?.strength ?? 0) > 0,
      f14: score.transactionSignal?.priority ?? "无",
      f14Active: Boolean(score.transactionSignal?.priority),
      signalLabel: signalLabel(score),
      riskActive: score.risk?.fused === true || (score.risk?.deduction ?? 0) > 0,
      riskLabel: score.risk?.fused ? "熔断" : score.risk?.deduction ? `-${score.risk.deduction}` : "无",
      gate: route.touchGate?.status ?? user.touch?.status ?? "eligible",
      team: route.team ?? "unassigned",
      owner: `${route.team ?? "-"} / ${route.subteam ?? "-"}`,
      task: task?.subtype ?? route.taskSubtype ?? "待生成",
      taskStatus: task?.status ?? (route.touchGate?.status === "blocked" ? "blocked" : "planned"),
      anomaly: isAnomaly(user),
      user,
      score,
      route
    };
  });
}

export function applyUserPreset(filters = {}, preset = "") {
  return { ...filters, ...(USER_PRESETS[preset] ?? {}) };
}

function matchesH(row, value) {
  if (!value) return true;
  if (value === "H1/H2") return row.hLevel === "H1" || row.hLevel === "H2";
  return row.hLevel === value;
}

function matchesSignal(row, value) {
  if (!value) return true;
  if (value === "f13") return row.f13Active;
  if (value === "f14") return row.f14Active;
  if (value === "any") return row.f13Active || row.f14Active;
  if (value === "none") return !row.f13Active && !row.f14Active;
  return true;
}

const SORTERS = Object.freeze({
  "baseScore-desc": (left, right) => right.baseScore - left.baseScore || left.id.localeCompare(right.id),
  "baseScore-asc": (left, right) => left.baseScore - right.baseScore || left.id.localeCompare(right.id),
  "uplift-desc": (left, right) => right.upliftScore - left.upliftScore || left.id.localeCompare(right.id),
  "hLevel-asc": (left, right) => ["H1", "H2", "H3", "H4", "L"].indexOf(left.hLevel) - ["H1", "H2", "H3", "H4", "L"].indexOf(right.hLevel) || left.id.localeCompare(right.id),
  "user-asc": (left, right) => left.childId.localeCompare(right.childId)
});

export function filterUserRows(rows, filters = {}, sort = "baseScore-desc") {
  const text = String(filters.text ?? "").trim().toLowerCase();
  return rows.filter((row) => (
    (!text || row.searchText.includes(text))
      && (!filters.productType || row.productType === filters.productType)
      && (!filters.stageCode || row.stageCode === filters.stageCode)
      && matchesH(row, filters.hLevel)
      && matchesSignal(row, filters.signal)
      && (!filters.risk || (filters.risk === "active" ? row.riskActive : !row.riskActive))
      && (!filters.gate || row.gate === filters.gate)
      && (!filters.team || row.team === filters.team)
      && (!filters.anomaly || (filters.anomaly === "yes" ? row.anomaly : !row.anomaly))
  )).sort(SORTERS[sort] ?? SORTERS["baseScore-desc"]);
}

function updatedAtFor(user, item, fallback) {
  const fields = new Set(item.fieldIds ?? []);
  if ([...fields].some((id) => ["F04", "F05", "F06"].includes(id))) return user.learning?.observedAt ?? fallback;
  if (fields.has("F07")) return user.courseEvaluation?.observedAt ?? fallback;
  if (fields.has("F08")) return user.assessment?.observedAt ?? fallback;
  if (fields.has("F09")) return user.report?.generatedAt ?? fallback;
  if (fields.has("F14")) return user.transaction?.observedAt ?? fallback;
  return user.taskFeedback?.nextFollowUpAt ?? fallback;
}

function actualText(actual) {
  if (actual == null) return "未提供";
  if (typeof actual === "object") return JSON.stringify(actual);
  if (typeof actual === "boolean") return actual ? "是" : "否";
  return String(actual);
}

export function buildUserDetailModel(state, userId) {
  const user = (state?.users ?? []).find((candidate) => candidate.id === userId);
  if (!user) return null;
  const score = (state?.scores ?? []).find((candidate) => candidate.userId === userId) ?? scoreUser(user);
  const route = state?.routes?.[userId] ?? routeUser(user, score);
  const task = activeTask(state, userId);
  const baseFieldIds = [...new Set(Object.values(score.dimensions).flatMap(({ items }) => items.flatMap(({ fieldIds }) => fieldIds)).filter((id) => !["F12", "F13", "F14", "F15"].includes(id)))];
  const scoringRows = Object.values(score.dimensions).flatMap((dimension) => dimension.items.map((item) => ({
    id: item.ruleId,
    dimension: dimension.label,
    label: item.label,
    actual: actualText(item.actual),
    points: item.points,
    fieldIds: item.fieldIds,
    window: item.window,
    status: item.status,
    updatedAt: updatedAtFor(user, item, state?.generatedAt ?? "-")
  })));
  return {
    user,
    score,
    route,
    task,
    scoringRows,
    scoreGroups: [
      { id: "base", label: "基础高优分", value: `${score.rawBaseScore} / ${score.baseScore}`, meta: "原始 / 风险调整后", fieldIds: baseFieldIds },
      { id: "f13", label: "F13 营销意向（独立）", value: score.marketingSignal.level, meta: score.marketingSignal.reasons.join("；") || "无营销事件", fieldIds: ["F13"] },
      { id: "f14", label: "F14 交易状态（独立）", value: score.transactionSignal.priority ?? "无", meta: score.transactionSignal.reasons.join("；"), fieldIds: ["F14"] },
      { id: "f12", label: "F12 触达准入", value: route.touchGate.status, meta: route.touchGate.reason, fieldIds: ["F12"] },
      { id: "risk", label: "风险与熔断", value: score.risk.fused ? "熔断" : `扣 ${score.risk.deduction} 分`, meta: score.risk.reasons.map(({ label }) => label).join("；") || "未命中风险", fieldIds: ["F15"] }
    ]
  };
}

function setNested(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] = cursor[part] && typeof cursor[part] === "object" ? cursor[part] : {};
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
}

function normalizeSimulationValue(field, value) {
  if (field === "parentReplied") return value ? "replied" : "unreached";
  if (["courseEvaluationScore", "reportDwellMinutes", "riskDeduction", "touchTotal7d"].includes(field)) return Number(value);
  return value;
}

export function diffSimulationValues(user, values = {}) {
  const current = {
    courseEvaluationScore: user?.courseEvaluation?.normalizedScore ?? null,
    reportOpened: Boolean(user?.report?.opened),
    reportDwellMinutes: Number(user?.report?.dwellMinutes ?? 0),
    reportShared: Boolean(user?.report?.shared),
    parentReplied: user?.parent?.replyStatus === "replied",
    couponUnused: Boolean(user?.transaction?.couponUnused),
    transactionUnpaid: Boolean(user?.transaction?.unpaid),
    riskFuse: Boolean(user?.risk?.fuse),
    riskDeduction: Number(user?.risk?.deduction ?? 0),
    touchTotal7d: Number(user?.touch?.total7d ?? 0)
  };
  return Object.fromEntries(Object.entries(values).flatMap(([field, value]) => {
    if (!Object.hasOwn(SAFE_SIMULATION_FIELDS, field)) throw new Error(`Unsupported simulation field: ${field}`);
    if (field === "courseEvaluationScore" && (value == null || value === "")) return [];
    const normalized = ["courseEvaluationScore", "reportDwellMinutes", "riskDeduction", "touchTotal7d"].includes(field)
      ? Number(value)
      : Boolean(value);
    return Object.is(normalized, current[field]) ? [] : [[field, normalized]];
  }));
}

function synchronizeSimulationState(user, changes) {
  if (Object.hasOwn(changes, "courseEvaluationScore")) {
    user.courseEvaluation = user.courseEvaluation ?? { sourceScale: 5, window: "最近课程节点", source: "simulation" };
    user.courseEvaluation.score = Math.round((Number(changes.courseEvaluationScore) / 20) * 100) / 100;
  }
  if (Object.hasOwn(changes, "reportOpened")) user.report.status = changes.reportOpened ? "opened" : "generated";
  if (Object.hasOwn(changes, "couponUnused") || Object.hasOwn(changes, "transactionUnpaid")) {
    user.transaction.paymentFailed = false;
    user.transaction.status = user.transaction.unpaid ? "unpaid" : user.transaction.couponUnused ? "coupon-unused" : "none";
  }
  if (Object.hasOwn(changes, "riskFuse") && changes.riskFuse === false) user.risk.type = null;
}

export function previewSimulation(state, userId, changes = {}) {
  const user = (state?.users ?? []).find((candidate) => candidate.id === userId);
  if (!user) throw new Error(`Unknown user: ${userId}`);
  const simulatedUser = structuredClone(user);
  Object.entries(changes).forEach(([field, value]) => {
    const path = SAFE_SIMULATION_FIELDS[field];
    if (!path) throw new Error(`Unsupported simulation field: ${field}`);
    setNested(simulatedUser, path, normalizeSimulationValue(field, value));
  });
  synchronizeSimulationState(simulatedUser, changes);
  const beforeScore = (state?.scores ?? []).find((score) => score.userId === userId) ?? scoreUser(user);
  const beforeRoute = state?.routes?.[userId] ?? routeUser(user, beforeScore);
  const afterScore = scoreUser(simulatedUser);
  const afterRoute = routeUser(simulatedUser, afterScore);
  return {
    userId,
    changes: structuredClone(changes),
    simulatedUser,
    before: { score: structuredClone(beforeScore), route: structuredClone(beforeRoute), task: activeTask(state, userId) ?? null },
    after: { score: afterScore, route: afterRoute, task: { priority: afterRoute.priority, subtype: afterRoute.taskSubtype, team: afterRoute.team } }
  };
}

export function applySimulation(store, userId, changes) {
  const preview = previewSimulation(store.getState(), userId, changes);
  store.update((state) => ({
    ...state,
    users: state.users.map((user) => user.id === userId ? preview.simulatedUser : user)
  }));
  return preview;
}

export function createSimulationConfirmation({ store, userId, changes, apply = applySimulation }) {
  let settled = false;
  return {
    cancel() {
      if (settled) return false;
      settled = true;
      return false;
    },
    confirm() {
      if (settled) return false;
      settled = true;
      apply(store, userId, changes);
      return true;
    }
  };
}

function option(value, label, selected) {
  return `<option value="${escapeAttribute(value)}"${selected === value ? " selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderFilterSelect(id, label, values, selected = "") {
  return `<label class="filter-field"><span>${escapeHtml(label)}</span><select id="${escapeAttribute(id)}">${option("", "全部", selected)}${values.map(([value, text]) => option(value, text, selected)).join("")}</select></label>`;
}

function scoreTone(level) {
  if (level === "H4") return "danger";
  if (level === "H1" || level === "H2") return "success";
  if (level === "H3") return "warning";
  return "neutral";
}

function renderUserTable(rows) {
  return renderTable({
    caption: `当前结果 ${rows.length} 人`,
    columns: [
      { key: "childId", label: "用户 / 孩子", className: "col-user", trustedHtml: (_, row) => `<button type="button" class="table-link" data-user-id="${escapeAttribute(row.id)}"><strong>${escapeHtml(row.childId)}</strong><small>${escapeHtml(row.id)}</small></button>` },
      { key: "productType", label: "产品 / 阶段", className: "col-product", trustedHtml: (_, row) => `<span class="stacked-cell"><strong>${escapeHtml(row.productType)}</strong><small>${escapeHtml(row.stageCode)}</small></span>` },
      { key: "baseScore", label: "原始 / 最终基础分", className: "col-score", trustedHtml: (_, row) => `<span class="score-pair"><strong>${row.rawBaseScore}</strong><i aria-hidden="true">/</i><strong>${row.baseScore}</strong></span>` },
      { key: "hLevel", label: "H", className: "col-h", trustedHtml: (value) => renderBadge(scoreTone(value), value) },
      { key: "upliftScore", label: "提分", className: "col-number" },
      { key: "f13", label: "F13", className: "col-signal", trustedHtml: (value, row) => renderBadge(row.f13Active ? "info" : "neutral", value) },
      { key: "f14", label: "F14", className: "col-signal", trustedHtml: (value, row) => renderBadge(row.f14Active ? "warning" : "neutral", value) },
      { key: "riskLabel", label: "风险", className: "col-risk", trustedHtml: (value, row) => renderBadge(row.riskActive ? "danger" : "success", value) },
      { key: "gate", label: "F12", className: "col-gate", trustedHtml: (value) => renderBadge(value === "blocked" ? "danger" : value === "queued" ? "warning" : "success", value) },
      { key: "owner", label: "前台主责", className: "col-owner" },
      { key: "task", label: "当前任务", className: "col-task" },
      { key: "id", label: "操作", className: "col-action", trustedHtml: (value) => `<button type="button" class="compact-button" data-user-id="${escapeAttribute(value)}">查看</button>` }
    ],
    rows,
    emptyText: "没有符合当前条件的用户"
  });
}

function renderFlow(model) {
  const values = [
    model.user.issueType ?? "行为事件",
    `${model.score.rawBaseScore} -> ${model.score.baseScore}`,
    model.score.hLevel,
    model.route.touchGate.status,
    `${model.route.team}/${model.route.subteam}`,
    model.task?.subtype ?? model.route.taskSubtype,
    model.user.taskFeedback?.replyStatus ?? "待回写",
    model.user.taskFeedback?.nextFollowUpAt ?? "次日批次"
  ];
  return `<ol class="detail-flow">${DETAIL_FLOW.map((label, index) => `<li><span>${index + 1}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(values[index] ?? "-")}</small></li>`).join("")}</ol>`;
}

function renderScoreGroups(model) {
  return `<section class="signal-separation" aria-label="分数、独立信号与准入分栏">${model.scoreGroups.map((group) => `<div class="signal-group signal-group--${escapeAttribute(group.id)}"><span>${escapeHtml(group.label)}</span><strong>${escapeHtml(group.value)}</strong><small>${escapeHtml(group.meta)}</small></div>`).join("")}</section>`;
}

function renderScoringRows(model) {
  return renderTable({
    columns: [
      { key: "dimension", label: "维度", className: "col-dimension" },
      { key: "label", label: "计分项", className: "col-rule" },
      { key: "actual", label: "实际值", className: "col-actual" },
      { key: "points", label: "得分", className: "col-number" },
      { key: "fieldIds", label: "字段", className: "col-fields", format: (value) => value.join(", ") },
      { key: "window", label: "观察窗口", className: "col-window" },
      { key: "status", label: "状态", className: "col-status", trustedHtml: (value) => renderBadge(value === "matched" ? "success" : value === "not-applicable" ? "neutral" : "info", value) },
      { key: "updatedAt", label: "更新时间", className: "col-updated" }
    ],
    rows: model.scoringRows,
    emptyText: "暂无逐项计分证据"
  });
}

function simulationForm(model) {
  const user = model.user;
  return `<form id="simulationForm" class="simulation-form"><p class="local-notice">仅修改浏览器内模拟数据。预览不会写入状态，应用前会再次确认。</p><div class="simulation-grid"><label><span>课程评价（0-100）</span><input name="courseEvaluationScore" type="number" min="0" max="100" step="1" value="${escapeAttribute(user.courseEvaluation?.normalizedScore ?? "")}"></label><label><span>报告状态</span><select name="reportOpened">${option("true", "已打开", String(Boolean(user.report?.opened)))}${option("false", "未打开", String(Boolean(user.report?.opened)))}</select></label><label><span>报告停留（分钟）</span><input name="reportDwellMinutes" type="number" min="0" max="180" step="0.5" value="${escapeAttribute(user.report?.dwellMinutes ?? 0)}"></label><label class="check-field"><input name="reportShared" type="checkbox"${user.report?.shared ? " checked" : ""}><span>报告已分享</span></label><label class="check-field"><input name="parentReplied" type="checkbox"${user.parent?.replyStatus === "replied" ? " checked" : ""}><span>家长已回复</span></label><label class="check-field"><input name="couponUnused" type="checkbox"${user.transaction?.couponUnused ? " checked" : ""}><span>领券未用</span></label><label class="check-field"><input name="transactionUnpaid" type="checkbox"${user.transaction?.unpaid ? " checked" : ""}><span>待付款</span></label><label class="check-field"><input name="riskFuse" type="checkbox"${user.risk?.fuse ? " checked" : ""}><span>风险熔断</span></label><label><span>风险扣分</span><input name="riskDeduction" type="number" min="0" max="30" step="5" value="${escapeAttribute(user.risk?.deduction ?? 0)}"></label><label><span>近7日触达次数</span><input name="touchTotal7d" type="number" min="0" max="30" step="1" value="${escapeAttribute(user.touch?.total7d ?? 0)}"></label></div><div class="form-actions"><button type="submit" class="primary-button">${icon("refresh-cw")}预览重算</button></div><div id="simulationPreview" aria-live="polite"></div></form>`;
}

function readSimulationForm(form) {
  const data = new FormData(form);
  return {
    courseEvaluationScore: data.get("courseEvaluationScore") === "" ? null : Number(data.get("courseEvaluationScore")),
    reportOpened: data.get("reportOpened") === "true",
    reportDwellMinutes: Number(data.get("reportDwellMinutes")),
    reportShared: data.has("reportShared"),
    parentReplied: data.has("parentReplied"),
    couponUnused: data.has("couponUnused"),
    transactionUnpaid: data.has("transactionUnpaid"),
    riskFuse: data.has("riskFuse"),
    riskDeduction: Number(data.get("riskDeduction")),
    touchTotal7d: Number(data.get("touchTotal7d"))
  };
}

function diffMarkup(preview) {
  const rows = [
    ["原始基础分", preview.before.score.rawBaseScore, preview.after.score.rawBaseScore],
    ["最终基础分", preview.before.score.baseScore, preview.after.score.baseScore],
    ["H层级", preview.before.score.hLevel, preview.after.score.hLevel],
    ["F13", preview.before.score.marketingSignal.level, preview.after.score.marketingSignal.level],
    ["F14", preview.before.score.transactionSignal.priority, preview.after.score.transactionSignal.priority],
    ["F12", preview.before.route.touchGate.status, preview.after.route.touchGate.status],
    ["主责", `${preview.before.route.team}/${preview.before.route.subteam}`, `${preview.after.route.team}/${preview.after.route.subteam}`],
    ["任务", preview.before.route.taskSubtype, preview.after.route.taskSubtype]
  ];
  return `<section class="simulation-preview"><h3>重算预览</h3><div class="diff-grid"><span>指标</span><strong>调整前</strong><strong>调整后</strong>${rows.map(([label, before, after]) => `<span>${escapeHtml(label)}</span><span>${escapeHtml(before)}</span><span class="${before === after ? "" : "is-changed"}">${escapeHtml(after)}</span>`).join("")}</div><button id="applySimulationButton" type="button" class="primary-button">应用到模拟数据</button></section>`;
}

function openSimulation(model, context) {
  let latestPreview = null;
  openModal({
    title: `行为模拟 · ${model.user.childId}`,
    size: "wide",
    trustedHtml: simulationForm(model)
  });
  const form = document.getElementById("simulationForm");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const changes = diffSimulationValues(model.user, readSimulationForm(form));
    latestPreview = previewSimulation(context.store.getState(), model.user.id, changes);
    const root = document.getElementById("simulationPreview");
    if (root) root.innerHTML = diffMarkup(latestPreview);
    refreshIcons();
  });
  document.getElementById("simulationPreview")?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("#applySimulationButton") || !latestPreview) return;
    const confirmation = createSimulationConfirmation({ store: context.store, userId: model.user.id, changes: latestPreview.changes });
    const close = openModal({
      title: "确认应用模拟变更",
      trustedHtml: `<p>此次操作只写入当前浏览器的模拟数据，并可通过顶部撤销按钮回退。</p><div class="form-actions"><button id="cancelSimulationButton" type="button" class="secondary-button">取消</button><button id="confirmSimulationButton" type="button" class="danger-button">确认应用</button></div>`
    });
    document.getElementById("cancelSimulationButton")?.addEventListener("click", () => {
      confirmation.cancel();
      close();
    });
    document.getElementById("confirmSimulationButton")?.addEventListener("click", () => {
      if (!confirmation.confirm()) return;
      close({ restoreFocus: false });
      toast("模拟行为已应用，评分与路由已重新计算。", "success");
    });
  });
}

function openUserDetail(userId, context) {
  const model = buildUserDetailModel(context.store.getState(), userId);
  if (!model) return;
  const routeTrace = model.route.trace.map((step) => `<li><strong>${escapeHtml(step.label)}</strong><span>${escapeHtml(step.value)}</span><small>${escapeHtml(step.decision)}</small></li>`).join("");
  openDrawer({
    title: `${model.user.childId} · 用户详情`,
    size: "wide",
    trustedHtml: `<div class="detail-toolbar"><div><strong>${escapeHtml(model.user.id)}</strong><span>${escapeHtml(model.user.productType)} / ${escapeHtml(model.user.stageCode)}</span></div><button id="openSimulationButton" type="button" class="primary-button">${icon("flask-conical")}行为模拟</button></div>${renderFlow(model)}${renderScoreGroups(model)}<section class="drawer-section"><header><h3>逐项计分证据</h3><span>${model.scoringRows.length} 项</span></header>${renderScoringRows(model)}</section><section class="drawer-section"><header><h3>路由判定轨迹</h3><span>${escapeHtml(model.route.priority)} / ${escapeHtml(model.route.slaHours)}h</span></header><ol class="route-trace">${routeTrace}</ol></section><section class="drawer-section"><header><h3>系统落位</h3></header>${renderPlacementPanel("scoring-routing")}</section>`
  });
  document.getElementById("openSimulationButton")?.addEventListener("click", () => openSimulation(model, context));
  refreshIcons();
}

function importErrorMarkup(errors) {
  if (!errors?.length) return "";
  return `<section class="import-errors" aria-live="assertive"><h3>行错误</h3><ul>${errors.map((error) => `<li>第 ${escapeHtml(error.row ?? "-")} 行：${escapeHtml(error.message ?? error.code ?? "解析失败")}</li>`).join("")}</ul></section>`;
}

function importWizardMarkup(state, context) {
  const sources = [...new Set((state.rows ?? []).flatMap((row) => Object.keys(row ?? {})))];
  const mappingReady = IMPORT_FIELDS.filter((field) => field.required).every((field) => state.mapping[field.key]);
  const preview = state.preview;
  const steps = ["选择文件", "字段映射", "校验预览", "确认导入"];
  const stepper = `<ol class="import-steps" aria-label="导入步骤">${steps.map((label, index) => `<li class="${state.step === index + 1 ? "is-current" : state.step > index + 1 ? "is-complete" : ""}"${state.step === index + 1 ? ' aria-current="step"' : ""}><span>${index + 1}</span>${escapeHtml(label)}</li>`).join("")}</ol>`;
  const warning = `<p class="import-warning" role="note">仅可导入模拟或脱敏数据；请勿导入真实的敏感用户数据。文件仅在当前浏览器内解析，不会上传。</p>`;
  let body = "";
  if (state.step === 1) {
    body = `<label class="file-dropzone"><span>CSV 或 JSON 文件</span><input id="importFileInput" type="file" accept=".csv,.json,text/csv,application/json" aria-describedby="importFileHint"${state.loading ? " disabled" : ""}><small id="importFileHint" role="status">${state.loading ? "正在本地解析文件…" : state.fileName ? `已读取：${escapeHtml(state.fileName)}，${state.rows.length} 行` : "选择本地文件后解析，不会发送到任何服务器。"}</small></label>${importErrorMarkup(state.errors)}`;
  } else if (state.step === 2) {
    body = `<div class="import-mapping">${IMPORT_FIELDS.map((field) => {
      const value = state.mapping[field.key] ?? "";
      return `<label class="feedback-field"><span>${escapeHtml(field.label)}${field.required ? "（必填）" : "（可选）"}</span><select data-import-map="${escapeAttribute(field.key)}"><option value="">不映射</option>${sources.map((source) => `<option value="${escapeAttribute(source)}"${source === value ? " selected" : ""}>${escapeHtml(source)}</option>`).join("")}</select></label>`;
    }).join("")}</div><label class="feedback-field"><span>重复用户</span><select id="duplicateMode"><option value="update"${state.duplicateMode === "update" ? " selected" : ""}>更新已有用户</option><option value="skip"${state.duplicateMode === "skip" ? " selected" : ""}>跳过已有用户</option></select></label>${mappingReady ? "" : `<p class="form-error" role="alert">请映射用户统一 ID、课程类型和生命周期阶段。</p>`}`;
  } else if (state.step === 3) {
    body = `<section class="import-summary" aria-live="polite"><div><strong>${preview.counts.success}</strong><span>成功</span></div><div><strong>${preview.counts.warning}</strong><span>警告 / 跳过</span></div><div><strong>${preview.counts.failure}</strong><span>失败</span></div></section><p class="local-notice">失败行不会导入，当前用户数据保持不变。${state.duplicateMode === "update" ? "重复用户将更新。" : "重复用户将跳过。"}</p>${importErrorMarkup(preview.result.errors)}${preview.result.skipped.length ? `<p class="local-notice">已跳过重复行：${escapeHtml(preview.result.skipped.map((item) => `${item.row}/${item.userId}`).join("，"))}</p>` : ""}`;
  } else {
    body = `<section class="import-summary" aria-live="polite"><div><strong>${preview.counts.success}</strong><span>待导入</span></div><div><strong>${preview.counts.warning}</strong><span>待跳过</span></div><div><strong>${preview.counts.failure}</strong><span>失败行</span></div></section><p>确认后仅将通过校验的模拟数据写入当前浏览器；可通过顶部撤销按钮回退。</p>${importErrorMarkup(preview.result.errors)}`;
  }
  const previous = state.step > 1 ? `<button type="button" class="secondary-button" data-import-back>上一步</button>` : "";
  const nextLabel = state.step === 4 ? "确认导入" : "下一步";
  const disabled = (state.step === 1 && !state.rows) || (state.step === 2 && !mappingReady) || (state.step === 3 && !preview);
  return `${stepper}${warning}<div class="import-wizard__body">${body}</div><div class="form-actions">${previous}<button type="button" class="primary-button" data-import-next${disabled ? " disabled" : ""}>${nextLabel}</button></div>`;
}

function defaultMapping(rows) {
  const keys = new Set((rows ?? []).flatMap((row) => Object.keys(row ?? {})));
  return Object.fromEntries(IMPORT_FIELDS.map((field) => [field.key, field.candidates.find((candidate) => keys.has(candidate)) ?? ""]));
}

function openImportWizard(context) {
  if (typeof window !== "undefined" && !isDesktopOnlyFeatureAvailable(window.innerWidth)) {
    openModal({ title: "批量导入需要桌面端", content: "手机端保留总控、用户、任务和任务回写。为避免字段映射和行错误难以核对，请在桌面端完成批量导入。" });
    return;
  }
  const state = { step: 1, fileName: "", type: "", rows: null, mapping: {}, duplicateMode: "update", preview: null, errors: [], loading: false };
  const close = openModal({ title: "本地批量导入", size: "wide", trustedHtml: "" });
  const panel = document.querySelector("#modalRoot .overlay-panel");
  const renderWizard = () => {
    const root = panel?.querySelector(".overlay-panel__body");
    if (!root) return;
    root.innerHTML = importWizardMarkup(state, context);
    root.querySelector("#importFileInput")?.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const type = file.name.toLowerCase().endsWith(".csv") ? "csv" : file.name.toLowerCase().endsWith(".json") ? "json" : "";
      state.loading = true;
      renderWizard();
      try {
        if (!type) throw new TypeError("仅支持 CSV 或 JSON 文件");
        const rows = parseImport(await file.text(), type);
        state.fileName = file.name;
        state.type = type;
        state.rows = rows;
        state.mapping = defaultMapping(rows);
        state.preview = null;
        state.errors = [];
      } catch (error) {
        state.rows = null;
        state.preview = null;
        state.errors = [{ row: "-", field: "file", code: "PARSE_FAILED", message: error.message || "文件解析失败" }];
        latestImportErrors = structuredClone(state.errors);
      }
      state.loading = false;
      renderWizard();
    });
    root.querySelectorAll("[data-import-map]").forEach((select) => select.addEventListener("change", (event) => {
      state.mapping[event.currentTarget.dataset.importMap] = event.currentTarget.value;
      state.preview = null;
      renderWizard();
    }));
    root.querySelector("#duplicateMode")?.addEventListener("change", (event) => {
      state.duplicateMode = event.currentTarget.value;
      state.preview = null;
      renderWizard();
    });
    root.querySelector("[data-import-back]")?.addEventListener("click", () => { state.step -= 1; renderWizard(); });
    root.querySelector("[data-import-next]")?.addEventListener("click", () => {
      if (state.step === 2) state.preview = createImportPreview(state.rows, state.mapping, context.store.getState().users, state.duplicateMode);
      if (state.step === 4) {
        const result = context.store.importRows(state.preview.mappedRows, state.duplicateMode);
        latestImportErrors = structuredClone(result.errors);
        close({ restoreFocus: false });
        toast(`已导入 ${result.imported} 行，跳过 ${result.skipped.length} 行。`, result.errors.length ? "warning" : "success");
        return;
      }
      state.step += 1;
      renderWizard();
    });
  };
  renderWizard();
}

let filters = {};
let sortOrder = "baseScore-desc";

export function render(container, context) {
  const incomingPreset = context.routeParams?.preset;
  if (incomingPreset) filters = applyUserPreset({}, incomingPreset);
  const allRows = buildUserRows(context.state);
  const stages = [...new Set(allRows.map(({ stageCode }) => stageCode))].sort();
  const teams = [...new Set(allRows.map(({ team }) => team))].sort();

  let visibleRows = [];
  const rerenderResults = () => {
    const results = container.querySelector("#userResults");
    if (!results) return;
    const rows = filterUserRows(allRows, filters, sortOrder);
    visibleRows = rows;
    results.innerHTML = rows.length
      ? renderUserTable(rows)
      : `<div class="empty-state"><div>${icon("search-x")}</div><h2>没有符合条件的用户</h2><p>清除筛选后可返回完整用户池。</p><button id="emptyClearFilters" type="button" class="secondary-button">清除筛选</button></div>`;
    refreshIcons();
  };

  container.innerHTML = `<section class="workbench-header"><div><p class="section-kicker">用户证据、分层和动作记录</p><h1>用户中心</h1><p>共 ${allRows.length} 名模拟用户，独立信号不计入基础分</p></div><div class="page-actions">${renderBadge("info", "模拟数据")}<button id="openImportWizard" type="button" class="primary-button">本地导入</button><button id="exportCurrentUsers" type="button" class="secondary-button">用户 JSON</button><button id="exportFilteredUsers" type="button" class="secondary-button">筛选 CSV</button><button id="exportImportErrors" type="button" class="secondary-button">错误 CSV</button></div></section><section class="filter-band" aria-label="用户筛选"><label class="filter-field filter-field--search"><span>搜索</span><div class="input-with-icon">${icon("search")}<input id="userSearch" type="search" value="${escapeAttribute(filters.text ?? "")}" placeholder="用户、孩子、问题或任务"></div></label>${renderFilterSelect("productFilter", "产品", [["monthly", "月课"], ["annual", "年课"]], filters.productType)}${renderFilterSelect("stageFilter", "生命周期", stages.map((stage) => [stage, stage]), filters.stageCode)}${renderFilterSelect("hFilter", "H层级", [["H1/H2", "H1/H2"], ["H1", "H1"], ["H2", "H2"], ["H3", "H3"], ["H4", "H4"], ["L", "L"]], filters.hLevel)}${renderFilterSelect("signalFilter", "独立信号", [["any", "F13/F14任一"], ["f13", "F13营销"], ["f14", "F14交易"], ["none", "无信号"]], filters.signal)}${renderFilterSelect("riskFilter", "风险", [["active", "有风险"], ["clear", "无风险"]], filters.risk)}${renderFilterSelect("gateFilter", "F12准入", [["eligible", "可触达"], ["queued", "排队"], ["blocked", "阻断"]], filters.gate)}${renderFilterSelect("teamFilter", "主责团队", teams.map((team) => [team, team]), filters.team)}${renderFilterSelect("sortSelect", "排序", [["baseScore-desc", "最终基础分降序"], ["baseScore-asc", "最终基础分升序"], ["uplift-desc", "提分潜力降序"], ["hLevel-asc", "H层级"], ["user-asc", "孩子ID"]], sortOrder)}<button id="clearFilters" type="button" class="icon-button" aria-label="清除筛选" title="清除筛选">${icon("filter-x")}</button></section><div id="userResults"></div>`;

  rerenderResults();
  const controlMap = {
    userSearch: "text",
    productFilter: "productType",
    stageFilter: "stageCode",
    hFilter: "hLevel",
    signalFilter: "signal",
    riskFilter: "risk",
    gateFilter: "gate",
    teamFilter: "team"
  };
  Object.entries(controlMap).forEach(([id, key]) => {
    container.querySelector(`#${id}`)?.addEventListener(id === "userSearch" ? "input" : "change", (event) => {
      filters = { ...filters, [key]: event.target.value };
      rerenderResults();
    });
  });
  container.querySelector("#sortSelect")?.addEventListener("change", (event) => {
    sortOrder = event.target.value;
    rerenderResults();
  });
  const clear = () => {
    filters = {};
    sortOrder = "baseScore-desc";
    render(container, { ...context, routeParams: {} });
  };
  container.querySelector("#clearFilters")?.addEventListener("click", clear);
  container.onclick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("#openImportWizard")) return openImportWizard(context);
    if (target?.closest("#exportCurrentUsers")) {
      downloadFile({ content: userExportJson(context.store.getState().users), filename: "rline-current-users.json", type: "application/json;charset=utf-8" });
      return toast("已导出当前用户 JSON。", "success");
    }
    if (target?.closest("#exportFilteredUsers")) {
      downloadFile({ content: `\uFEFF${userExportCsv(visibleRows)}`, filename: "rline-filtered-users.csv", type: "text/csv;charset=utf-8" });
      return toast(`已导出 ${visibleRows.length} 名筛选用户。`, "success");
    }
    if (target?.closest("#exportImportErrors")) {
      downloadFile({ content: `\uFEFF${importErrorCsv()}`, filename: "rline-latest-import-errors.csv", type: "text/csv;charset=utf-8" });
      return toast("已导出最新导入错误报告。", "success");
    }
    if (target?.closest("#emptyClearFilters")) clear();
    const userButton = target?.closest("[data-user-id]");
    if (userButton) openUserDetail(userButton.dataset.userId, context);
  };
}
