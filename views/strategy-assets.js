import { strategyAssetsForDomain } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderStrategyCard, renderTable } from "../ui/components.js";

function differenceSummary(asset) {
  return Object.entries(asset.differenceConfig || {})
    .map(([line, config]) => `${line}: ${config.valueHook}`)
    .join("；");
}

export function render(container, { state }) {
  const assets = strategyAssetsForDomain(state, { businessLine: "english-all" });
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略资产</p><h1>策略资产库</h1><p>统一管理内容、执行、模型、用户洞察和AI应用策略。每个资产都要能看出是否全线复用，以及单线差异如何配置。</p></div>${renderBadge("success", "版本化")}</section><section class="strategy-card-grid">${assets.map(renderStrategyCard).join("")}</section><section class="panel"><header class="panel__header"><div><p class="section-kicker">复用与差异</p><h2>策略模板对照</h2></div></header>${renderTable({ columns: [
    { key: "id", label: "策略ID" },
    { key: "name", label: "名称" },
    { key: "scope", label: "复用范围", format: (value) => value === "line-reusable" ? "全线复用" : value },
    { key: "difference", label: "差异配置" }
  ], rows: assets.map((asset) => ({ ...asset, difference: differenceSummary(asset) })) })}</section>`;
}
