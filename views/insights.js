import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

const rows = [
  { module: "用户画像", example: "学习健康、成果外化、家长互动、活动参与、转化信号、风险状态", metric: "画像完整率" },
  { module: "权益/奖学金规则", example: "R线奖学金，K/E可替换为成长值、积分、优惠券", metric: "领取 / 兑换 / 行为提升" },
  { module: "行为归因", example: "策略动作后用户分数、标签、行为是否变化", metric: "H层迁移 / 提分贡献" }
];

export function render(container) {
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">用户洞察</p><h1>用户洞察工作区</h1><p>统一观察跨业务线的用户画像、权益规则和策略行为归因。</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "核心产出", value: "画像+规则+归因" },
    { label: "首发样板", value: "R线奖学金" },
    { label: "复用方向", value: "K/E权益替换" }
  ])}<section class="panel"><header class="panel__header"><h2>画像、权益与归因</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" },
    { key: "example", label: "示例" },
    { key: "metric", label: "复盘指标" }
  ], rows })}</section>`;
}
