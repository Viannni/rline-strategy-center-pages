import { dispatchSummary } from "../core/strategy-domain.js";
import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const summary = dispatchSummary(state);
  const rows = state.dispatchBatches || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">下发追踪</p><h1>策略包下发追踪</h1><p>只看策略包是否被系统接收、执行、失败和回写，不展示个人待办。</p></div>${renderBadge("info", "策略级")}</section>${renderMetricStrip([
    { label: "批次数", value: `${summary.totalBatches}` },
    { label: "计划人数", value: `${summary.plannedCount}` },
    { label: "触达人次", value: `${summary.reachedCount}`, hint: `${summary.reachRate}%` },
    { label: "回写完整", value: `${summary.writebackCompleteRate}%` }
  ])}<section class="panel"><header class="panel__header"><h2>策略包批次</h2></header>${renderTable({ columns: [
    { key: "id", label: "批次ID" },
    { key: "strategyId", label: "策略ID" },
    { key: "audiencePackId", label: "人群包" },
    { key: "downstreamSystem", label: "下发系统" },
    { key: "status", label: "状态" },
    { key: "plannedCount", label: "计划" },
    { key: "reachedCount", label: "触达" },
    { key: "writebackStatus", label: "回写" }
  ], rows })}</section>`;
}
