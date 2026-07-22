import { renderBadge, renderTable } from "../ui/components.js";

function formatNullable(value) {
  return value === null || value === undefined || value === "" ? "待接入" : `${value}`;
}

export function render(container, { state }) {
  const rows = state.effectivenessMetrics || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略复盘</p><h1>有效性看板</h1><p>按业务线、策略ID、版本、人群、渠道和观察窗口复盘策略是否带来学习、活跃、进线质量和转化改善。</p></div>${renderBadge("success", "观察窗口")}</section><section class="panel"><header class="panel__header"><h2>策略效果指标</h2></header>${renderTable({ columns: [
    { key: "businessLine", label: "业务线" },
    { key: "strategyId", label: "策略ID" },
    { key: "strategyVersion", label: "版本" },
    { key: "metric", label: "指标" },
    { key: "value", label: "当前值", format: formatNullable },
    { key: "benchmark", label: "基准", format: formatNullable },
    { key: "window", label: "观察窗口" },
    { key: "evidenceStatus", label: "证据状态" },
    { key: "direction", label: "方向", trustedHtml: (value) => renderBadge(value === "positive" ? "success" : "warning", value === "positive" ? "正向" : "观察") }
  ], rows })}</section>`;
}
