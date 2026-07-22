import { coverageByBusinessLine, strategyAssetsForDomain } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

function joinValues(values, fallback = "待配置") {
  return Array.isArray(values) && values.length ? values.join(" / ") : fallback;
}

function batchStatusLabel(status) {
  return status === "completed" ? "已完成" : status === "running" ? "进行中" : status || "待配置";
}

function productTypeLabel(productType) {
  return productType === "annual" ? "年课" : productType === "monthly" ? "月课" : productType || "待配置";
}

function requirementBusinessLines(requirement) {
  if (Array.isArray(requirement.businessLines)) return requirement.businessLines;
  return requirement.businessLine ? [requirement.businessLine] : [];
}

function dataGapSummary(state, line, audiencePacks) {
  const audienceGaps = audiencePacks
    .filter((pack) => pack.dataFreshness === "待接入")
    .map((pack) => `${pack.name}：${pack.dataFreshness}`);
  const requirementGaps = (state.dataRequirements || [])
    .filter((requirement) => requirementBusinessLines(requirement).includes(line.businessLine))
    .filter((requirement) => requirement.status !== "confirmed-reusable")
    .map((requirement) => `${requirement.name}：${requirement.status === "must-add" ? "需新增" : "待适配"}`);
  const gaps = [...audienceGaps, ...requirementGaps];
  return gaps.length ? gaps.join("；") : line.sampleDepth === "full" ? "无" : "待确认";
}

export function render(container, { state }) {
  const coverage = coverageByBusinessLine(state);
  const k2Playbook = state.k2StrategyPlaybook || [];
  const rows = coverage.map((line) => {
    const definition = (state.businessLines || []).find((item) => item.id === line.businessLine) || {};
    const audiencePacks = (state.audiencePacks || []).filter((pack) => pack.businessLine === line.businessLine);
    const dispatchBatches = (state.dispatchBatches || []).filter((batch) => batch.businessLine === line.businessLine);
    return {
      ...line,
      assets: strategyAssetsForDomain(state, { businessLine: line.businessLine }),
      levels: joinValues(definition.levels),
      productTypes: joinValues([...new Set(audiencePacks.map((pack) => productTypeLabel(pack.productType)))]),
      cohorts: joinValues(audiencePacks.flatMap((pack) => pack.cohortIds || [])),
      lifecycleNodes: joinValues(audiencePacks.flatMap((pack) => pack.lifecycleNodes || [])),
      audiencePacks: joinValues(audiencePacks.map((pack) => `${pack.id}（${pack.name}）`)),
      dispatchBatches: joinValues(dispatchBatches.map((batch) => `${batch.id}（${batchStatusLabel(batch.status)}）`), "暂无下发批次"),
      dataGaps: dataGapSummary(state, line, audiencePacks)
    };
  });

  container.innerHTML = `<section class="page-header" aria-label="业务线下钻"><div><p class="section-kicker">业务域下钻</p><h1>业务线 / 级别 / 班期</h1><p>全线先看结构，单线再看节点、策略、人群、执行和数据缺口。R线是当前完整样板，K2已补充中心化SOP模拟，可作为产研字段和页面落地参照。</p></div>${renderBadge("info", "全线可复用")}</section><section class="line-grid">${rows.map((line) => `<article class="line-card"><header><p class="section-kicker">${escapeHtml(line.businessLine)}</p><h2>${escapeHtml(line.name)}${line.businessLine === "r-line" ? "首发样板" : line.businessLine === "k-line" ? "K2模拟样板" : ""}</h2>${renderBadge(line.coverageStatus === "healthy" ? "success" : line.coverageStatus === "partial" ? "warning" : "danger", line.sampleDepth === "full" ? "完整样本" : line.businessLine === "k-line" ? "K2模拟" : "结构样例")}</header>${renderMetricStrip([
    { label: "策略资产", value: `${line.assetCount}` },
    { label: "在线", value: `${line.onlineCount}` },
    { label: "样本", value: line.sampleDepth === "full" ? "完整 / 全量" : line.businessLine === "k-line" ? "SOP / 模拟" : "结构 / 待接入" }
  ])}<ul class="compact-list">${line.assets.map((asset) => `<li><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.observationWindow)}</span></li>`).join("")}</ul></article>`).join("")}</section>`;
  container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">策略经营下钻</p><h2>业务线覆盖明细</h2></div></header>${renderTable({ columns: [
    { key: "name", label: "业务线" },
    { key: "levels", label: "级别" },
    { key: "productTypes", label: "产品类型" },
    { key: "cohorts", label: "班期" },
    { key: "lifecycleNodes", label: "生命周期节点" },
    { key: "audiencePacks", label: "人群包" },
    { key: "dispatchBatches", label: "下发批次" },
    { key: "dataGaps", label: "数据缺口" }
  ], rows })}</section>`;
  if (k2Playbook.length) {
    container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">K2模拟样板</p><h2>K2中心化SOP配置拆解</h2><p>根据现有K2策略表抽象成后台字段，便于产品、数据和策略逐条确认。</p></div>${renderBadge("success", "可配置")}</header>${renderTable({ columns: [
      { key: "id", label: "配置ID" },
      { key: "module", label: "模块" },
      { key: "lifecycle", label: "节点" },
      { key: "audience", label: "人群" },
      { key: "trigger", label: "触发逻辑" },
      { key: "action", label: "策略动作" },
      { key: "fields", label: "需要字段", format: joinValues },
      { key: "output", label: "回收结果" }
    ], rows: k2Playbook })}</section>`;
  }
  const globalRequirements = (state.dataRequirements || [])
    .filter((requirement) => requirementBusinessLines(requirement).length === 0)
    .filter((requirement) => requirement.status !== "confirmed-reusable");
  container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">全局依赖</p><h2>跨业务线平台能力</h2><p>不计入单线数据缺口；仅在策略总控层跟踪。</p></div></header>${renderTable({ columns: [
    { key: "name", label: "依赖项" },
    { key: "owner", label: "责任方" },
    { key: "refreshCycle", label: "刷新周期" },
    { key: "status", label: "状态", format: (value) => value === "must-add" ? "需新增" : value === "needs-adaptation" ? "待适配" : value }
  ], rows: globalRequirements })}</section>`;
}
