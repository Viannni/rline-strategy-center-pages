import { serializeCsv } from "../core/import-export.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderTable, toast } from "../ui/components.js";

export const DEMAND_ROWS = Object.freeze([
  { id: "unified-id", priority: "P0", department: "数据", existing: "跨系统主键待映射", add: "统一用户ID与映射表", change: "学习/订单/CRM按user_id关联", dependencies: "主数据、教务、CRM", owner: "数据产品", acceptance: "同一用户跨系统可追溯", status: "待排期", fallback: "离线映射宽表" },
  { id: "scoring", priority: "P0", department: "数据平台", existing: "无统一规则引擎", add: "规则计算、H层级、路由", change: "支持日快照和实时信号覆盖", dependencies: "字段契约、事件流", owner: "数据平台", acceptance: "分数/路由可逐项解释", status: "待评估", fallback: "离线规则+定时导入" },
  { id: "crm-tags", priority: "P0", department: "CRM", existing: "scopeData标签选择器已观察", add: "R线标签字典", change: "刷新周期与营销读取延迟", dependencies: "统一ID、规则结果", owner: "CRM产品", acceptance: "H层级/风险标签可检索", status: "可复用待配置", fallback: "标签优先，不等复杂分群" },
  { id: "task-fields", priority: "P0", department: "销售运营", existing: "应用入口待核对", add: "任务触发原因/SLA/回写字段", change: "三类队列与结构化枚举", dependencies: "F12、路由、CRM", owner: "销售产品", acceptance: "角色可见任务证据与F16回写", status: "待核对", fallback: "任务表+固定模板" },
  { id: "risk-writeback", priority: "P0", department: "售后/工单", existing: "投诉退款入口待核对", add: "风险实时回写", change: "销售冻结与解除权限", dependencies: "统一ID、工单事件", owner: "学服产品", acceptance: "F15命中停止销售任务", status: "待核对", fallback: "每日风险名单人工冻结" },
  { id: "activity-writeback", priority: "P0", department: "营销中心", existing: "/m/marketing/operation/activity", add: "用户级活动结果回写", change: "act code与R线标签规范", dependencies: "统一ID、活动事件", owner: "活动产品", acceptance: "IN_APP结果按用户/活动/时间回写", status: "需改造", fallback: "按日导入活动宽表" },
  { id: "daily-score-snapshot", priority: "P0", department: "数据看板", existing: "看板入口待核对", add: "每日分数快照", change: "活动ID/任务ID/支付关联", dependencies: "规则计算、统一ID", owner: "数据产品", acceptance: "复盘可下钻用户快照", status: "待核对", fallback: "固定宽表首版报表" },
  { id: "complex-segmentation", priority: "P1", department: "CRM", existing: "userGroupIdList历史403", add: "复杂组合分群读取权限", change: "组合条件可追溯", dependencies: "CRM权限管理员", owner: "CRM产品", acceptance: "分群可复现", status: "阻塞", fallback: "标签交集或离线名单" },
  { id: "front-entry", priority: "P1", department: "前台产品", existing: "业务卡片入口待核对", add: "曝光/点击/兑换事件", change: "按生命周期定向", dependencies: "统一ID、活动回写", owner: "前台产品", acceptance: "F13和F14事件回传", status: "待核对", fallback: "固定节点全量卡片" }
]);

export function demandCsvRows(rows = DEMAND_ROWS) {
  return rows.map((row) => ({ "优先级": row.priority, "部门": row.department, "现有能力": row.existing, "需要新增": row.add, "需要变化": row.change, "依赖": row.dependencies, "负责人": row.owner, "验收标准": row.acceptance, "状态": row.status, "降级方案": row.fallback }));
}

function openDemand(row) {
  openDrawer({ title: `${row.priority} · ${row.id}`, size: "wide", trustedHtml: `<section class="field-detail"><div><dt>部门 / Owner</dt><dd>${escapeHtml(`${row.department} / ${row.owner}`)}</dd></div><div><dt>现有能力</dt><dd>${escapeHtml(row.existing)}</dd></div><div><dt>新增 / 变化</dt><dd>${escapeHtml(`${row.add}；${row.change}`)}</dd></div><div><dt>依赖</dt><dd>${escapeHtml(row.dependencies)}</dd></div><div><dt>验收</dt><dd>${escapeHtml(row.acceptance)}</dd></div><div><dt>状态</dt><dd>${escapeHtml(row.status)}</dd></div><div><dt>降级</dt><dd>${escapeHtml(row.fallback)}</dd></div></section>` });
}

function downloadCsv(rows) {
  const blob = new Blob([`\uFEFF${serializeCsv(demandCsvRows(rows))}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rline-cross-department-demands.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function render(container) {
  const renderFiltered = () => {
    const form = container.querySelector("#demandFilters");
    const filters = form ? Object.fromEntries(new FormData(form).entries()) : {};
    const rows = DEMAND_ROWS.filter((row) => (!filters.priority || row.priority === filters.priority) && (!filters.department || row.department === filters.department) && (!filters.status || row.status === filters.status));
    const option = (key, label) => `<label class="filter-field"><span>${label}</span><select name="${key}"><option value="">全部</option>${[...new Set(DEMAND_ROWS.map((row) => row[key]))].map((value) => `<option value="${escapeAttribute(value)}"${filters[key] === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>`;
    container.innerHTML = `<section class="page-header"><div><p class="section-kicker">跨部门依赖与验收</p><h1>提需清单</h1><p>P0 优先锁定统一ID、计分、标签、任务、风险、活动回写和每日分数快照；导出会对动态字段进行公式安全转义。</p></div><button id="exportDemandCsv" type="button" class="primary-button">导出 CSV</button></section><form id="demandFilters" class="filter-band" aria-label="提需筛选">${option("priority", "优先级")}${option("department", "部门")}${option("status", "状态")}</form><section class="demand-table">${renderTable({ caption: `提需 ${rows.length} 条`, columns: [{ key: "priority", label: "优先级", trustedHtml: (value) => renderBadge(value === "P0" ? "danger" : "warning", value) }, { key: "department", label: "部门" }, { key: "existing", label: "现有能力" }, { key: "add", label: "需要新增" }, { key: "change", label: "需要变化" }, { key: "dependencies", label: "依赖" }, { key: "owner", label: "负责人" }, { key: "acceptance", label: "验收标准" }, { key: "status", label: "状态" }, { key: "fallback", label: "降级方案" }, { key: "id", label: "详情", trustedHtml: (value) => `<button type="button" class="compact-button" data-demand-id="${escapeAttribute(value)}">查看</button>` }], rows, emptyText: "没有匹配的提需" })}</section>`;
    container.querySelectorAll("#demandFilters select").forEach((select) => select.addEventListener("change", renderFiltered));
    container.querySelector("#exportDemandCsv")?.addEventListener("click", () => { downloadCsv(rows); toast(`已导出 ${rows.length} 条提需。`, "success"); });
    container.querySelectorAll("[data-demand-id]").forEach((button) => button.addEventListener("click", () => openDemand(DEMAND_ROWS.find((row) => row.id === button.dataset.demandId))));
  };
  renderFiltered();
}
