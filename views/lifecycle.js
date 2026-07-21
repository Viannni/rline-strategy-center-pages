import { FEATURE_PLACEMENTS } from "../data/system-capabilities.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderPlacementPanel } from "../ui/components.js";

const placementStatus = (id) => FEATURE_PLACEMENTS.find((item) => item.id === id)?.status ?? "entry-confirmed";
const monthlyRenewal = new Set(["T22", "T23", "T24", "T25", "T26", "T27", "T28"]);
const annualRenewal = new Set(["M8", "M9", "M10", "M11", "M12"]);

export const LIFECYCLE_PHASES = Object.freeze([
  { id: "monthly-start", product: "monthly", range: "T0-T10", label: "月课启动与习惯", note: "定级、首课、学习习惯和家长共看" },
  { id: "monthly-progress", product: "monthly", range: "T11-T21", label: "月课进阶与成果", note: "学习健康、挑战、报告和阶段规划" },
  { id: "monthly-renewal", product: "monthly", range: "T22-T28", label: "月课续费窗口", note: "固定续费提示，销售绑定仅在此窗口生效" },
  { id: "annual-growth", product: "annual", range: "M1-M7", label: "年课密集成长", note: "高密度学习激励和家长共看里程碑" },
  { id: "annual-renewal", product: "annual", range: "M8-M12", label: "年课续费与补深", note: "续费窗口、稀疏补学和虚拟装扮活动" }
]);

function stageNumber(stage) {
  return Number(String(stage).slice(1));
}

function isRenewal(product, stage) {
  return product === "monthly" ? monthlyRenewal.has(stage) : annualRenewal.has(stage);
}

function phaseFor(product, stage) {
  const number = stageNumber(stage);
  if (product === "monthly") return number <= 10 ? LIFECYCLE_PHASES[0] : number <= 21 ? LIFECYCLE_PHASES[1] : LIFECYCLE_PHASES[2];
  return number <= 7 ? LIFECYCLE_PHASES[3] : LIFECYCLE_PHASES[4];
}

export function lifecycleNode(product, stage) {
  const renewal = isRenewal(product, stage);
  const number = stageNumber(stage);
  const reportNode = product === "monthly" ? ["T7", "T14", "T20", "T24"].includes(stage) : ["M1", "M4", "M7", "M9", "M12"].includes(stage);
  const activityNode = product === "monthly" ? ["T7", "T14", "T20"].includes(stage) : number <= 8;
  const coView = product === "monthly" ? ["T0", "T7", "T14", "T20", "T24"].includes(stage) : ["M1", "M4", "M7", "M9", "M12"].includes(stage);
  const placementId = renewal ? "task-queue" : activityNode ? "activity-uplift" : "learning-data";
  const trigger = renewal
    ? "F13意向或F14交易事件，且F12准入通过"
    : reportNode ? "报告生成或测评完成" : activityNode ? "有效学习节点到达" : "课程阶段到达";
  return {
    id: `${product}-${stage}`,
    product,
    stage,
    phase: phaseFor(product, stage),
    fields: renewal ? ["F02", "F09", "F11", "F12", "F13", "F14", "F15", "F16"] : ["F02", "F04", "F05", "F06", "F08", "F09", "F10", "F11", "F15"],
    trigger,
    automatedAction: renewal
      ? "写入固定续费提示、校验F12；F14命中后生成对应优先级任务"
      : activityNode ? "推送端内活动或学习提醒；IN_APP结果进入F10" : "更新阶段、学习健康和待办提示",
    humanAction: renewal
      ? "学服完成学情共看；仅窗口内由已绑定二销承接可跟进用户"
      : coView ? "引导家长与孩子共同查看报告/测评里程碑" : "学服按异常学习或体验结论跟进",
    owner: renewal ? "学服主责，已绑定二销协同" : "学服 / 运营",
    support: renewal ? "销售运营、CRM、订单支付" : "教务、运营、CRM",
    placementId,
    placementStatus: placementStatus(placementId),
    salesBinding: renewal,
    acceptanceKpi: renewal ? "模拟数据：F12通过后任务SLA、券/订单状态和结构化回写可追溯" : "模拟数据：节点触达、有效学习/活动完成和家长共看回传可追溯",
    markers: [reportNode && "报告/测评", activityNode && "端内活动", coView && "亲子共看", renewal && "续费提示"].filter(Boolean)
  };
}

