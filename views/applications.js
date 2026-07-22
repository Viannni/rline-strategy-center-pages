import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "AI场景地图", example: "课程入口、活动规则、报告解读、权益说明、常规售后", metric: "命中率 / 解决率 / 转人工率" },
  { module: "知识库缺口", example: "AI无法回答、用户反复追问、转人工后仍未解决", metric: "缺口数 / 修复时长" },
  { module: "AI动作策略", example: "哪些场景先AI解释，哪些场景必须人工介入", metric: "人工节省 / 风险率" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "应用策略", title: "应用策略工作区", types: ["outcome-content", "centralized-touch"],
    description: "明确AI在策略服务中的适用边界、知识覆盖和人工介入条件。",
    assetHeading: "可应用策略资产", capabilityHeading: "AI场景与知识边界", capabilityRows: rows
  });
}
