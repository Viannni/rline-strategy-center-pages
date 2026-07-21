import { FIELD_DEFINITIONS } from "../data/rules.js";
import { FEATURE_PLACEMENTS } from "../data/system-capabilities.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderPlacementPanel, renderTable } from "../ui/components.js";

const SEMANTICS = Object.freeze({
  F12: "触达准入：实时频控/豁免校验，不进入基础分",
  F13: "独立营销意向：点击/问价/预约事件，独立于基础高优分",
  F14: "独立交易状态：券、订单、支付结果，续费窗口内才生成二销任务",
  F16: "结构化回写：保存触达结果；次日校准基础分，实时更新F13/F14/F15"
});
const WINDOWS = Object.freeze({ F01: "全量主键映射", F02: "当前生命周期", F03: "当前课程", F04: "当前课程累计", F05: "近7日", F06: "连续观察", F07: "最近课程节点", F08: "节点后", F09: "报告生成后", F10: "活动周期", F11: "实时/近30日", F12: "触达前即时", F13: "同曝光活动窗口", F14: "订单/支付实时", F15: "风险未关闭期间", F16: "实时与次日" });
const DOWNSTREAM = Object.freeze({ F01: "数据异常池、所有关联", F02: "生命周期、路由", F03: "基础分、学习规划", F04: "基础分、学习健康", F05: "基础分、学习健康", F06: "漏学任务、路由", F07: "基础分、体验复盘", F08: "基础分、提分运营", F09: "基础分、报告任务", F10: "F10提分、活动复盘", F11: "基础分、触达任务", F12: "进线中心、任务准入", F13: "营销优先级、复盘", F14: "交易优先级、二销任务", F15: "风险冻结、售后", F16: "任务台、次日重算" });
const PLACEMENTS = Object.freeze({ F01: "scoring-routing", F02: "learning-data", F03: "learning-data", F04: "learning-data", F05: "learning-data", F06: "learning-data", F07: "learning-data", F08: "learning-data", F09: "learning-data", F10: "activity-uplift", F11: "touch-feedback", F12: "routing-policy", F13: "activity-uplift", F14: "scoring-routing", F15: "risk-fuse", F16: "touch-feedback" });

export function buildFieldRows(definitions = FIELD_DEFINITIONS) {
  return definitions.map((field) => ({
    ...field,
    semantic: SEMANTICS[field.id] ?? (field.scoreRole === "base" ? "基础评分字段" : field.scoreRole === "foundation" ? "数据关联基础" : `评分角色：${field.scoreRole}`),
    window: WINDOWS[field.id] ?? "当前有效窗口",
    downstream: DOWNSTREAM[field.id] ?? "策略页面待配置",
    placement: PLACEMENTS[field.id] ?? "scoring-routing",
    placementStatus: FEATURE_PLACEMENTS.find((item) => item.id === PLACEMENTS[field.id])?.status ?? "entry-confirmed"
  }));
}

function openField(row) {
  openDrawer({ title: `${row.id} · ${row.name}`, size: "wide", trustedHtml: `<section class="field-detail"><div><dt>业务语义</dt><dd>${escapeHtml(row.semantic)}</dd></div><div><dt>技术字段</dt><dd><code>${escapeHtml(row.technicalField)}</code></dd></div><div><dt>来源 / 刷新</dt><dd>${escapeHtml(`${row.source} / ${row.refresh}`)}</dd></div><div><dt>观察窗口</dt><dd>${escapeHtml(row.window)}</dd></div><div><dt>进分角色</dt><dd>${escapeHtml(row.scoreRole)}</dd></div><div><dt>缺失处理</dt><dd>${escapeHtml(row.missing)}</dd></div><div><dt>可用状态</dt><dd>${renderBadge(row.availability)}</dd></div><div><dt>Owner</dt><dd>${escapeHtml(row.owner)}</dd></div><div><dt>下游</dt><dd>${escapeHtml(row.downstream)}</dd></div><div><dt>落位 / 变更</dt><dd>${escapeHtml(row.placement)}</dd></div></section>${renderPlacementPanel(row.placement)}` });
}

function fieldTable(rows) {
  return renderTable({ caption: `字段契约 ${rows.length} 条`, columns: [
    { key: "id", label: "字段" }, { key: "name", label: "名称" }, { key: "technicalField", label: "技术字段" }, { key: "scoreRole", label: "进分角色" }, { key: "source", label: "来源" }, { key: "refresh", label: "刷新" }, { key: "availability", label: "可用", trustedHtml: (value) => renderBadge(value) }, { key: "owner", label: "Owner" }, { key: "id", label: "详情", trustedHtml: (value) => `<button type="button" class="compact-button" data-field-id="${escapeAttribute(value)}">查看</button>` }
  ], rows, emptyText: "没有匹配的字段契约" });
}

export function render(container) {
  const rows = buildFieldRows();
  const renderFiltered = () => {
    const filters = Object.fromEntries(new FormData(container.querySelector("#fieldFilters") ?? new FormData()).entries());
    const filtered = rows.filter((row) => (!filters.role || row.scoreRole === filters.role) && (!filters.refresh || row.refresh === filters.refresh) && (!filters.source || row.source === filters.source) && (!filters.status || row.availability === filters.status));
    container.innerHTML = `<section class="page-header"><div><p class="section-kicker">F01-F16字段契约</p><h1>数据底座</h1><p>字段语义、技术名、观察窗口、缺失处理和落位在同一张产研核对表中。</p></div>${renderBadge("info", `${filtered.length}/16`)}</section><form id="fieldFilters" class="filter-band" aria-label="字段筛选"><label class="filter-field"><span>进分角色</span><select name="role"><option value="">全部</option>${[...new Set(rows.map((row) => row.scoreRole))].map((value) => `<option value="${escapeAttribute(value)}"${filters.role === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label class="filter-field"><span>刷新周期</span><select name="refresh"><option value="">全部</option>${[...new Set(rows.map((row) => row.refresh))].map((value) => `<option value="${escapeAttribute(value)}"${filters.refresh === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label class="filter-field"><span>来源</span><select name="source"><option value="">全部</option>${[...new Set(rows.map((row) => row.source))].map((value) => `<option value="${escapeAttribute(value)}"${filters.source === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label class="filter-field"><span>可用状态</span><select name="status"><option value="">全部</option>${[...new Set(rows.map((row) => row.availability))].map((value) => `<option value="${escapeAttribute(value)}"${filters.status === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label></form><section class="reference-notice"><strong>关键边界</strong><span>F12 是触达准入；F13 是独立营销意向；F14 是独立交易状态；F16 是结构化任务回写。</span></section><section id="fieldResults">${fieldTable(filtered)}</section>`;
    container.querySelectorAll("#fieldFilters select").forEach((select) => select.addEventListener("change", renderFiltered));
    container.querySelectorAll("[data-field-id]").forEach((button) => button.addEventListener("click", () => openField(rows.find((row) => row.id === button.dataset.fieldId))));
  };
  renderFiltered();
}
