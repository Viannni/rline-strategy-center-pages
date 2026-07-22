import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "高优续费识别", example: "H1/H2/H3/H4阈值、加分项、扣分项、风险熔断", metric: "命中率 / 误判率" },
  { module: "续费窗口", example: "R线月课T22-T28、年课M8-M12，其他线可配置", metric: "窗口转化率" },
  { module: "关单SOP", example: "领券未付、支付失败、高优未续、报告已开未转化", metric: "关单率 / 未续原因" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "模型策略", title: "模型策略工作区", ownerRole: "model-strategy",
    description: "维护高优识别、续费窗口和策略关单规则的统一配置与复盘。",
    assetHeading: "模型策略资产", capabilityHeading: "续费识别与关单策略", capabilityRows: rows
  });
}
