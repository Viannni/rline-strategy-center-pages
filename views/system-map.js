import { FEATURE_PLACEMENTS, SYSTEM_CAPABILITIES } from "../data/system-capabilities.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderPlacementPanel, renderTable } from "../ui/components.js";

export function buildSystemRows() {
  return SYSTEM_CAPABILITIES.map((capability) => ({
    ...capability,
    evidence: `路径：${capability.path}；状态取自 SYSTEM_CAPABILITIES；${capability.gaps?.join("；") || "无额外缺口说明"}`,
    placements: FEATURE_PLACEMENTS.filter((placement) => placement.capabilityId === capability.id),
    fallback: capability.id === "crm-segments"
      ? `标签优先：${capability.fallback}`
      : capability.fallback || "待配置降级方案"
  }));
}

function openSystem(row) {
  openDrawer({
    title: `${row.name} 证据与落位`, size: "wide",
    trustedHtml: `<section class="field-detail"><div><dt>状态（数据源）</dt><dd>${renderBadge(row.status, row.statusMeta?.label)}</dd></div><div><dt>观察路径</dt><dd><code>${escapeHtml(row.path)}</code></dd></div><div><dt>证据文本</dt><dd>${escapeHtml(row.evidence)}</dd></div><div><dt>已存在能力</dt><dd>${escapeHtml(row.existing.join(" / ") || "尚无已确认字段")}</dd></div><div><dt>可复用范围</dt><dd>${escapeHtml(row.reuse.join(" / ") || "待核对")}</dd></div><div><dt>待改造 / 缺口</dt><dd>${escapeHtml([...row.changes, ...row.gaps].join("；"))}</dd></div><div><dt>降级路径</dt><dd>${escapeHtml(row.fallback)}</dd></div></section>${row.placements.map((placement) => renderPlacementPanel(placement.id)).join("")}`
  });
}

function systemsTable(rows) {
  return renderTable({ caption: `现有系统 ${rows.length} 个`, columns: [
    { key: "name", label: "系统" }, { key: "path", label: "路径/入口" }, { key: "status", label: "状态（数据源）", trustedHtml: (value, row) => renderBadge(value, row.statusMeta?.label) }, { key: "evidence", label: "证据文本" }, { key: "fallback", label: "降级路径" }, { key: "id", label: "详情", trustedHtml: (value) => `<button type="button" class="compact-button" data-system-id="${escapeAttribute(value)}">查看</button>` }
  ], rows, emptyText: "没有匹配的系统" });
}

function placementTable() {
  return renderTable({ caption: `功能落位 ${FEATURE_PLACEMENTS.length} 项`, columns: [
    { key: "feature", label: "功能" }, { key: "capabilityId", label: "系统" }, { key: "status", label: "状态（数据源）", trustedHtml: (value, row) => renderBadge(value, row.statusMeta?.label) }, { key: "dependency", label: "依赖" }, { key: "fallback", label: "降级" }
  ], rows: FEATURE_PLACEMENTS, emptyText: "没有功能落位" });
}

export function render(container) {
  const rows = buildSystemRows();
  const renderFiltered = () => {
    const selected = container.querySelector("#systemStatus")?.value ?? "";
    const filtered = selected ? rows.filter((row) => row.status === selected) : rows;
    container.innerHTML = `<section class="page-header"><div><p class="section-kicker">系统能力与功能落位</p><h1>系统落位</h1><p>状态、路径和证据均直接呈现既有系统能力记录，不将入口或推断写成可用事实。</p></div>${renderBadge("info", `${filtered.length}/12`)}</section><section class="reference-notice"><strong>CRM分群 MVP</strong><span>历史实读接口返回 403；优先复用已确认的 CRM 标签（selector：scopeData），复杂分群降级为标签交集或离线名单。</span></section><div class="filter-band"><label class="filter-field"><span>状态</span><select id="systemStatus"><option value="">全部</option>${[...new Set(rows.map((row) => row.status))].map((status) => `<option value="${escapeAttribute(status)}"${status === selected ? " selected" : ""}>${escapeHtml(rows.find((row) => row.status === status).statusMeta?.label || status)}</option>`).join("")}</select></label></div><section id="systemResults">${systemsTable(filtered)}</section><section class="matrix-section"><header class="board-header"><h2>功能落位矩阵</h2><span>必须新增：统一计分、路由与F12策略</span></header>${placementTable()}</section>`;
    container.querySelector("#systemStatus")?.addEventListener("change", renderFiltered);
    container.querySelectorAll("[data-system-id]").forEach((button) => button.addEventListener("click", () => openSystem(rows.find((row) => row.id === button.dataset.systemId))));
  };
  renderFiltered();
}
