import { renderBadge, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const rows = state.dataRequirements || [];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">数据底座</p><h1>数据底座与产研提需</h1><p>让产研一眼看清楚已有能力、缺口、刷新周期、取数口径、替代方案和验收标准。</p></div>${renderBadge("warning", "需回填")}</section><section class="panel"><header class="panel__header"><h2>字段与系统能力</h2></header>${renderTable({ columns: [
    { key: "id", label: "需求ID" },
    { key: "name", label: "名称" },
    { key: "owner", label: "负责人" },
    { key: "status", label: "状态", trustedHtml: (value) => renderBadge(value, value) },
    { key: "refreshCycle", label: "刷新周期" },
    { key: "reason", label: "新增原因" },
    { key: "fallback", label: "替代方案" }
  ], rows })}</section>`;
}
