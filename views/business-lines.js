import { coverageByBusinessLine, strategyAssetsForDomain } from "../core/strategy-domain.js";
import { escapeHtml, renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

export function render(container, { state }) {
  const coverage = coverageByBusinessLine(state);
  const rows = coverage.map((line) => ({
    ...line,
    assets: strategyAssetsForDomain(state, { businessLine: line.businessLine })
  }));

  container.innerHTML = `<section class="page-header" aria-label="业务线下钻"><div><p class="section-kicker">业务域下钻</p><h1>业务线 / 级别 / 班期</h1><p>全线先看结构，单线再看节点、策略、人群、执行和数据缺口。R线是当前完整样板，K线/E线先保留结构样例。</p></div>${renderBadge("info", "全线可复用")}</section><section class="line-grid">${rows.map((line) => `<article class="line-card"><header><p class="section-kicker">${escapeHtml(line.businessLine)}</p><h2>${escapeHtml(line.name)}${line.businessLine === "r-line" ? "首发样板" : ""}</h2>${renderBadge(line.coverageStatus === "healthy" ? "success" : line.coverageStatus === "partial" ? "warning" : "danger", line.sampleDepth === "full" ? "完整样板" : "结构样例")}</header>${renderMetricStrip([
    { label: "策略资产", value: `${line.assetCount}` },
    { label: "在线", value: `${line.onlineCount}` },
    { label: "样本", value: line.sampleDepth === "full" ? "完整" : "结构" }
  ])}<ul class="compact-list">${line.assets.map((asset) => `<li><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.observationWindow)}</span></li>`).join("")}</ul></article>`).join("")}</section>`;
}
