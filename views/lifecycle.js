import { FEATURE_PLACEMENTS } from "../data/system-capabilities.js";
import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderMetricStrip, renderPlacementPanel, renderTable } from "../ui/components.js";

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
      ? "已绑定二销承接全部文字和电话沟通；学情沟通组按内部支持任务补充专业结论"
      : coView ? "引导家长与孩子共同查看报告/测评里程碑" : "学服按异常学习或体验结论跟进",
    owner: renewal ? "已绑定二销主责" : "学服 / 运营",
    support: renewal ? "学情沟通组、销售运营、CRM、订单支付" : "教务、运营、CRM",
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

export function render(container, { state }) {
  const templates = state.lifecycleTemplates || [];
  const assets = state.strategyAssets || [];
  const templateById = (id) => templates.find((template) => template.id === id);
  const nodesFor = (asset, line) => asset.target?.businessLines?.includes(line)
    ? asset.target.lifecycleNodes || []
    : [];
  const densityFor = (line) => assets.flatMap((asset) => nodesFor(asset, line)).reduce((counts, node) => {
    counts[node] = (counts[node] || 0) + 1;
    return counts;
  }, {});
  const coverageRows = [
    { line: "r-line", name: "R线", templates: [templateById("monthly-t"), templateById("annual-m")].filter(Boolean), support: "完整样板" },
    { line: "k-line", name: "K线", templates: [templateById("custom-k")].filter(Boolean), support: "中心化SOP模板" },
    { line: "e-line", name: "E线", templates: [], support: "结构/待模板：按策略资产目标节点派生" }
  ].map((line) => {
    const density = densityFor(line.line);
    const templateNodes = line.templates.flatMap((template) => template.nodes || []);
    const derivedNodes = Object.keys(density);
    const nodes = templateNodes.length ? templateNodes : derivedNodes;
    const blankNodes = templateNodes.filter((node) => !density[node]);
    const overCovered = Object.entries(density).filter(([, count]) => count > 1);
    return {
      id: line.line,
      name: line.name,
      support: line.support,
      strategyCount: assets.filter((asset) => nodesFor(asset, line.line).length).length,
      coveredNodes: derivedNodes.join(" / ") || "暂无策略节点",
      density: Object.entries(density).map(([node, count]) => `${node}(${count})`).join(" / ") || "0",
      blank: templateNodes.length ? `${blankNodes.length}个：${blankNodes.join(" / ") || "无"}` : "结构/待模板，待定义空白节点",
      overCoverage: overCovered.length ? `过密：${overCovered.map(([node, count]) => `${node}(${count})`).join(" / ")}` : "无过密",
      templateNodes: nodes.join(" / ") || "由策略资产派生"
    };
  });
  const templateRows = templates.map((template) => ({
    name: template.name,
    nodes: template.nodes.join(" / "),
    renewalWindow: template.renewalWindow.join(" - "),
    status: template.id === "monthly-t" || template.id === "annual-m" ? "R线样板可用" : "结构样例"
  }));

  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">生命周期</p><h1>策略覆盖地图</h1><p>生命周期页不再是一线服务流程，而是用来查看各业务线节点策略密度、空白和过密风险。</p></div>${renderBadge("info", "多业务线")}</section>${renderMetricStrip([
    { label: "月课模板", value: "T0-T28" },
    { label: "年课模板", value: "M1-M12" },
    { label: "覆盖策略", value: `${assets.length}` },
    { label: "扩展模板", value: "K线中心化SOP模板" }
  ])}<section class="panel"><header class="panel__header"><div><p class="section-kicker">节点覆盖</p><h2>R / K / E 策略密度</h2><p>节点密度为命中该节点的策略数；多个策略同节点时标记为过密。</p></div></header>${renderTable({ columns: [
    { key: "name", label: "业务线" },
    { key: "support", label: "支持状态" },
    { key: "strategyCount", label: "策略数" },
    { key: "coveredNodes", label: "已覆盖节点" },
    { key: "density", label: "节点密度" },
    { key: "blank", label: "空白节点" },
    { key: "overCoverage", label: "过密提示" }
  ], rows: coverageRows })}</section><section class="panel"><header class="panel__header"><h2>生命周期模板</h2></header>${renderTable({ columns: [
    { key: "name", label: "模板" },
    { key: "nodes", label: "关键节点" },
    { key: "renewalWindow", label: "续费窗口" },
    { key: "status", label: "状态" }
  ], rows: templateRows })}</section>`;
}
