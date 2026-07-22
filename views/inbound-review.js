import { renderBadge, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.inboundReviews || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">进线复盘</p><h1>策略归因与进线质量</h1><p>这里不做进线派发，只判断哪个策略导致进线、质量如何、是否解决，以及要反哺文案、入口、频控、内容、模型还是产研。</p></div>${renderBadge("info", "非派单")}</section><section class="panel"><header class="panel__header"><h2>进线质量复盘</h2></header>${renderTable({ columns: [
    { key: "businessLine", label: "业务线" },
    { key: "sourceStrategyId", label: "来源策略ID" },
    { key: "type", label: "进线类型" },
    { key: "quality", label: "质量评级" },
    { key: "solved", label: "是否解决", format: (value) => value ? "已解决" : "未解决" },
    { key: "scoreImpact", label: "分数影响" },
    { key: "suggestion", label: "策略修正建议" }
  ], rows })}</section>`;
}
