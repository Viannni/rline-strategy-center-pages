import { renderBadge, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.inboundReviews || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">进线复盘</p><h1>策略归因与进线质量</h1><p>按策略、业务线和观察窗口汇总进线量、质量分布与解决情况，反哺文案、入口、频控、内容、模型和产研。</p></div>${renderBadge("info", "非派单")}</section><section class="panel"><header class="panel__header"><h2>进线质量复盘</h2></header>${renderTable({ columns: [
    { key: "businessLine", label: "业务线" },
    { key: "sourceStrategyId", label: "来源策略ID" },
    { key: "type", label: "进线类型" },
    { key: "window", label: "观察窗口" },
    { key: "inboundCount", label: "进线量" },
    { key: "highValueRate", label: "高价值率", format: (value) => `${value}%` },
    { key: "riskRate", label: "风险率", format: (value) => `${value}%` },
    { key: "resolutionRate", label: "解决率", format: (value) => `${value}%` },
    { key: "qualityMix", label: "质量分布" },
    { key: "suggestion", label: "策略修正建议" }
  ], rows })}</section>`;
}
