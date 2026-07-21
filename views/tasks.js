import { FEEDBACK_OPTIONS } from "../core/store.js";
import { selectTasksForRole } from "../core/selectors.js";
import { serializeCsv } from "../core/import-export.js";
import { downloadFile, escapeAttribute, escapeHtml, formatDisplayValue, iconButton, openDrawer, renderBadge, renderTable, toast } from "../ui/components.js";
import { icon, refreshIcons } from "../ui/icons.js";

const ROLE_COPY = Object.freeze({
  strategy: "全量任务；可模拟改派，不改变路由规则。",
  agent: "模板服务和待升级任务；不绑定用户。",
  learning: "售后、干预、规划的无绑定文字/电话队列。",
  sales: "续费窗口的绑定用户，承接月转年、年转年全部文字/电话记录。"
});

const LABELS = Object.freeze({
  contactStatus: { reached: "已触达", unreached: "未触达", "not-contacted": "未触达结果" },
  responseStatus: { replied: "已回复", unresolved: "未解决", "no-response": "无回复", "not-applicable": "不适用" },
  intentStatus: { none: "无意向", considering: "考虑中", ready: "准备购买", declined: "明确拒绝" },
  objectionType: { none: "无异议", difficulty: "难度", time: "时间", price: "价格", service: "服务" },
  riskChange: { unchanged: "无变化", escalated: "升级风险", resolved: "风险解除" },
  nextAction: { "send-report-explanation": "发送报告解读", "learning-plan": "制定学习规划", "send-payment-link": "发送支付链接", "service-repair": "服务修复", "wait-window": "等待触达窗口" },
  finalResult: { "follow-up": "继续跟进", resolved: "已解决", converted: "已转化", "closed-lost": "关闭失单" }
});

const ROLE_ASSIGNMENTS = Object.freeze({
  agent: new Set(["agent"]),
  learning: new Set(["learning", "after-sales", "learning-intervention", "learning-planning"]),
  sales: new Set(["sales"])
});

const FROZEN_REPAIR_FEEDBACK_OPTIONS = Object.freeze({
  contactStatus: FEEDBACK_OPTIONS.contactStatus,
  responseStatus: FEEDBACK_OPTIONS.responseStatus,
  riskChange: FEEDBACK_OPTIONS.riskChange,
  nextAction: ["service-repair"],
  finalResult: ["follow-up", "resolved"]
});

export const STRICT_ISO_HTML_PATTERN = String.raw`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|\+\d{2}:\d{2}|-\d{2}:\d{2})`;

function assignmentValues(task) {
  return [task?.assigneeTeam, task?.subteam, task?.role]
    .filter((value) => typeof value === "string" && value.length > 0);
}

function hasExplicitAssignment(task) {
  return task?.virtual !== true && assignmentValues(task).length > 0;
}

function isAssignedToRole(task, role) {
  return assignmentValues(task).some((value) => ROLE_ASSIGNMENTS[role]?.has(value));
}

function fallbackMatchesRole(row, role) {
  if (role === "agent") return row.route.team === "agent" || row.task.status === "escalation";
  if (role === "learning") return row.route.team === "learning" && row.route.bindingMode === "unbound";
  return row.route.team === "sales" && row.route.bindingMode === "bound";
}

function supportOwner(route) {
  return route.supportTeam && route.supportSubteam ? `${route.supportTeam}/${route.supportSubteam}` : null;
}

function isFrozenRepair(route, score) {
  return route.salesFrozen === true
    || route.hLevel === "H4"
    || score.hLevel === "H4"
    || score.risk?.salesFrozen === true;
}

function activeTask(tasks, userId) {
  return tasks.find((task) => task.userId === userId && !["done", "closed", "cancelled"].includes(task.status));
}

function virtualTask(user, route) {
  return { id: `route-${user.id}`, userId: user.id, category: route.taskCategory, subtype: route.taskSubtype, priority: route.priority, status: route.touchGate?.status === "blocked" ? "blocked" : "planned", assigneeTeam: route.team, channel: route.channel, virtual: true };
}

