import { escapeAttribute, escapeHtml, renderBadge } from "../ui/components.js";
import { renderBarChart, renderLineChart } from "./rline-charts.js?v=20260930-integrated";

const ACTION_STORAGE_KEY = "rline-workbench-effectiveness-actions-v1";
const DEFAULT_ACTIONS = [
  { id: "daily-push", action: "APP Push日督学", owner: "运营+产品", target: "验证19:00/20:00/不触达对照", evidence: "日终回流率、完课率", status: "验证中", result: "动作已配置，等待分组回写" },
  { id: "makeup", action: "补读提醒", owner: "老师组长", target: "召回昨日未完成用户", evidence: "补读人数、补读完成率", status: "待回写", result: "需要主管日报和发送记录" },
  { id: "reward", action: "完课奖励", owner: "产品+运营", target: "提升D4-D5回流和完课", evidence: "奖励组/非奖励组完课差", status: "有风险", result: "R2公共素材偶发报错" },
  { id: "report", action: "首周反馈", owner: "运营+教研", target: "把首周结果转成家庭复盘", evidence: "反馈查看率、次日参与", status: "验证中", result: "需要补齐反馈触达证据" }
];

function readActions() {
  try {
    const value = JSON.parse(window.localStorage.getItem(ACTION_STORAGE_KEY) || "null");
    return Array.isArray(value) ? value : DEFAULT_ACTIONS.map((item) => ({ ...item }));
  } catch { return DEFAULT_ACTIONS.map((item) => ({ ...item })); }
}
function saveActions(items) {
  try { window.localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(items)); } catch {}
}
function value(value, suffix = "") { return value === null || value === undefined || value === "" ? "暂无数据" : `${value}${suffix}`; }
function statusClass(status) { return status === "有风险" ? "is-alert" : status === "已验证" ? "is-good" : ""; }
function latestWeekly(snapshot) {
  const comparison = snapshot.weekly?.comparison || [];
  return comparison.map((item) => ({ label: item.label, actual: item.actual, target: item.reference, gap: item.actual === null ? null : Number(item.actual) - Number(item.reference) }));
}
function reportText(snapshot) {
  const rows = latestWeekly(snapshot);
  const bad = rows.filter((row) => row.gap !== null && row.gap < 0);
  if (!rows.length) return "周度结果待回填，暂不形成动作有效性结论。";
  if (!bad.length) return "本周核心指标均达到目标，继续观察动作是否可复制到下一班期。";
  return `${bad.map((row) => `${row.label}低于目标${Math.abs(row.gap).toFixed(1)}pp`).join("、")}；效果分析需要继续补齐触达、回流和完课的动作证据。`;
}

export function renderEffectiveness(snapshot) {
  const actions = readActions();
  const weekly = latestWeekly(snapshot);
  const statusCount = ["已验证", "验证中", "待回写", "有风险"].map((status) => ({ status, count: actions.filter((item) => item.status === status).length }));
  const weeklyChart = renderBarChart({ title: "本周结果与目标", subtitle: "周汇总实际与目标差值；空缺不按0计算", labels: weekly.map((row) => row.label.replace("周", "")), datasets: [{ label: "实际", data: weekly.map((row) => row.actual), color: "#238a73" }, { label: "目标", data: weekly.map((row) => row.target), color: "#d59627", dashed: true }], yMax: 100, unit: "%", decimals: 1, showValues: true, emptyLabel: weekly.some((row) => row.actual === null) ? "周数据待回填" : "" });
  const actionChart = renderBarChart({ title: "策略动作回写状态", subtitle: "没有回写证据的动作不能判定为有效", labels: statusCount.map((item) => item.status), datasets: [{ label: "动作数", data: statusCount.map((item) => item.count), color: "#4c78c8" }], yMax: Math.max(4, actions.length), unit: "项", decimals: 0, showValues: true });
  const actionRows = actions.map((item, index) => `<article class="rline-effectiveness-row ${statusClass(item.status)}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item.action)}</strong><small>负责人：${escapeHtml(item.owner)} · 状态：${escapeHtml(item.status)}</small><p>目标：${escapeHtml(item.target)}；验证：${escapeHtml(item.evidence)}；当前结果：${escapeHtml(item.result)}</p></div></article>`).join("");
  return `<div class="rline-tab-content"><section class="rline-strategy-hero"><div><p class="section-kicker">R线策略工作台 · 效果分析</p><h1>效果分析</h1><p>${escapeHtml(reportText(snapshot))}</p></div>${renderBadge(actions.some((item) => item.status === "有风险") ? "warning" : "info", `${actions.length}项动作`)}</section><section class="rline-kpi-grid"><article class="rline-kpi rline-kpi--teal"><span>本周目标差值</span><strong>${weekly.filter((row) => row.gap !== null).length ? `${weekly.filter((row) => row.gap !== null && row.gap < 0).length}项未达标` : "暂无数据"}</strong><small>按周汇总指标判断</small></article><article class="rline-kpi rline-kpi--blue"><span>动作总数</span><strong>${actions.length}</strong><small>策略设置中的验证动作</small></article><article class="rline-kpi rline-kpi--amber"><span>待回写</span><strong>${actions.filter((item) => item.status === "待回写").length}</strong><small>需要补齐发送/触达/结果</small></article><article class="rline-kpi rline-kpi--coral"><span>风险动作</span><strong>${actions.filter((item) => item.status === "有风险").length}</strong><small>需要协同处理</small></article></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">领导先看</p><h2>结果差值与动作证据</h2></div>${renderBadge("info", "周维度")}</header><div class="rline-chart-grid rline-report-chart-grid">${weeklyChart}${actionChart}</div></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">动作回写</p><h2>策略动作按顺序追踪</h2><p>只有“目标—动作—证据—结果”闭合，才进入下周默认SOP。</p></div></header><div class="rline-effectiveness-list">${actionRows}</div></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">效果判断</p><h2>本周判断</h2></div></header><div class="rline-effectiveness-conclusion"><p>${escapeHtml(reportText(snapshot))}</p><p>下周动作优先级：先补齐有结果指标的动作回写，再对未达标指标调整触达对象、时间、内容或承接路径。</p></div></section></div>`;
}

export function bindEffectivenessActions() {
  saveActions(readActions());
}
