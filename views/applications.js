import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

const rows = [
  { module: "AI场景地图", example: "课程入口、活动规则、报告解读、权益说明、常规售后", metric: "命中率 / 解决率 / 转人工率" },
  { module: "知识库缺口", example: "AI无法回答、用户反复追问、转人工后仍未解决", metric: "缺口数 / 修复时长" },
  { module: "AI动作策略", example: "哪些场景先AI解释，哪些场景必须人工介入", metric: "人工节省 / 风险率" }
];

export function render(container) {
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">应用策略</p><h1>应用策略工作区</h1><p>明确AI在策略服务中的适用边界、知识覆盖和人工介入条件。</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "核心产出", value: "AI场景+动作策略" },
    { label: "首发样板", value: "R线报告解读" },
    { label: "复用方向", value: "K/E场景替换" }
  ])}<section class="panel"><header class="panel__header"><h2>AI场景与知识边界</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" },
    { key: "example", label: "示例" },
    { key: "metric", label: "复盘指标" }
  ], rows })}</section>`;
}
