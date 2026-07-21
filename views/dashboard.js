import { selectTeamLoad } from "../core/selectors.js";
import { escapeAttribute, escapeHtml, renderBadge, renderTable } from "../ui/components.js";
import { icon } from "../ui/icons.js";

function hasDataAnomaly(user) {
  return !user?.id
    || !user?.childId
    || !user?.productType
    || !user?.stageCode
    || user?.learning?.completionRate == null
    || user?.learning?.activeDays7 == null
    || user?.learning?.consecutiveMissedDays == null
    || user?.courseEvaluation == null;
}

export function buildDashboardMetrics(state) {
  const scores = state?.scores ?? [];
  const users = state?.users ?? [];
  return [
    {
      id: "high-priority",
      label: "H1/H2",
      detail: "高优与成果外化",
      value: scores.filter(({ hLevel }) => hLevel === "H1" || hLevel === "H2").length,
      preset: "h1-h2",
      icon: "badge-check"
    },
    {
      id: "uplift",
      label: "H3提分",
      detail: "中心化运营池",
      value: scores.filter(({ hLevel }) => hLevel === "H3").length,
      preset: "h3-uplift",
      icon: "trending-up"
    },
    {
      id: "risk",
      label: "H4风险",
      detail: "风险修复优先",
      value: scores.filter(({ hLevel }) => hLevel === "H4").length,
      preset: "h4-risk",
      icon: "shield-alert"
    },
    {
      id: "realtime",
      label: "F14实时",
      detail: "待付款与领券",
      value: scores.filter(({ transactionSignal }) => transactionSignal?.priority !== "P2").length,
      preset: "f14-realtime",
      icon: "zap"
    },
    {
      id: "blocked",
      label: "F12阻断",
      detail: "全局频控命中",
      value: users.filter(({ touch }) => touch?.status === "blocked" || (touch?.total7d ?? 0) >= (touch?.globalLimit7d ?? 6)).length,
      preset: "f12-blocked",
      icon: "circle-slash"
    },
    {
      id: "anomaly",
      label: "数据异常",
      detail: "缺失或待补齐",
      value: users.filter(hasDataAnomaly).length,
      preset: "data-anomaly",
      icon: "database-zap"
    }
  ];
}

function hDistribution(state) {
  const order = ["H1", "H2", "H3", "H4", "L"];
  return order.map((level) => ({
    id: level,
    level,
    count: (state?.scores ?? []).filter(({ hLevel }) => hLevel === level).length
  }));
}

function alertRows(state) {
  const users = new Map((state?.users ?? []).map((user) => [user.id, user]));
  return (state?.scores ?? [])
    .filter((score) => score.hLevel === "H4" || score.transactionSignal?.priority !== "P2")
    .map((score) => ({
      id: score.userId,
      childId: users.get(score.userId)?.childId ?? score.userId,
      type: score.hLevel === "H4" ? "风险修复" : `F14 ${score.transactionSignal.priority}`,
      action: state?.routes?.[score.userId]?.taskSubtype ?? "待判定"
    }))
    .slice(0, 6);
}

export function render(container, context) {
  const { state, role, navigate } = context;
  const metrics = buildDashboardMetrics(state);
  const maxH = Math.max(1, ...hDistribution(state).map(({ count }) => count));
  const metricMarkup = metrics.map((metric) => (
    `<button class="kpi-button kpi-button--${escapeAttribute(metric.id)}" type="button" data-dashboard-preset="${escapeAttribute(metric.preset)}"><span class="kpi-button__icon">${icon(metric.icon)}</span><span class="kpi-button__copy"><strong>${escapeHtml(metric.label)}</strong><small>${escapeHtml(metric.detail)}</small></span><span class="kpi-button__value">${metric.value}</span>${icon("chevron-right", { className: "kpi-button__arrow" })}</button>`
  )).join("");
  const distributionMarkup = hDistribution(state).map(({ level, count }) => (
    `<button type="button" class="distribution-row" data-dashboard-preset="${level === "H1" || level === "H2" ? "h1-h2" : level === "H3" ? "h3-uplift" : level === "H4" ? "h4-risk" : "low-maintenance"}"><span>${escapeHtml(level)}</span><span class="distribution-bar"><i style="width:${Math.round((count / maxH) * 100)}%"></i></span><strong>${count}</strong></button>`
  )).join("");
  const teamRows = selectTeamLoad(state).map((row) => ({
    ...row,
    teamLabel: `${row.team} / ${row.subteam}`,
    status: row.count >= 8 ? { status: "warning", label: "关注负载" } : { status: "success", label: "负载正常" }
  }));

  container.innerHTML = `<section class="workbench-header"><div><p class="section-kicker">${escapeHtml(role)} · ${escapeHtml(state.version ?? "模拟版本")}</p><h1>总控台</h1><p>经营信号、触达准入与主责队列的模拟总览</p></div><div class="workbench-meta"><span>更新时间 ${escapeHtml(state.generatedAt ?? "-")}</span>${renderBadge("info", "模拟数据")}</div></section><section class="kpi-strip" aria-label="关键指标">${metricMarkup}</section><section class="analysis-grid"><section class="analysis-panel" aria-labelledby="h-distribution-title"><header class="analysis-panel__header"><div><p class="section-kicker">分层结构</p><h2 id="h-distribution-title">H层级分布</h2></div><span>${state.users?.length ?? 0} 人</span></header><div class="distribution-list">${distributionMarkup}</div></section><section class="analysis-panel" aria-labelledby="team-load-title"><header class="analysis-panel__header"><div><p class="section-kicker">当前主责</p><h2 id="team-load-title">团队队列负载</h2></div></header>${renderTable({ columns: [{ key: "teamLabel", label: "团队 / 小组" }, { key: "count", label: "用户" }, { key: "status", label: "状态", type: "badge" }], rows: teamRows, emptyText: "暂无主责队列" })}</section><section class="analysis-panel analysis-panel--wide" aria-labelledby="alerts-title"><header class="analysis-panel__header"><div><p class="section-kicker">优先处理</p><h2 id="alerts-title">风险与交易提醒</h2></div></header>${renderTable({ columns: [{ key: "childId", label: "孩子" }, { key: "type", label: "信号" }, { key: "action", label: "建议动作" }], rows: alertRows(state), emptyText: "暂无风险或交易提醒" })}</section></section>`;

  container.querySelectorAll("[data-dashboard-preset]").forEach((button) => {
    button.addEventListener("click", () => navigate("users", { preset: button.dataset.dashboardPreset }));
  });
}
