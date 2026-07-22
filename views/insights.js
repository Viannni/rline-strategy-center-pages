import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "用户画像", example: "学习健康、成果外化、家长互动、活动参与、转化信号、风险状态", metric: "画像完整率" },
  { module: "权益/奖学金规则", example: "R线奖学金，K/E可替换为成长值、积分、优惠券", metric: "领取 / 兑换 / 行为提升" },
  { module: "行为归因", example: "策略动作后用户分数、标签、行为是否变化", metric: "H层迁移 / 提分贡献" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "用户洞察", title: "用户洞察工作区", ownerRole: "insight-strategy", types: ["outcome-content", "renewal-model", "centralized-touch"],
    description: "统一观察跨业务线的用户画像、权益规则和策略行为归因。",
    assetHeading: "洞察关联策略资产", capabilityHeading: "画像、权益与归因", capabilityRows: rows
  });
}
