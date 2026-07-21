import { getPlacement } from "../core/routing-engine.js";
import { SYSTEM_CAPABILITIES } from "../data/system-capabilities.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderTable } from "../ui/components.js";

export const INTAKE_STATUSES = Object.freeze(["新进线", "待判定", "待分配", "已分配", "排队", "阻断"]);

const activeTask = (state, userId) => (state.tasks ?? []).find((task) => task.userId === userId && !["done", "closed", "cancelled"].includes(task.status));

function intakeStatus(user, route, task) {
  if (route.touchGate?.status === "blocked") return "阻断";
  if (route.touchGate?.status === "queued" || task?.status === "queued") return "排队";
  if (task?.assigneeTeam) return "已分配";
  if (!user.issueType || !user.stageCode) return "待判定";
  if (route.team) return "待分配";
  return "新进线";
}

function placementFor(route) {
  const placement = getPlacement(route.placementId) ?? {};
  const capability = SYSTEM_CAPABILITIES.find((item) => item.id === placement.capabilityId) ?? {};
  return {
    status: placement.statusMeta?.label ?? placement.status ?? "待核对",
    path: capability.path ?? "待确认路径",
    feature: placement.feature ?? route.placementId ?? "待确认落点"
  };
}

function riskLabel(score) {
  if (score.risk?.fused) return "熔断";
  return score.risk?.deduction ? `扣${score.risk.deduction}` : "无";
}

export function buildIntakeRows(state) {
  const scoreById = new Map((state.scores ?? []).map((score) => [score.userId, score]));
  return (state.users ?? []).map((user) => {
    const score = scoreById.get(user.id);
    const route = state.routes?.[user.id] ?? {};
    const task = activeTask(state, user.id);
    return {
      id: user.id,
      issue: user.issueType ?? "未标注问题",
      lifecycle: `${user.productType ?? "unknown"} / ${user.stageCode ?? "unknown"}`,
      hLevel: score?.hLevel ?? "L",
      risk: riskLabel(score ?? {}),
      f12: route.touchGate?.status ?? "eligible",
      channel: route.channel ?? "text",
      team: route.team ?? "unassigned",
      subteam: route.subteam ?? "unassigned",
      sla: `${route.slaHours ?? "-"}h`,
      placement: placementFor(route),
      status: intakeStatus(user, route, task),
      trace: route.trace ?? [],
      route,
      score,
      user
    };
  }).sort((left, right) => INTAKE_STATUSES.indexOf(left.status) - INTAKE_STATUSES.indexOf(right.status) || left.id.localeCompare(right.id));
}

function gateBadge(value) {
  return renderBadge(value === "blocked" ? "danger" : value === "queued" ? "warning" : "success", value);
}

function renderRouteTrace(row) {
  return `<section class="drawer-section"><header><h3>七步路由轨迹</h3><span>${escapeHtml(row.id)}</span></header><ol class="route-trace">${row.trace.map((step) => `<li><span>${escapeHtml(step.label)}</span><strong>${escapeHtml(step.value)}</strong><small>${escapeHtml(step.decision)}</small></li>`).join("")}</ol></section>`;
}

function openTrace(row) {
  openDrawer({
    title: `路由轨迹 · ${row.id}`,
    size: "wide",
    trustedHtml: `<section class="field-detail"><div><dt>进线状态</dt><dd>${escapeHtml(row.status)}</dd></div><div><dt>F12</dt><dd>${gateBadge(row.f12)}</dd></div><div><dt>建议主责</dt><dd>${escapeHtml(`${row.team} / ${row.subteam}`)}</dd></div><div><dt>系统落点</dt><dd>${escapeHtml(row.placement.path)}</dd></div></section>${renderRouteTrace(row)}`
  });
}

function renderRows(rows) {
  return renderTable({
    caption: `当前进线 ${rows.length} 条`,
    columns: [
      { key: "status", label: "进线状态", trustedHtml: (value) => renderBadge(value === "阻断" ? "danger" : value === "排队" ? "warning" : "info", value) },
      { key: "issue", label: "问题" },
      { key: "lifecycle", label: "生命周期" },
      { key: "hLevel", label: "H", trustedHtml: (value) => renderBadge(value === "H4" ? "danger" : "neutral", value) },
      { key: "risk", label: "风险" },
      { key: "f12", label: "F12", trustedHtml: (value) => gateBadge(value) },
      { key: "channel", label: "建议渠道" },
      { key: "team", label: "团队" },
      { key: "subteam", label: "小组" },
      { key: "sla", label: "SLA" },
      { key: "placement", label: "落点 / 路径", trustedHtml: (_, row) => `<span class="stacked-cell"><strong>${escapeHtml(row.placement.status)}</strong><small>${escapeHtml(row.placement.path)}</small></span>` },
      { key: "id", label: "轨迹", trustedHtml: (value) => `<button type="button" class="compact-button" data-intake-id="${escapeAttribute(value)}">查看</button>` }
    ],
    rows,
    emptyText: "没有符合当前状态的进线"
  });
}

export function render(container, context) {
  const allRows = buildIntakeRows(context.state);
  const renderFiltered = (status = "") => {
    const rows = status ? allRows.filter((row) => row.status === status) : allRows;
    container.innerHTML = `<section class="page-header"><div><p class="section-kicker">触达准入与派单轨迹</p><h1>进线中心</h1><p>固定状态队列，逐行保留问题、准入、路由、SLA 和系统落点。</p></div>${renderBadge("info", `${rows.length} 条`)}</section><div class="intake-statuses" role="tablist" aria-label="进线状态">${["", ...INTAKE_STATUSES].map((item) => `<button type="button" role="tab" aria-selected="${item === status}" data-intake-status="${escapeAttribute(item)}">${escapeHtml(item || "全部")}</button>`).join("")}</div><section id="intakeResults">${renderRows(rows)}</section>`;
    container.querySelectorAll("[data-intake-id]").forEach((button) => button.addEventListener("click", () => {
      const row = allRows.find((item) => item.id === button.dataset.intakeId);
      if (row) openTrace(row);
    }));
    container.querySelectorAll("[data-intake-status]").forEach((button) => button.addEventListener("click", () => renderFiltered(button.dataset.intakeStatus ?? "")));
  };
  renderFiltered();
}