export function buildRoleTaskRows(state, role) {
  const explicitTasks = selectTasksForRole(state, { team: null });
  const scoreById = new Map((state.scores ?? []).map((score) => [score.userId, score]));
  const rows = (state.users ?? []).map((user) => {
    const route = state.routes?.[user.id] ?? {};
    const assignedTask = activeTask(explicitTasks, user.id);
    const assignedOrVirtualTask = assignedTask ? { ...assignedTask, virtual: false } : virtualTask(user, route);
    const score = scoreById.get(user.id) ?? {};
    const frozenRepair = isFrozenRepair(route, score);
    const task = frozenRepair
      ? { ...assignedOrVirtualTask, category: "repair", subtype: route.taskSubtype, priority: route.priority }
      : assignedOrVirtualTask;
    return {
      id: task.id,
      userId: user.id,
      user,
      route,
      score,
      task,
      assigneeTeam: task.assigneeTeam,
      channel: task.channel ?? route.channel,
      frozenRepair,
      internalSupportOwner: frozenRepair ? supportOwner(route) : null,
      conversionControls: !frozenRepair,
      feedbackOptions: frozenRepair ? FROZEN_REPAIR_FEEDBACK_OPTIONS : FEEDBACK_OPTIONS
    };
  });
  const scoped = role === "strategy" ? rows
    : rows.filter((row) => {
      const salesFrontOwner = role === "sales"
        && row.frozenRepair
        && row.route.team === "sales"
        && row.route.bindingMode === "bound";
      if (salesFrontOwner) return true;
      return hasExplicitAssignment(row.task) ? isAssignedToRole(row.task, role) : fallbackMatchesRole(row, role);
    });
  return scoped.sort((left, right) => String(left.route.priority ?? "P9").localeCompare(String(right.route.priority ?? "P9")) || left.userId.localeCompare(right.userId));
}

export function taskExportCsv(state, role) {
  return serializeCsv(buildRoleTaskRows(state, role).map((row) => ({
    "用户ID": row.userId,
    "孩子ID": row.user.childId ?? row.userId,
    "角色范围": role,
    "任务": row.task.subtype,
    "优先级": row.task.priority,
    "状态": row.task.status,
    "主责团队": row.route.team,
    "渠道": row.channel,
    "风险状态": row.frozenRepair ? "冻结修复" : "正常"
  })));
}

function selectOptions(field, selected, options = FEEDBACK_OPTIONS) {
  return options[field].map((value) => `<option value="${escapeAttribute(value)}"${value === selected ? " selected" : ""}>${escapeHtml(LABELS[field][value])}</option>`).join("");
}

function previewMarkup(preview) {
  const keys = [["原始基础分", "rawBaseScore"], ["最终基础分", "baseScore"], ["H", "hLevel"], ["F13", "f13"], ["F14", "f14"], ["F12", "f12"], ["主责", "team"], ["任务", "task"]];
  return `<section class="simulation-preview"><h3>次日重算预览</h3><p class="local-notice">预览不写入状态；F16 已审计，实时信号已经生效，基础分字段待次日应用。</p><div class="diff-grid"><strong>字段</strong><strong>当前</strong><strong>模拟次日</strong>${keys.map(([label, key]) => {
    const before = key === "f14" ? formatDisplayValue(preview.before[key]) : preview.before[key];
    const after = key === "f14" ? formatDisplayValue(preview.after[key]) : preview.after[key];
    return `<span>${escapeHtml(label)}</span><span class="${before !== after ? "is-changed" : ""}">${escapeHtml(before)}</span><span class="${before !== after ? "is-changed" : ""}">${escapeHtml(after)}</span>`;
  }).join("")}</div></section>`;
}

