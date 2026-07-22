import { audienceSummary } from "../core/strategy-domain.js";
import { renderBadge, renderMetricStrip, renderTable } from "../ui/components.js";

function joinList(values) {
  return Array.isArray(values) && values.length ? values.join(" / ") : values || "待配置";
}

function productTypeLabel(productType) {
  return productType === "annual" ? "年课" : productType === "monthly" ? "月课" : productType || "待配置";
}

export function render(container, { state }) {
  const rows = state.audiencePacks || [];
  const k2Rows = rows.filter((row) => row.businessLine === "k-line" && row.id.startsWith("AUD-K2"));
  const selected = audienceSummary(state, rows.find((row) => row.targetCount > 0)?.id || rows[0]?.id);
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">人群圈选</p><h1>策略人群包</h1><p>按业务线、级别、产品、生命周期、分数、标签、风险和行为圈选目标人群，只输出策略包，不展示一线老师待办。</p></div>${renderBadge("info", "匿名样例")}</section>${selected ? renderMetricStrip([
    { label: "命中人数", value: `${selected.targetCount}` },
    { label: "排除人数", value: `${selected.excludedCount}`, hint: `${selected.exclusionRate}%` },
    { label: "重叠率", value: `${Math.round(selected.overlapRate * 100)}%` },
    { label: "数据新鲜度", value: selected.dataFreshness }
  ]) : ""}<section class="panel"><header class="panel__header"><h2>人群包清单</h2></header>${renderTable({ columns: [
    { key: "id", label: "人群包ID" },
    { key: "name", label: "名称" },
    { key: "businessLine", label: "业务线" },
    { key: "levelCode", label: "级别" },
    { key: "productType", label: "产品", format: productTypeLabel },
    { key: "cohortIds", label: "班期", format: joinList },
    { key: "lifecycleNodes", label: "节点", format: joinList },
    { key: "rules", label: "圈选规则", format: joinList },
    { key: "availableActions", label: "可执行动作", format: joinList },
    { key: "exclusionReasons", label: "排除原因", format: joinList },
    { key: "observationWindow", label: "观察窗" },
    { key: "targetCount", label: "命中人数" },
    { key: "excludedCount", label: "排除人数" },
    { key: "overlapRate", label: "重叠率", format: (value) => `${Math.round((value || 0) * 100)}%` },
    { key: "dataFreshness", label: "刷新" }
  ], rows })}</section>`;
  if (k2Rows.length) {
    container.innerHTML += `<section class="panel"><header class="panel__header"><div><p class="section-kicker">K2分层模拟</p><h2>K2高优与干预人群口径</h2><p>每个包都能直接对应策略动作、刷新周期和排除原因，便于数据产品确认取数。</p></div>${renderBadge("success", "分层清晰")}</header>${renderTable({ columns: [
      { key: "id", label: "人群包ID" },
      { key: "name", label: "人群名称" },
      { key: "lifecycleNodes", label: "查看节点", format: joinList },
      { key: "rules", label: "取数标准", format: joinList },
      { key: "dataFreshness", label: "刷新周期" },
      { key: "strategyId", label: "默认策略" },
      { key: "availableActions", label: "可组合动作", format: joinList },
      { key: "targetCount", label: "模拟命中" },
      { key: "excludedCount", label: "排除" }
    ], rows: k2Rows })}</section>`;
  }
}
