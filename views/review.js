import { escapeAttribute, escapeHtml, renderBadge, renderTable } from "../ui/components.js";

const simulated = (value) => `模拟数据 · ${value}`;
const withSimulation = (rows) => rows.map((row) => ({ ...row, simulationLabel: "模拟数据" }));

export function buildReviewTables() {
  return [
    { id: "high-priority", title: "高优池效果", description: "H1/H2池从入池到支付/风险拦截的模拟漏斗", filterKeys: ["product", "stage", "activity", "team"], simulated: true, rows: withSimulation([{ product: "monthly", stage: "T22-T28", activity: "续费提示", team: "sales", pool: simulated("128"), contacted: simulated("96"), paid: simulated("31"), risk: simulated("7") }, { product: "annual", stage: "M8-M12", activity: "续费提示", team: "sales", pool: simulated("84"), contacted: simulated("65"), paid: simulated("21"), risk: simulated("4") }]) },
    { id: "h3-migration", title: "H3提分迁移", description: "端内提分活动前后的模拟迁移", filterKeys: ["product", "stage", "activity", "team"], simulated: true, rows: withSimulation([{ product: "monthly", stage: "T11-T21", activity: "连续学习挑战", team: "learning", entered: simulated("76"), h2up: simulated("19"), retained: simulated("42"), manual: simulated("12") }, { product: "annual", stage: "M1-M8", activity: "持续学习价值活动", team: "learning", entered: simulated("112"), h2up: simulated("32"), retained: simulated("58"), manual: simulated("18") }]) },
    { id: "task-effectiveness", title: "任务有效性", description: "任务闭环、回写质量和下一步动作的模拟表现", filterKeys: ["product", "stage", "activity", "team"], simulated: true, rows: withSimulation([{ product: "monthly", stage: "T22-T28", activity: "学情共看", team: "learning", issued: simulated("93"), completed: simulated("71"), valid: simulated("54"), withinSla: simulated("61") }, { product: "annual", stage: "M8-M12", activity: "补学活动", team: "agent", issued: simulated("64"), completed: simulated("49"), valid: simulated("35"), withinSla: simulated("43") }]) },
    { id: "misclassification", title: "误判 / 漏判", description: "高优、风险与活动判定的模拟核验结果", filterKeys: ["product", "stage", "activity", "team"], simulated: true, rows: withSimulation([{ product: "monthly", stage: "T22-T28", activity: "续费提示", team: "strategy", falsePositive: simulated("8"), falseNegative: simulated("11"), reason: "模拟数据 · 同曝光不足/回写延迟" }, { product: "annual", stage: "M8-M12", activity: "虚拟装扮", team: "strategy", falsePositive: simulated("5"), falseNegative: simulated("9"), reason: "模拟数据 · 活动结果未回写" }]) }
  ];
}

function columnsFor(table) {
  const metrics = Object.keys(table.rows[0]).filter((key) => !["product", "stage", "activity", "team", "simulationLabel", "reason"].includes(key));
  return [{ key: "product", label: "课程" }, { key: "stage", label: "阶段" }, { key: "activity", label: "活动" }, { key: "team", label: "团队" }, ...metrics.map((key) => ({ key, label: key })), ...(table.rows[0].reason ? [{ key: "reason", label: "原因" }] : []), { key: "simulationLabel", label: "数据标记", trustedHtml: (value) => renderBadge("info", value) }];
}

export function render(container) {
  const tables = buildReviewTables();
  const renderFiltered = () => {
    const form = container.querySelector("#reviewFilters");
    const filters = form ? Object.fromEntries(new FormData(form).entries()) : {};
    const match = (row) => ["product", "stage", "activity", "team"].every((key) => !filters[key] || row[key] === filters[key]);
    const allRows = tables.flatMap((table) => table.rows);
    const filter = (key, label) => `<label class="filter-field"><span>${label}</span><select name="${key}"><option value="">全部</option>${[...new Set(allRows.map((row) => row[key]))].map((value) => `<option value="${escapeAttribute(value)}"${filters[key] === value ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>`;
    container.innerHTML = `<section class="page-header"><div><p class="section-kicker">固定复盘矩阵</p><h1>效果复盘</h1><p>所有数字均为模拟数据，用于核对复盘口径、筛选维度和下钻字段，不代表线上结果。</p></div>${renderBadge("info", "全部为模拟数据")}</section><form id="reviewFilters" class="filter-band" aria-label="复盘筛选">${filter("product", "课程")}${filter("stage", "阶段")}${filter("activity", "活动")}${filter("team", "团队")}</form><div class="review-table-stack">${tables.map((table) => { const rows = table.rows.filter(match); return `<section class="matrix-section"><header class="board-header"><div><h2>${escapeHtml(table.title)}</h2><p>${escapeHtml(table.description)}</p></div>${renderBadge("info", "模拟数据")}</header>${renderTable({ caption: table.title, columns: columnsFor(table), rows, emptyText: "没有符合筛选条件的模拟数据" })}</section>`; }).join("")}</div>`;
    container.querySelectorAll("#reviewFilters select").forEach((select) => select.addEventListener("change", renderFiltered));
  };
  renderFiltered();
}