function feedbackForm(row) {
  const blocked = row.route.touchGate?.status === "blocked";
  if (blocked) {
    const exception = row.route.priority === "P0" ? `<form class="p0-exemption-form" data-task-id="${escapeAttribute(row.id)}"><p class="local-notice">F12 阻断：不可提交触达结果。P0 可填写原因申请豁免，系统会标记主管可见并重新校验准入；豁免本身不会改变分数或 H。</p><label class="feedback-field"><span>豁免原因</span><textarea name="reason" required></textarea></label><div class="form-actions"><button type="submit" class="secondary-button">申请 P0 豁免</button></div></form>` : `<p class="local-notice">F12 触达阻断，当前任务不能提交触达结果。</p>`;
    return exception;
  }
  if (row.frozenRepair) {
    const options = row.feedbackOptions;
    return `<form class="feedback-form feedback-form--repair" data-task-id="${escapeAttribute(row.id)}"><div class="feedback-grid"><fieldset><legend>触达状态</legend>${options.contactStatus.map((value, index) => `<label class="radio-field"><input type="radio" name="contactStatus" value="${escapeAttribute(value)}"${index === 0 ? " checked" : ""}><span>${escapeHtml(LABELS.contactStatus[value])}</span></label>`).join("")}</fieldset><label class="feedback-field"><span>回复状态</span><select name="responseStatus">${selectOptions("responseStatus", "replied", options)}</select></label><label class="feedback-field"><span>风险变化</span><select name="riskChange">${selectOptions("riskChange", "unchanged", options)}</select></label><label class="feedback-field"><span>下一动作</span><select name="nextAction">${selectOptions("nextAction", "service-repair", options)}</select></label><label class="feedback-field"><span>最终结果</span><select name="finalResult">${selectOptions("finalResult", "follow-up", options)}</select></label><label class="feedback-field feedback-field--wide"><span>下次跟进（严格 ISO）</span><input name="nextFollowAt" type="text" required value="2026-07-21T10:00:00+08:00" pattern="${escapeAttribute(STRICT_ISO_HTML_PATTERN)}"></label><label class="feedback-field feedback-field--wide"><span>学情结论补充</span><textarea name="learningConclusion"></textarea></label><label class="feedback-field feedback-field--wide"><span>备注补充</span><textarea name="notes"></textarea></label></div><input type="hidden" name="intentStatus" value="none"><input type="hidden" name="objectionType" value="none"><div class="form-actions"><button type="submit" class="primary-button">${icon("save")}提交修复回写</button></div></form>`;
  }
  return `<form class="feedback-form" data-task-id="${escapeAttribute(row.id)}"><div class="feedback-grid"><fieldset><legend>触达状态</legend>${FEEDBACK_OPTIONS.contactStatus.map((value, index) => `<label class="radio-field"><input type="radio" name="contactStatus" value="${escapeAttribute(value)}"${index === 0 ? " checked" : ""}><span>${escapeHtml(LABELS.contactStatus[value])}</span></label>`).join("")}</fieldset><label class="feedback-field"><span>回复状态</span><select name="responseStatus">${selectOptions("responseStatus", "replied")}</select></label><label class="feedback-field"><span>意向状态</span><select name="intentStatus">${selectOptions("intentStatus", "considering")}</select></label><label class="feedback-field"><span>异议类型</span><select name="objectionType">${selectOptions("objectionType", "none")}</select></label><label class="feedback-field"><span>风险变化</span><select name="riskChange">${selectOptions("riskChange", "unchanged")}</select></label><label class="feedback-field"><span>下一动作</span><select name="nextAction">${selectOptions("nextAction", "send-report-explanation")}</select></label><label class="feedback-field"><span>最终结果</span><select name="finalResult">${selectOptions("finalResult", "follow-up")}</select></label><label class="feedback-field feedback-field--wide"><span>下次跟进（严格 ISO）</span><input name="nextFollowAt" type="text" required value="2026-07-21T10:00:00+08:00" pattern="${escapeAttribute(STRICT_ISO_HTML_PATTERN)}"></label><label class="feedback-field feedback-field--wide"><span>学情结论补充</span><textarea name="learningConclusion"></textarea></label><label class="feedback-field feedback-field--wide"><span>备注补充</span><textarea name="notes"></textarea></label></div><div class="form-actions"><button type="submit" class="primary-button">${icon("save")}提交 F16 回写</button></div></form>`;
}

function frozenRepairMarkup(row) {
  return `<section class="frozen-repair-state"><header><h3>冻结修复</h3><span>不可转化</span></header><p class="local-notice">当前任务处于 H4 或销售冻结状态，只允许记录修复进展，不能提交转化动作。</p><dl class="field-detail"><div><dt>前台主责</dt><dd>${escapeHtml(`${row.route.team}/${row.route.subteam}`)}</dd></div><div><dt>内部支持</dt><dd>${escapeHtml(row.internalSupportOwner ?? "learning")}</dd></div><div><dt>修复任务</dt><dd>${escapeHtml(row.task.subtype)}</dd></div></dl></section>`;
}

