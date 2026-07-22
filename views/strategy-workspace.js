import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

function joinValues(values, fallback = "待配置") {
  return Array.isArray(values) && values.length ? values.join(" / ") : fallback;
}

function differenceSummary(asset) {
  const entries = Object.entries(asset.differenceConfig || {});
  return entries.length
    ? entries.map(([line, config]) => `${line}: ${config.valueHook}（${config.benefit}）`).join("；")
    : "无单线差异";
}

function assetsForWorkspace(state, { ownerRole, types = [] }) {
  const assets = Array.isArray(state?.strategyAssets) ? state.strategyAssets : [];
  const matched = assets.filter((asset) => asset.ownerRole === ownerRole || types.includes(asset.type));
  return matched.length ? matched : assets;
}

export function renderStrategyWorkspace(container, { state }, config) {
  const assets = assetsForWorkspace(state, config);
  const rows = assets.map((asset) => ({
    ...asset,
    businessLines: joinValues(asset.target?.businessLines),
    lifecycleNodes: joinValues(asset.target?.lifecycleNodes),
    reuse: asset.reusable ? "可复用" : "单线专用",
    dataDependencies: joinValues(asset.dataDependencies),
    difference: differenceSummary(asset)
  }));
  const onlineCount = assets.filter((asset) => asset.status === "online").length;

  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">${config.kicker}</p><h1>${config.title}</h1><p>${config.description}</p></div>${renderBadge("info", "策略资产")}</section>${renderMetricStrip([
    { label: "策略资产", value: `${assets.length}` },
    { label: "在线", value: `${onlineCount}` },
    { label: "复用范围", value: "R / K / E" }
  ])}<section class="panel"><header class="panel__header"><div><p class="section-kicker">策略资产配置</p><h2>${config.assetHeading}</h2><p>以策略ID追溯跨业务线复用、生命周期落点、数据依赖和观察口径。</p></div></header>${renderTable({ columns: [
    { key: "id", label: "策略ID" }, { key: "name", label: "策略名称" },
    { key: "businessLines", label: "业务线" }, { key: "lifecycleNodes", label: "生命周期节点" },
    { key: "ownerRole", label: "负责人" }, { key: "status", label: "状态" },
    { key: "observationWindow", label: "观察窗口" }, { key: "dataDependencies", label: "数据依赖" },
    { key: "reuse", label: "复用" }, { key: "difference", label: "单线差异" }
  ], rows })}</section><section class="panel"><header class="panel__header"><h2>${config.capabilityHeading}</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" }, { key: "example", label: "能力焦点" }, { key: "metric", label: "复盘指标" }
  ], rows: config.capabilityRows })}</section>`;
}