function allNodes(product) {
  const last = product === "monthly" ? 28 : 12;
  const prefix = product === "monthly" ? "T" : "M";
  return Array.from({ length: last + (product === "monthly" ? 1 : 0) }, (_, index) => lifecycleNode(product, `${prefix}${product === "monthly" ? index : index + 1}`));
}

function openNode(node) {
  openDrawer({
    title: `${node.product === "monthly" ? "月课" : "年课"} ${node.stage} 节点详情`,
    size: "wide",
    trustedHtml: `<section class="field-detail lifecycle-detail"><div><dt>所属阶段</dt><dd>${escapeHtml(node.phase.range)} · ${escapeHtml(node.phase.label)}</dd></div><div><dt>销售绑定</dt><dd>${node.salesBinding ? "是，仅续费窗口" : "否，不绑定销售"}</dd></div><div><dt>字段</dt><dd>${escapeHtml(node.fields.join(" / "))}</dd></div><div><dt>触发条件</dt><dd>${escapeHtml(node.trigger)}</dd></div><div><dt>自动动作</dt><dd>${escapeHtml(node.automatedAction)}</dd></div><div><dt>人工动作</dt><dd>${escapeHtml(node.humanAction)}</dd></div><div><dt>主责 / 支持</dt><dd>${escapeHtml(`${node.owner} / ${node.support}`)}</dd></div><div><dt>系统状态</dt><dd>${renderBadge(node.placementStatus)}</dd></div><div><dt>验收KPI</dt><dd>${escapeHtml(node.acceptanceKpi)}</dd></div></section>${renderPlacementPanel(node.placementId)}`
  });
}

function renderTimeline(product) {
  const nodes = allNodes(product);
  return LIFECYCLE_PHASES.filter((phase) => phase.product === product).map((phase) => {
    const phaseNodes = nodes.filter((node) => node.phase.id === phase.id);
    return `<section class="lifecycle-phase"><header><div><p class="section-kicker">${escapeHtml(phase.range)}</p><h2>${escapeHtml(phase.label)}</h2><p>${escapeHtml(phase.note)}</p></div>${renderBadge(phase.id.includes("renewal") ? "warning" : "info", phase.id.includes("renewal") ? "续费窗口" : "学习窗口")}</header><div class="lifecycle-track" aria-label="${escapeAttribute(phase.range)}节点">${phaseNodes.map((node) => `<button type="button" class="lifecycle-node${node.salesBinding ? " is-renewal" : ""}" data-lifecycle-node="${escapeAttribute(node.id)}"><strong>${escapeHtml(node.stage)}</strong><span>${escapeHtml(node.markers.join(" · ") || "阶段更新")}</span><small>${node.salesBinding ? "销售绑定" : "学服/运营"}</small></button>`).join("")}</div></section>`;
  }).join("");
}

export function render(container) {
  const nodes = [...allNodes("monthly"), ...allNodes("annual")];
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">全周期节点参考</p><h1>生命周期</h1><p>销售绑定只在月课 T22-T28 和年课 M8-M12 的续费窗口内出现；其余节点由学服/运营承接。</p></div>${renderBadge("info", `${nodes.length} 个节点`)}</section><section class="reference-notice"><strong>口径</strong><span>节点动作、字段和验收均为产研核对参考；系统状态来自既有落位证据。</span></section><section class="lifecycle-board" aria-label="月课生命周期"><header class="board-header"><h2>月课 T0-T28</h2><span>T0-T10 / T11-T21 / T22-T28</span></header>${renderTimeline("monthly")}</section><section class="lifecycle-board" aria-label="年课生命周期"><header class="board-header"><h2>年课 M1-M12</h2><span>M1-M7 / M8-M12</span></header>${renderTimeline("annual")}</section>`;
  container.querySelectorAll("[data-lifecycle-node]").forEach((button) => button.addEventListener("click", () => {
    const node = nodes.find((item) => item.id === button.dataset.lifecycleNode);
    if (node) openNode(node);
  }));
}
