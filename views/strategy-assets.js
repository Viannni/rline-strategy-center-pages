import { strategyAssetsForDomain } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderStrategyCard, renderTable } from "../ui/components.js";

function differenceSummary(asset) {
  return Object.entries(asset.differenceConfig || {})
    .map(([line, config]) => `${line}: ${config.valueHook}`)
    .join("；");
}

function joinValues(values, fallback = "-") {
  return Array.isArray(values) && values.length ? values.join(" / ") : fallback;
}

function statusLabel(status) {
  return status === "online" ? "已上线" : status || "未标记";
}

export function render(container, { state }) {
  const assets = strategyAssetsForDomain(state, { businessLine: "english-all" });
  const k2Assets = assets.filter((asset) => asset.target?.businessLines?.includes("k-line") && Array.isArray(asset.sampleCases));
  const k2Rows = k2Assets.flatMap((asset) => asset.sampleCases.map((item) => ({
    strategyId: asset.id,
    strategyName: asset.name,
    node: item.node,
    audience: item.audience,
    channel: item.channel,
    trigger: item.trigger,
    sample: item.sample,
    fields: joinValues(asset.fieldContract),
    sourceStrategyIds: joinValues(asset.sourceStrategyIds)
  })));
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">策略资产</p><h1>策略资产库</h1><p>统一管理内容、执行、模型、用户洞察和AI应用策略。每个资产都要能看出是否全线复用，以及单线差异如何配置。</p></div>${renderBadge("success", "版本化")}</section><section class="strategy-card-grid">${assets.map(renderStrategyCard).join("")}</section><section class="panel"><header class="panel__header"><div><p class="section-kicker">复用与差异</p><h2>策略模板对照</h2></div></header>${renderTable({ columns: [
    { key: "id", label: "策略ID" },
    { key: "name", label: "名称" },
    { key: "scope", label: "复用范围", format: (value) => value === "line-reusable" ? "全线复用" : value },
    { key: "lifecycleNodes", label: "生命周期节点" },
    { key: "ownerRole", label: "负责人" },
    { key: "status", label: "状态", trustedHtml: (value) => renderBadge(value === "online" ? "success" : "neutral", statusLabel(value)) },
    { key: "dataDependencies", label: "数据依赖" },
    { key: "observationWindow", label: "观察窗口" },
    { key: "difference", label: "差异配置" }
  ], rows: assets.map((asset) => ({
    ...asset,
    lifecycleNodes: joinValues(asset.target?.lifecycleNodes),
    dataDependencies: joinValues(asset.dataDependencies),
    difference: differenceSummary(asset)
  })) })}</section>`;
  if (k2Rows.length) {
    container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">K2案例</p><h2>K2策略资产样例</h2><p>把现有K2策略表中的动作抽成后台能承载的配置项：节点、人群、触发、渠道、素材参数、观察指标。</p></div>${renderBadge("info", "模拟话术")}</header>${renderTable({ columns: [
      { key: "strategyId", label: "策略资产ID" },
      { key: "strategyName", label: "策略资产" },
      { key: "node", label: "节点" },
      { key: "audience", label: "人群" },
      { key: "channel", label: "渠道" },
      { key: "trigger", label: "触发" },
      { key: "sample", label: "动作/话术摘要" },
      { key: "fields", label: "字段合同" },
      { key: "sourceStrategyIds", label: "来源策略ID样例" }
    ], rows: k2Rows })}</section>`;
  }
}
