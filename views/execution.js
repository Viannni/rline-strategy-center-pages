import { renderStrategyWorkspace } from "./strategy-workspace.js";

const rows = [
  { module: "触达规则库", example: "节点、人群、渠道、文案版本、卡片、排除条件", metric: "触达率 / 回复率" },
  { module: "周期触达日历", example: "同一人群一周内会收到哪些策略", metric: "冲突数 / 频控命中" },
  { module: "策略动作包", example: "触发条件、动作、回写、观察窗口", metric: "执行完整率 / 回写完整率" }
];

export function render(container, context) {
  renderStrategyWorkspace(container, context, {
    kicker: "执行策略", title: "执行策略工作区", ownerRole: "execution-strategy",
    description: "集中管理可复用策略的触达规则、频控冲突和回写观察口径。",
    assetHeading: "中心化执行策略资产", capabilityHeading: "中心化触达与动作", capabilityRows: rows
  });
}
