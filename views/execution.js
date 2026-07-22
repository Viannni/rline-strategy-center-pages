import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

const rows = [
  { module: "触达规则库", example: "节点、人群、渠道、文案版本、卡片、排除条件", metric: "触达率 / 回复率" },
  { module: "周期触达日历", example: "同一人群一周内会收到哪些策略", metric: "冲突数 / 频控命中" },
  { module: "策略动作包", example: "触发条件、动作、回写、观察窗口", metric: "执行完整率 / 回写完整率" }
];

export function render(container) {
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">执行策略</p><h1>执行策略工作区</h1><p>集中管理可复用策略的触达规则、频控冲突和回写观察口径。</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "核心产出", value: "规则+动作包" },
    { label: "首发样板", value: "R线续费窗口" },
    { label: "复用方向", value: "K/E节点替换" }
  ])}<section class="panel"><header class="panel__header"><h2>中心化触达与动作</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" },
    { key: "example", label: "示例" },
    { key: "metric", label: "复盘指标" }
  ], rows })}</section>`;
}
