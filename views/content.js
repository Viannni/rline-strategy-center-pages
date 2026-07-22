import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

const rows = [
  { module: "内容日历", example: "活动、节日比赛、单词PK、复习直播、讲座、月测、成长报告", metric: "参与率 / 完成率 / 报告打开" },
  { module: "内容资产库", example: "R线奖学金、K线能力路径、E线升阶规划", metric: "资产复用率 / 缺口数" },
  { module: "内容效果复盘", example: "报告打开后是否产生下一步点击和续费信号", metric: "行为提升 / 进线质量 / 转化信号" }
];

export function render(container) {
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">内容策略</p><h1>内容策略工作区</h1><p>配置和复盘能提升学习健康、效果外化和续费认知的内容资产。</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "核心产出", value: "活动+内容资产" },
    { label: "首发样板", value: "R线奖学金" },
    { label: "复用方向", value: "K/E权益替换" }
  ])}<section class="panel"><header class="panel__header"><h2>内容日历与资产</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" },
    { key: "example", label: "示例" },
    { key: "metric", label: "复盘指标" }
  ], rows })}</section>`;
}
