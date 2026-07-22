import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "用户画像", example: "学习健康、成果外化、家长互动、活动参与、转化信号、风险状态", metric: "画像完整率" },
  { module: "级别权益规则", example: "K2主题活动权益、E1升阶规划权益、积分或优惠券均可作为可配置资产", metric: "领取 / 兑换 / 行为提升" },
  { module: "行为归因", example: "策略动作后用户分层、标签、行为是否变化", metric: "层级迁移 / 行为贡献" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "用户洞察", title: "用户洞察工作区", ownerRole: "insight-strategy", types: ["outcome-content", "renewal-model", "centralized-touch"],
    description: "统一观察跨业务线的用户画像、权益规则和策略行为归因。",
    assetHeading: "洞察关联策略资产", capabilityHeading: "画像、权益与归因", capabilityRows: rows
  });
}
