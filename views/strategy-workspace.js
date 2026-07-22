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

function scopeLabel(scope) {
  return {
    "line-reusable": "全线复用",
    "line-specific": "单线专用"
  }[scope] || scope || "待配置";
}

function assetsForWorkspace(state, { ownerRole, types = [] }) {
  const assets = Array.isArray(state?.strategyAssets) ? state.strategyAssets : [];
  return assets.filter((asset) => asset.ownerRole === ownerRole || types.includes(asset.type));
}

function effectivenessMetricsForAssets(state, assets) {
  const assetIds = new Set(assets.map((asset) => asset.id));
  const metrics = Array.isArray(state?.effectivenessMetrics) ? state.effectivenessMetrics : [];
  return metrics.filter((metric) => assetIds.has(metric.strategyId));
}

export function renderStrategyWorkspace(container, { state }, config) {
  const assets = assetsForWorkspace(state, config);
  const effectivenessMetrics = effectivenessMetricsForAssets(state, assets);
  const workTemplates = (state.strategyWorkTemplates || []).filter((template) => template.ownerRole === config.ownerRole);
  const rows = assets.map((asset) => ({
    ...asset,
    scope: scopeLabel(asset.scope),
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
    { key: "scope", label: "复用范围" },
    { key: "businessLines", label: "业务线" }, { key: "lifecycleNodes", label: "生命周期节点" },
    { key: "ownerRole", label: "负责人" }, { key: "status", label: "状态" },
    { key: "observationWindow", label: "观察窗口" }, { key: "dataDependencies", label: "数据依赖" },
    { key: "reuse", label: "复用" }, { key: "difference", label: "单线差异" }
  ], rows })}</section><section class="panel"><header class="panel__header"><h2>${config.capabilityHeading}</h2></header>${renderTable({ columns: [
    { key: "module", label: "模块" }, { key: "example", label: "能力焦点" }, { key: "metric", label: "复盘指标" }
  ], rows: config.capabilityRows })}</section>`;

  if (workTemplates.length) {
    container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">工作模板</p><h2>策略板块工作拆解</h2><p>资料未覆盖的部分使用预设模板补齐，方便模拟后台呈现完整工作流。</p></div>${renderBadge("success", "可复用")}</header>${renderTable({ columns: [
      { key: "id", label: "模板ID" },
      { key: "module", label: "工作模块" },
      { key: "cadence", label: "周期" },
      { key: "input", label: "输入" },
      { key: "work", label: "要做什么" },
      { key: "output", label: "产出" },
      { key: "example", label: "模拟案例" }
    ], rows: workTemplates })}</section>`;
  }

  if (effectivenessMetrics.length) {
    container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">效果数据</p><h2>效果复盘</h2><p>按策略ID关联聚合效果数据，展示业务线、指标值、基准、观察窗口和方向。</p></div></header>${renderTable({ columns: [
      { key: "strategyId", label: "策略ID" }, { key: "businessLine", label: "业务线" },
      { key: "metric", label: "指标" }, { key: "value", label: "值" },
      { key: "benchmark", label: "基准" }, { key: "window", label: "观察窗口" },
      { key: "direction", label: "方向" }
    ], rows: effectivenessMetrics })}</section>`;
  }
}