function taskDrawer(row, context) {
  const initialPreview = (() => { try { return context.store.previewNextDay(row.userId); } catch { return null; } })();
  const close = openDrawer({
    title: `任务回写 · ${row.user.childId ?? row.userId}`,
    size: "wide",
    trustedHtml: `<section class="field-detail"><div><dt>主责 / 绑定</dt><dd>${escapeHtml(`${row.route.team} / ${row.route.bindingMode}`)}</dd></div><div><dt>任务 / 渠道</dt><dd>${escapeHtml(`${row.task.subtype} / ${row.channel}`)}</dd></div><div><dt>F12</dt><dd>${escapeHtml(row.route.touchGate?.status)}</dd></div><div><dt>风险 / H</dt><dd>${escapeHtml(`${row.score.risk?.salesFrozen ? "销售冻结" : "正常"} / ${row.score.hLevel}`)}</dd></div></section>${context.role === "strategy" ? `<form class="reassign-form" data-task-id="${escapeAttribute(row.id)}"><label class="feedback-field"><span>模拟改派</span><select name="assigneeTeam"><option value="agent">Agent</option><option value="learning">学情</option><option value="sales">二销</option><option value="after-sales">售后</option><option value="learning-intervention">学情干预</option><option value="learning-planning">学情规划</option></select></label><div class="form-actions"><button type="submit" class="secondary-button">模拟改派</button></div></form>` : ""}<section class="drawer-section">${row.frozenRepair ? `${frozenRepairMarkup(row)}${feedbackForm(row)}<div class="drawer-preview">${initialPreview?.appliedRecords ? previewMarkup(initialPreview) : ""}</div>${initialPreview?.appliedRecords ? `<div class="form-actions"><button type="button" class="primary-button" data-simulate-next-day="${escapeAttribute(row.userId)}">模拟次日重算</button></div>` : ""}` : `<header><h3>结构化 F16 回写</h3><span>即时信号 + 次日基础分</span></header>${feedbackForm(row)}<div class="drawer-preview">${initialPreview?.appliedRecords ? previewMarkup(initialPreview) : ""}</div>${initialPreview?.appliedRecords ? `<div class="form-actions"><button type="button" class="primary-button" data-simulate-next-day="${escapeAttribute(row.userId)}">模拟次日重算</button></div>` : ""}`}</section>`
  });
  const panel = document.querySelector("#drawerRoot .overlay-panel");
  panel?.querySelector(".feedback-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      context.store.submitFeedback(row.id, values);
      const preview = context.store.previewNextDay(row.userId);
      const target = panel.querySelector(".drawer-preview");
      if (target) target.innerHTML = previewMarkup(preview);
      if (!panel.querySelector("[data-simulate-next-day]")) target?.insertAdjacentHTML("afterend", `<div class="form-actions"><button type="button" class="primary-button" data-simulate-next-day="${escapeAttribute(row.userId)}">模拟次日重算</button></div>`);
      refreshIcons();
      toast("F16 已审计保存；实时信号已更新。", "success");
    } catch (error) { toast(error.message, "danger"); }
  });
  panel?.querySelector(".p0-exemption-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try { context.store.applyP0Exemption(row.id, new FormData(event.currentTarget).get("reason")); close({ restoreFocus: false }); toast("P0 豁免已标记主管可见，并已重新校验准入。", "success"); } catch (error) { toast(error.message, "danger"); }
  });
  panel?.querySelector(".reassign-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    try { context.store.reassignTask(row.id, new FormData(event.currentTarget).get("assigneeTeam")); toast("已记录本地模拟改派。", "info"); } catch (error) { toast(error.message, "danger"); }
  });
  panel?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-simulate-next-day]");
    if (!target) return;
    try { context.store.simulateNextDay(target.dataset.simulateNextDay); close({ restoreFocus: false }); toast("已应用模拟次日重算。", "success"); } catch (error) { toast(error.message, "danger"); }
  });
}

function renderTaskTable(rows) {
  return renderTable({
    caption: `当前任务 ${rows.length} 条`,
    columns: [
      { key: "userId", label: "用户", trustedHtml: (_, row) => `<span class="stacked-cell"><strong>${escapeHtml(row.user.childId ?? row.userId)}</strong><small>${escapeHtml(row.userId)}</small></span>` },
      { key: "task", label: "任务", trustedHtml: (_, row) => `<span class="stacked-cell"><strong>${escapeHtml(row.task.subtype)}</strong><small>${escapeHtml(row.frozenRepair ? "冻结修复" : row.task.priority)}</small></span>` },
      { key: "channel", label: "渠道" },
      { key: "route", label: "主责 / 绑定", trustedHtml: (_, row) => `<span class="stacked-cell"><strong>${escapeHtml(row.route.team)}</strong><small>${escapeHtml(row.internalSupportOwner ?? row.route.bindingMode)}</small></span>` },
      { key: "score", label: "H / 风险", trustedHtml: (_, row) => renderBadge(row.score.hLevel === "H4" ? "danger" : "neutral", `${row.score.hLevel} / ${row.score.risk?.salesFrozen ? "冻结" : "正常"}`) },
      { key: "id", label: "处理", trustedHtml: (value) => `<button type="button" class="compact-button" data-task-id="${escapeAttribute(value)}">处理</button>` }
    ],
    rows,
    emptyText: "当前角色没有待处理任务"
  });
}

export function render(container, context) {
  const rows = buildRoleTaskRows(context.state, context.role);
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">${escapeHtml(context.role)}</p><h1>角色任务台</h1><p>${escapeHtml(ROLE_COPY[context.role] ?? ROLE_COPY.strategy)}</p></div><div class="page-actions">${renderBadge("info", `${rows.length} 条`)}<button id="exportRoleTasks" type="button" class="secondary-button">导出任务 CSV</button></div></section><section class="task-workspace">${renderTaskTable(rows)}</section>`;
  container.querySelector("#exportRoleTasks")?.addEventListener("click", () => {
    downloadFile({ content: `\uFEFF${taskExportCsv(context.state, context.role)}`, filename: `rline-${context.role}-tasks.csv`, type: "text/csv;charset=utf-8" });
    toast(`已导出 ${rows.length} 条当前角色任务。`, "success");
  });
  container.querySelectorAll("[data-task-id]").forEach((button) => button.addEventListener("click", () => {
    const row = rows.find((item) => item.id === button.dataset.taskId);
    if (row) taskDrawer(row, context);
  }));
}
