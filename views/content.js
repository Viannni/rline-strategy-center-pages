import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "内容日历", example: "活动、节日比赛、单词PK、复习直播、讲座、月测、成长报告", metric: "参与率 / 完成率 / 报告打开" },
  { module: "内容资产库", example: "K2主题活动、K2能力路径、E1课程QA和升阶规划", metric: "资产复用率 / 缺口数" },
  { module: "内容效果复盘", example: "报告打开后是否产生下一步点击和续费信号", metric: "行为提升 / 进线质量 / 转化信号" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "内容策略", title: "内容策略工作区", ownerRole: "content-strategy",
    description: "配置和复盘能提升学习健康、效果外化和续费认知的内容资产。",
    assetHeading: "内容策略资产", capabilityHeading: "内容日历与资产", capabilityRows: rows
  });
}
