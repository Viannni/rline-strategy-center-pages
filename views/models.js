import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "学习分层", example: "K2每周一按前20节完成数分S/A/B/C/D", metric: "命中率 / 误判率" },
  { module: "续费窗口", example: "年课M8-M12可配置，K2当前模拟M9-M11衔接", metric: "窗口转化率 / 规划同意率" },
  { module: "关单SOP", example: "未续费、支付异常、报告已开未转化、规划意向已产生", metric: "关单率 / 未续原因" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "模型策略", title: "模型策略工作区", ownerRole: "model-strategy",
    description: "维护高优识别、续费窗口和策略关单规则的统一配置与复盘。",
    assetHeading: "模型策略资产", capabilityHeading: "续费识别与关单策略", capabilityRows: rows
  });
}
