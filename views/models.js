import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

const rows = [
  { module: "高优续费识别", example: "H1/H2/H3/H4阈值、加分项、扣分项、风险熔断", metric: "命中率 / 误判率" },
  { module: "续费窗口", example: "R线月课T22-T28、年课M8-M12，其他线可配置", metric: "窗口转化率" },
  { module: "关单SOP", example: "领券未付、支付失败、高优未续、报告已开未转化", metric: "关单率 / 未续原因" }
];

export function render(container) {
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">模型策略</p><h1>模型策略工作区</h1><p>维护高优识别、续费窗口和策略关单规则的统一配置与复盘。</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "核心产出", value: "识别+窗口+SOP" },
    { label: "首发样板", value: "R线高优续费" },
    { label: "复用方向", value: "K/E阈值替换" }
  ])}<section class="panel"><header class="panel__header"><h2>续费识别与关单策略</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" },
    { key: "example", label: "示例" },
    { key: "metric", label: "复盘指标" }
  ], rows })}</section>`;
}
