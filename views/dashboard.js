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

  container.innerHTML = `<section class="page-header" aria-label="全线总控"><div><p class="section-kicker">策略团队经营视角</p><h1>英语全线策略总控</h1><p>用同一套后台管理R线、K线、E线和后续级别的策略覆盖、资产配置、下发追踪与效果复盘。</p></div>${renderBadge("info", "R线首发样板")}</section>${renderMetricStrip(metrics)}<section class="panel"><header class="panel__header"><div><p class="section-kicker">业务线覆盖</p><h2>全线健康矩阵</h2></div></header>${renderTable({ columns: [
    { key: "name", label: "业务线" },
    { key: "sampleDepth", label: "样本深度", format: (value) => value === "full" ? "完整样板" : "结构样例" },
    { key: "assetCount", label: "策略资产" },
    { key: "onlineCount", label: "已上线" },
    { key: "coverageStatus", label: "覆盖状态", trustedHtml: (value) => renderBadge(value === "healthy" ? "success" : value === "partial" ? "warning" : "danger", value === "healthy" ? "健康" : value === "partial" ? "部分覆盖" : "待配置") }
  ], rows: coverage })}</section>`;
}
