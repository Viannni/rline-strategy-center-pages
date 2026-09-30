import { escapeAttribute, escapeHtml, renderBadge } from "../ui/components.js";
import { renderBarChart, renderLineChart } from "./rline-charts.js?v=20260929-bar-values";
import { ALL_COHORTS, dayEndRecords, summarizeHistory } from "../history.js";
import { buildArchiveEntry, normalizeQAEntries, parseUploadedText } from "../modules/rline-input-store.js?v=20260929-input-qa";
import { buildWeeklyReport, progressOverview } from "../reporting.js";

const IP_ROWS = [
  ["R1-2期", "Kitty", 32.06, 30.72], ["R1-2期", "Taby", 36.47, 35.27],
  ["R2-2期", "Kitty", 32.54, 30.14], ["R2-2期", "Taby", 35.94, 34.38]
];

export const DEFAULT_PROJECTS = Object.freeze([
  { id: "sop", title: "R线首版SOP与期分群", goal: "让老师能按班期、人群直接执行并回收结果", status: "已验收", progress: 100, owner: "运营", collaborators: "老师组长", dueDate: "2026-09-25", output: "动态SOP、私信和跟进策略已配置下发，期分群可在工作台查看。", blocker: "", next: "沉淀为默认SOP并按周复盘。", acceptance: "任务下发成功率、分群命中率达标并完成一次周复盘。" },
  { id: "push", title: "APP Push日督学与周督学", goal: "验证触达时间对回流和完课的影响", status: "验证中", progress: 80, owner: "运营", collaborators: "产品、老师组长", dueDate: "2026-10-02", output: "19:00及晚间督学已配置，待回收分组结果。", blocker: "触达组、回流和完课的动作ID还没有完全回写。", next: "对19:00、20:00和不触达做对照，按24:00回收。", acceptance: "2小时/6小时/当日回流率和完课率完成对照。" },
  { id: "bi", title: "策略有效性看板与日周月口径", goal: "让周报可以追溯到日数据、动作和结果", status: "验证中", progress: 60, owner: "数据+产品", collaborators: "运营、BI", dueDate: "2026-10-09", output: "班期筛选和基础看板已验证，日终历史已留存。", blocker: "动作ID、触达、回流、完课链路仍需补齐，周/月口径待验证。", next: "补齐动作回写字段并验证日、周、月三种视图。", acceptance: "数据齐全率、策略归因覆盖率达到约定口径。" },
  { id: "course", title: "课程QA优化", goal: "降低课程难度、复习和互动问题对深度/完课的影响", status: "待协同", progress: 45, owner: "教研+运营", collaborators: "教研、产品、老师", dueDate: "2026-10-09", output: "课程难度、复习、互动、开口问题已整理并形成反馈清单。", blocker: "需要教研确认R1词汇、复述、游戏和复习环节的改版方案。", next: "确认改版方案、试投一节并对比深度和负向反馈。", acceptance: "方案上线并有一轮对照数据，负向反馈和深度变化可解释。" },
  { id: "asset", title: "动态SOP公共素材与奖励物料", goal: "保证任务稳定下发，并验证奖励对回流的作用", status: "有风险", progress: 65, owner: "产品+运营", collaborators: "产品、设计、运营", dueDate: "2026-10-02", output: "表扬及奖励图片已提需并出图。", blocker: "R2公共素材偶发报错，可能导致任务下发失败。", next: "修复素材引用并观察奖励后回流与完课。", acceptance: "素材下发成功率稳定，奖励组与非奖励组形成结果对照。" },
  { id: "renewal-live", title: "续费链接与10月15日直播", goal: "完成续费承接和直播触达的业务配置", status: "待协同", progress: 50, owner: "销售+中台", collaborators: "销售、直播、中台", dueDate: "2026-10-12", output: "通用链接及直播二维码、宣传物料已提需沟通。", blocker: "不同学习状态的购买价格、链接规则和直播物料仍待确认。", next: "完成链接规则确认、直播物料配置和报名链路验收。", acceptance: "链接可用率、直播报名数、到课数完成回传。" }
]);

const pct = (value, decimals = 2) => value === null || value === undefined || !Number.isFinite(Number(value)) ? "暂无数据" : `${Number(value).toFixed(decimals)}%`;
const delta = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? "暂无数据" : `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}pp`;
const countText = (value) => value === null || value === undefined ? "暂无数据" : `${Number(value).toFixed(0)}人`;
const card = (name, text, tone = "") => `<article class="rline-weekly-insight ${tone}"><span>${escapeHtml(name)}</span><p>${escapeHtml(text)}</p></article>`;
const section = (title, note, body, badge = "") => `<section class="panel rline-section rline-report-panel"><header class="panel__header"><div><p class="section-kicker">自动周报</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(note)}</p></div>${badge}</header>${body}</section>`;

function chosenCohort(snapshot, cohortId) {
  return cohortId === ALL_COHORTS ? snapshot.weekly?.cohortComparison?.primaryCohortId || ALL_COHORTS : cohortId;
}
function reportFor(snapshot, cohortId) {
  const id = chosenCohort(snapshot, cohortId);
  const week = (snapshot.history?.weekly || []).find((item) => item.cohortId === id)?.week || snapshot.weekly?.currentWeek || "M1W1";
  return buildWeeklyReport({ history: snapshot.history, cohortId: id, week });
}
function trend(report, metric, title, color) {
  const actual = report.days.map((row) => row.actual[metric]);
  const target = report.days.map((row) => row.target[metric]);
  return renderLineChart({
    title, subtitle: "实线=24:00日终实际；虚线=首周W1每日目标；空缺=暂无日终数据",
    labels: ["D1", "D2", "D3", "D4", "D5"],
    datasets: [{ label: "实际", data: actual.length ? [...actual, ...Array(Math.max(0, 5 - actual.length)).fill(null)] : [null, null, null, null, null], color }, { label: "目标", data: reportingTargetFor(report, metric), color, dashed: true }],
    yMax: 100, unit: "%", decimals: 1, showValues: true, emptyLabel: report.dataQuality.capturedDays < 5 ? `已回填${report.dataQuality.capturedDays}/5天` : ""
  });
}
function reportingTargetFor(report, metric) {
  const targets = { retention: [72, 68, 65, 62, 55], depth: [69, 66.5, 63.5, 60.5, 52.5], completion: [69, 69.2, 69.2, 69, 66.5] };
  return targets[metric].map((value, index) => report.days.find((row) => row.day === `D${index + 1}`)?.target?.[metric] ?? value);
}
function statusTone(gap) {
  if (gap === null || gap === undefined) return "is-muted";
  return gap >= 0 ? "is-good" : "is-alert";
}
function weeklyMetricCards(report) {
  return report.weeklyComparison.map((item) => card(item.label, `目标 ${pct(item.target, 1)} · 实际 ${pct(item.actual, 1)} · 差值 ${delta(item.gap)}`, statusTone(item.gap))).join("");
}
function weeklyOverviewPanel(report) {
  return section("本周整体目标达成", "周维度只看周汇总；日维度单独放在下一部分，不与周结果混读。", `<div class="rline-target-summary">${weeklyMetricCards(report)}</div><div class="rline-chart-grid rline-report-chart-grid">${renderBarChart({ title: "本周三项指标：实际 vs 目标", subtitle: "周汇总实际与周目标差值，完课无值时保留空缺", labels: report.weeklyComparison.map((item) => item.label), datasets: [{ label: "实际", data: report.weeklyComparison.map((item) => item.actual), color: "#16795a" }, { label: "目标", data: report.weeklyComparison.map((item) => item.target), color: "#dd9d22", dashed: true }], yMax: 100, unit: "%", decimals: 1, emptyLabel: report.weeklyComparison.some((item) => item.actual === null) ? "周数据待回填" : "" })}</div><div class="rline-report-reading"><strong>周报读法</strong><span>先看周目标差值，再看首周每日哪一天开始偏离；如果周完课暂无值，页面只显示“待回填”，不拿BI阶段结果替代。</span></div>`, renderBadge(report.weeklyStatus === "已结周" ? "success" : "info", `周数据${report.weeklyStatus}`));
}

function monthlyTargetSeries(snapshot, key, labels) {
  const targets = snapshot.weekly?.targets?.monthly || {};
  const targetLabels = targets.labels || labels;
  return labels.map((label) => {
    const index = targetLabels.indexOf(label);
    return index >= 0 ? targets[key]?.[index] ?? null : null;
  });
}

function monthlyWeeklyTargetPanel(snapshot, cohortId = ALL_COHORTS) {
  const targets = snapshot.weekly?.targets?.monthly;
  if (!targets) return "";
  const labels = targets.labels || ["W1", "W2", "W3", "W4"];
  const selectedId = chosenCohort(snapshot, cohortId);
  const records = (snapshot.history?.weekly || []).filter((record) => selectedId === ALL_COHORTS || record.cohortId === selectedId);
  const byWeek = new Map(records.map((record) => [String(record.week || "").match(/W\d+/)?.[0] || record.week, record.summary || {}]));
  const actual = (key) => labels.map((label) => byWeek.get(label)?.[key] ?? null);
  const chart = (key, title, color) => renderLineChart({
    title,
    subtitle: "实线=当月周度实际；虚线=周目标；空缺=该周尚未归档",
    labels,
    datasets: [
      { label: "实际", data: actual(key), color },
      { label: "目标", data: monthlyTargetSeries(snapshot, key, labels), color, dashed: true }
    ],
    yMax: 100,
    unit: "%",
    decimals: 1,
    showValues: true,
    emptyLabel: records.length < labels.length ? `已回填${records.length}/${labels.length}周` : ""
  });
  const rows = labels.map((label, index) => {
    const targetsForMetric = {
      retention: monthlyTargetSeries(snapshot, "retention", labels)[index],
      depth: monthlyTargetSeries(snapshot, "depth", labels)[index],
      completion: monthlyTargetSeries(snapshot, "completion", labels)[index]
    };
    return `<span><b>${escapeHtml(label)}</b><em>留存 实际${pct(actual("retention")[index], 1)} / 目标${pct(targetsForMetric.retention, 1)} / 差值${delta(actual("retention")[index] === null ? null : actual("retention")[index] - targetsForMetric.retention)}</em><em>深度 实际${pct(actual("depth")[index], 1)} / 目标${pct(targetsForMetric.depth, 1)} / 差值${delta(actual("depth")[index] === null ? null : actual("depth")[index] - targetsForMetric.depth)}</em><em>完课 实际${pct(actual("completion")[index], 1)} / 目标${pct(targetsForMetric.completion, 1)} / 差值${delta(actual("completion")[index] === null ? null : actual("completion")[index] - targetsForMetric.completion)}</em></span>`;
  }).join("");
  return section("当月 W1-W4 周度整体：实际 vs 周目标", "这里是周维度整体数据，不是首周D1-D5日数据；W1-W4分别显示周汇总实际、周目标和差值。", `<div class="rline-chart-grid rline-report-chart-grid">${chart("retention", "W1-W4周留存：实际 vs 目标", "#16795a")}${chart("depth", "W1-W4周深度：实际 vs 目标", "#4d8fe3")}${chart("completion", "W1-W4周完课：实际 vs 目标", "#dd9d22")}</div><div class="rline-daily-value-strip">${rows}</div>`, renderBadge(records.length === labels.length ? "success" : "warning", records.length === labels.length ? "W1-W4已齐" : `已回填${records.length}/${labels.length}周`));
}

function dailyTrendPanel(report) {
  return section("首周W1每日趋势", "每日数据与周数据分开；固定使用D1-D5的24:00日终，D2 14:00已排除。", `<div class="rline-daily-target-strip">${["D1", "D2", "D3", "D4", "D5"].map((day, index) => `<span><b>${day}</b><em>留存${[72, 68, 65, 62, 55][index]}%</em><em>深度${[69, 66.5, 63.5, 60.5, 52.5][index]}%</em><em>完课${[69, 69.2, 69.2, 69, 66.5][index]}%</em></span>`).join("")}</div><div class="rline-daily-value-strip">${["D1", "D2", "D3", "D4", "D5"].map((day) => { const row = report.days.find((item) => item.day === day); return `<span><b>${day}</b><em>留存 实际${pct(row?.actual?.retention, 2)} / 目标${pct(row?.target?.retention, 1)} / 差值${delta(row?.gap?.retention)}</em><em>深度 实际${pct(row?.actual?.depth, 2)} / 目标${pct(row?.target?.depth, 1)} / 差值${delta(row?.gap?.depth)}</em><em>完课 实际${pct(row?.actual?.completion, 2)} / 目标${pct(row?.target?.completion, 1)} / 差值${delta(row?.gap?.completion)}</em></span>`; }).join("")}</div><div class="rline-chart-grid rline-report-chart-grid">${trend(report, "retention", "首周留存：实际 vs 目标", "#16795a")}${trend(report, "depth", "首周深度：实际 vs 目标", "#4d8fe3")}${trend(report, "completion", "首周完课：实际 vs 目标", "#dd9d22")}</div>`, renderBadge("success", report.dataQuality.source));
}
function narrativePanel(report) {
  const sections = report.narrative.sections;
  return section("结论与业务洞察", "每条结论按事实 → 判断 → 动作 → 验证输出，避免只有数据没有业务决策。", `<div class="rline-narrative-grid">${sections.map((item) => `<article class="rline-narrative-card" data-narrative="${escapeHtml(item.id)}"><header><span>${escapeHtml(item.title)}</span><b>${item.id === "overall" ? "结论" : item.id === "strategy" ? "策略" : "QA"}</b></header><div><small>事实</small><p>${escapeHtml(item.fact)}</p></div><div><small>判断</small><p>${escapeHtml(item.judgment)}</p></div><div><small>动作</small><p>${escapeHtml(item.action)}</p></div><div><small>验证</small><p>${escapeHtml(item.validation)}</p></div></article>`).join("")}</div>`, renderBadge("info", "可直接用于周会播报"));
}
function cohortRows(snapshot, cohortId) {
  const id = chosenCohort(snapshot, cohortId);
  const records = dayEndRecords(snapshot.history || {}, id);
  const latest = records.at(-1);
  return (latest?.split || []).map((row) => ({ label: row.className || row.level, retention: Number(row.retention), depth: Number(row.depth), participant: Number(row.participant), totalUsers: Number(row.totalUsers) }));
}
function cohortPanel(snapshot, cohortId) {
  const rows = cohortRows(snapshot, cohortId);
  if (!rows.length) return section("班期拆解", "当前没有可用的R1/R2日终拆分数据。", `<div class="rline-report-empty">暂无R1/R2拆分；补齐24:00 split字段后自动呈现。</div>`, renderBadge("warning", "待回填"));
  return section("班期拆解：R1 / R2", "先判断掉队集中在哪个班期，再决定是用户触达问题还是课程承接问题。", `<div class="rline-report-kpi-row">${rows.map((row) => `<div><strong>${escapeHtml(row.label)}</strong><span>参与${countText(row.participant)} / 在班${countText(row.totalUsers)}</span><small>留存${pct(row.retention, 1)} · 深度${pct(row.depth, 1)}</small></div>`).join("")}</div><div class="rline-chart-grid rline-report-chart-grid">${renderBarChart({ title: "R1/R2留存对比", subtitle: "最近一个24:00日终", labels: rows.map((row) => row.label), datasets: [{ label: "留存", data: rows.map((row) => row.retention), color: "#16795a" }], yMax: 100, unit: "%", decimals: 1 })}${renderBarChart({ title: "R1/R2深度对比", subtitle: "最近一个24:00日终", labels: rows.map((row) => row.label), datasets: [{ label: "深度", data: rows.map((row) => row.depth), color: "#4d8fe3" }], yMax: 100, unit: "%", decimals: 1 })}</div>`);
}
function channelRows(snapshot) {
  const current = (snapshot.bi?.cohorts || []).filter((cohort) => cohort.status === "行课中" && /R[12]-1期/.test(cohort.cohortName || ""));
  const sourceCohorts = current.length ? current : (snapshot.bi?.cohorts || []).filter((cohort) => cohort.status === "行课中");
  const map = new Map();
  sourceCohorts.forEach((cohort) => (cohort.sources || []).forEach((source) => {
    const users = Number(source.users || 0); if (!users) return;
    const row = map.get(source.name) || { name: source.name, users: 0, participation: 0, depth: 0, completion: 0, supplementCompletion: 0 };
    row.users += users;
    row.participation += users * Number(source.participation || 0);
    row.depth += users * Number(source.depth || 0);
    row.completion += users * Number(source.completion || 0);
    row.supplementCompletion += users * Number(source.supplementCompletion || 0);
    map.set(source.name, row);
  }));
  const totalUsers = [...map.values()].reduce((sum, row) => sum + row.users, 0);
  return [...map.values()].map((row) => ({ ...row, userShare: Number((row.users / totalUsers * 100).toFixed(2)), participation: Number((row.participation / row.users).toFixed(2)), depth: Number((row.depth / row.users).toFixed(2)), completion: Number((row.completion / row.users).toFixed(2)), supplementCompletion: Number((row.supplementCompletion / row.users).toFixed(2)) }));
}
function channelPanel(snapshot) {
  const rows = channelRows(snapshot);
  if (!rows.length) return section("渠道分析", "渠道定义为扩品、用户召回、APP部等用户来源；Kitty/Taby不在此处。", `<div class="rline-report-empty">暂无行课中渠道数据。</div>`, renderBadge("warning", "待回填"));
  const labels = rows.map((row) => row.name);
  return section("渠道分析：扩科 / 扩品 / 用户召回 / APP部", "使用R1/R2 1期行课中班期的用户来源渠道；看规模、参与、深度、完课和补读，不把内容IP当成渠道。", `<div class="rline-chart-grid rline-report-chart-grid">${renderBarChart({ title: "渠道用户规模", subtitle: "R1/R2 1期来源用户数", labels, datasets: [{ label: "用户数", data: rows.map((row) => row.users), color: "#7b9fe8" }], yMax: Math.max(100, ...rows.map((row) => row.users)), unit: "人", decimals: 0 })}${renderBarChart({ title: "渠道用户占比", subtitle: "R1/R2 1期来源结构", labels, datasets: [{ label: "用户占比", data: rows.map((row) => row.userShare), color: "#e5a438" }], yMax: 100, unit: "%", decimals: 1 })}${renderBarChart({ title: "渠道参与 / 深度 / 完课", subtitle: "按渠道用户数加权", labels, datasets: [{ label: "参与率", data: rows.map((row) => row.participation), color: "#16795a" }, { label: "深度", data: rows.map((row) => row.depth), color: "#4d8fe3" }, { label: "完课率", data: rows.map((row) => row.completion), color: "#dd9d22" }], yMax: 100, unit: "%", decimals: 1 })}</div><div class="rline-channel-cards">${rows.map((row) => `<article><strong>${escapeHtml(row.name)}</strong><span>用户${row.users}人 · 占比${pct(row.userShare, 1)}</span><small>参与${pct(row.participation, 1)} · 深度${pct(row.depth, 1)} · 完课${pct(row.completion, 1)} · 补读完课${pct(row.supplementCompletion, 1)}</small></article>`).join("")}</div>`, renderBadge("info", "来源渠道"));
}
function ipPanel() {
  const labels = [...new Set(IP_ROWS.map((row) => row[0]))];
  const values = (ip, index) => labels.map((label) => IP_ROWS.find((row) => row[0] === label && row[1] === ip)?.[index] ?? null);
  return section("内容IP分析：Kitty / Taby", "Kitty 与 Taby是内容IP，不是用户来源渠道；只在有IP拆分快照时分析其留存和深度。", `<div class="rline-chart-grid rline-report-chart-grid">${renderBarChart({ title: "IP留存", subtitle: "R1/R2二期D5日终IP快照", labels, datasets: [{ label: "Kitty", data: values("Kitty", 2), color: "#4d8fe3" }, { label: "Taby", data: values("Taby", 2), color: "#e86c56" }], yMax: 100, unit: "%", decimals: 1 })}${renderBarChart({ title: "IP深度", subtitle: "R1/R2二期D5日终IP快照", labels, datasets: [{ label: "Kitty", data: values("Kitty", 3), color: "#4d8fe3" }, { label: "Taby", data: values("Taby", 3), color: "#e86c56" }], yMax: 100, unit: "%", decimals: 1 })}</div>`, renderBadge("info", "内容IP"));
}

export function renderWeeklyReport(snapshot, cohortId = ALL_COHORTS) {
  const report = reportFor(snapshot, cohortId);
  return `<div class="rline-tab-content"><section class="rline-hero rline-weekly-hero"><div><p class="section-kicker">R线策略工作台 · 周汇报</p><h1>${escapeHtml(report.week)}领导周会版自动周报</h1><p class="rline-hero__sub">播报顺序：周目标达成 → 首周W1每日趋势 → 班期/IP/渠道下钻 → 用户QA/课程QA → 策略调整与验证。数据口径固定为24:00日终。</p><div class="rline-hero__status">${renderBadge("success", "D2 14:00排除")}${renderBadge(report.dataQuality.capturedDays === 5 ? "success" : "warning", `日终${report.dataQuality.capturedDays}/5天`)}</div></div></section>${weeklyOverviewPanel(report)}${dailyTrendPanel(report)}${monthlyWeeklyTargetPanel(snapshot, cohortId)}${cohortPanel(snapshot, cohortId)}${ipPanel()}${channelPanel(snapshot)}${narrativePanel(report)}<section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">自动周报播报摘要</p><h2>可直接复制到周会纪要</h2></div>${renderBadge("info", "目标—实际—差值—动作")}</header><div class="rline-weekly-summary-text"><p>${escapeHtml(report.narrative.summary)}</p>${report.narrative.sections.filter((item) => item.id !== "overall").map((item) => `<p><strong>${escapeHtml(item.title)}：</strong>${escapeHtml(item.judgment)} 当前动作：${escapeHtml(item.action)} 验证：${escapeHtml(item.validation)}</p>`).join("")}</div></section></div>`;
}


function inputSection(title, note, body, badge = "") {
  return `<section class="panel rline-section rline-input-panel"><header class="panel__header"><div><p class="section-kicker">R线工作台</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(note)}</p></div>${badge}</header>${body}</section>`;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function archiveMeta(entry) {
  const date = entry.capturedAt ? new Date(entry.capturedAt) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("zh-CN", { hour12: false }) : String(entry.capturedAt || "待确认");
}

function renderArchiveIntake() {
  return `<div class="rline-input-intake"><div class="rline-input-intake__lead"><span class="rline-input-intake__icon">01</span><div><strong>上传或登记原始数据</strong><p>支持图片、CSV、TSV、JSON、XLSX原文件；表格会解析成可回看的行列，图片/XLSX先保留原文件和来源。</p></div></div><div class="rline-input-form"><label><span>文件</span><input type="file" data-archive-file accept="image/*,.csv,.tsv,.json,.xlsx,.xls,.txt,.md"></label><label><span>存档名称</span><input data-archive-name placeholder="例如：M1W1D5 24:00日报表"></label><label><span>来源名称</span><input data-archive-source placeholder="例如：OA课程日报 / BI周表"></label><label><span>在线表格链接</span><input type="url" data-archive-link placeholder="粘贴钉钉/在线表格链接"></label><label><span>采集日期</span><input type="date" data-archive-date></label><label class="is-wide"><span>备注</span><input data-archive-note placeholder="说明口径、班期、周次或需要关注的字段"></label><label class="is-wide"><span>表格内容粘贴回退</span><textarea data-archive-paste rows="4" placeholder="如果在线链接受登录/CORS限制，可把表格复制后粘贴到这里，支持CSV/TSV/JSON"></textarea></label></div><div class="rline-input-intake__actions"><button type="button" class="rline-export-button" data-archive-add-text>解析并存档</button><span data-archive-status aria-live="polite">原始文件和解析结果会分开保留，不覆盖24:00历史。</span></div></div>`;
}

function renderHistoryArchive(snapshot, cohortId) {
  const id = chosenCohort(snapshot, cohortId);
  const rows = (snapshot.history?.daily || []).filter((row) => id === ALL_COHORTS || row.cohortId === id).sort((a, b) => String(a.date + a.asOf).localeCompare(String(b.date + b.asOf)));
  const head = ["班期", "周次", "日", "时间", "在班", "参与", "正读", "留存", "深度", "完课"];
  const body = rows.map((row) => `<div class="rline-source-row"><span>${escapeHtml(row.cohortName || row.cohortId || "未命名")}</span><span>${escapeHtml(row.week || "-")}</span><span>${escapeHtml(row.day || "-")}</span><span class="${row.asOf === "14:00" ? "is-excluded" : ""}">${escapeHtml(row.asOf || "-")}${row.asOf === "14:00" ? "（分析排除）" : ""}</span><span>${countText(row.totalUsers)}</span><span>${countText(row.metrics?.participant)}</span><span>${countText(row.metrics?.positiveRead)}</span><span>${pct(row.metrics?.retention, 2)}</span><span>${pct(row.metrics?.depth, 2)}</span><span>${pct(row.metrics?.completion, 2)}</span></div>`).join("");
  return `<div class="rline-source-table"><div class="rline-source-row rline-source-row--head">${head.map((item) => `<span>${item}</span>`).join("")}</div>${body || `<div class="rline-history-empty">暂无内置日终快照</div>`}</div>`;
}

function renderArchiveEntry(entry) {
  const columns = entry.columns || [];
  const rows = entry.rows || [];
  const preview = rows.length ? `<div class="rline-upload-table"><div class="rline-upload-row rline-upload-row--head">${columns.map((column) => `<span>${escapeHtml(column)}</span>`).join("")}</div>${rows.slice(0, 8).map((row) => `<div class="rline-upload-row">${columns.map((column) => `<span>${escapeHtml(row[column])}</span>`).join("")}</div>`).join("")}</div>` : entry.previewUrl && String(entry.mimeType || "").startsWith("image/") ? `<img class="rline-upload-image" src="${escapeAttribute(entry.previewUrl)}" alt="${escapeAttribute(entry.name)}预览">` : `<p class="rline-upload-empty">${escapeHtml(entry.parseStatus || "仅保留原文件")}</p>`;
  const source = entry.sourceUrl ? `<a href="${escapeAttribute(entry.sourceUrl)}" target="_blank" rel="noreferrer">打开来源链接</a>` : `<span>来源：${escapeHtml(entry.source || "本地上传")}</span>`;
  return `<article class="rline-archive-card" data-archive-id="${escapeAttribute(entry.id)}"><header><div><span>${escapeHtml(entry.kind === "table" ? "表格存档" : entry.kind === "image" ? "图片存档" : "原文件")}</span><strong>${escapeHtml(entry.name)}</strong></div><button type="button" class="rline-text-button" data-archive-delete>删除本地存档</button></header><div class="rline-archive-meta">${source}<small>采集：${escapeHtml(archiveMeta(entry))} · ${escapeHtml(entry.parseStatus || "已登记")}</small></div>${entry.note ? `<p class="rline-archive-note">${escapeHtml(entry.note)}</p>` : ""}${preview}</article>`;
}

export function renderDataArchive(snapshot, cohortId = ALL_COHORTS, context = {}) {
  const summary = summarizeHistory(snapshot.history || {});
  const records = dayEndRecords(snapshot.history || {}, chosenCohort(snapshot, cohortId));
  const labels = records.map((row) => `${row.week || ""}${row.day || ""}`);
  const weeks = snapshot.history?.weekly || [];
  const archives = Array.isArray(context.inputArchives) ? context.inputArchives : [];
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 数据留存</p><h1>数据资产留存：源数据、原始表格、24:00历史分开保存</h1><p>这里保存你上传的图片/表格/原始链接和工作台的日终数据，支持后续周报复盘；D2 14:00仍保留在源表存档，但不进入周度分析。</p></div><button type="button" class="rline-export-button" data-rline-export-archive>导出全部留存数据</button></section><section class="rline-retention-stats"><article><span>内置日终快照</span><strong>${summary.dailyCount}</strong><small>24:00优先用于分析</small></article><article><span>周汇总存档</span><strong>${summary.weeklyCount}</strong><small>按班期/周次独立保存</small></article><article><span>原始文件存档</span><strong>${archives.length}</strong><small>本浏览器留存</small></article><article><span>最近快照</span><strong>${escapeHtml(summary.latestAsOf)}</strong><small>以源表时间为准</small></article></section>${inputSection("上传入口", "上传后的原始资料和解析行会在本浏览器保留，后续可以回看、导出或删除本地副本。", renderArchiveIntake(), renderBadge("info", "可上传"))}${inputSection("工作台内置日终明细", "这是工作台已经接入的结构化历史；所有日内时点都保留，周报只读取24:00。", renderHistoryArchive(snapshot, cohortId), renderBadge("success", "历史不覆盖"))}${inputSection("原始表格 / 图片存档", "这里保留你上传的OA表格、图片和在线表格登记记录；它们是证据材料，不会直接改写指标。", archives.length ? `<div class="rline-archive-grid">${archives.map(renderArchiveEntry).join("")}</div>` : `<div class="rline-empty-workflow"><strong>还没有原始资料存档</strong><p>从上方上传日报表、周表、QA表或截图后，这里会出现原文件预览和解析后的表格行。</p></div>`, renderBadge(archives.length ? "success" : "warning", archives.length ? "已归档" : "待上传"))}${inputSection("周度复盘覆盖", "这张图只回答“每个班期周次已有多少个24:00日终”，不是数据存档本身。", renderBarChart({ title: "已归档周次的日终覆盖", subtitle: "用于发现哪些周次还缺D3-D5；缺失不代表用户表现为0", labels: weeks.map((row) => `${row.cohortName || row.cohortId} ${row.week}`), datasets: [{ label: "日终覆盖天数", data: weeks.map((row) => row.daysCaptured ?? null), color: "#dd9d22" }], yMax: 5, unit: "天", decimals: 0, showValues: true }), renderBadge("info", "复盘提醒"))}</div>`;
}

function qaStatusOptions(status) {
  return ["待协同", "处理中", "待验证", "已闭环"].map((item) => `<option value="${escapeAttribute(item)}"${item === status ? " selected" : ""}>${item}</option>`).join("");
}

function renderQAEntry(item) {
  return `<article class="rline-qa-card" data-qa-id="${escapeAttribute(item.id)}"><header><div><span class="rline-qa-type">${escapeHtml(item.type)}</span><strong>${escapeHtml(item.issue)}</strong></div><select data-qa-field="status">${qaStatusOptions(item.status)}</select></header><div class="rline-qa-evidence"><div><small>证据 / 原话</small><p>${escapeHtml(item.evidence || "待补充")}</p></div><div><small>影响判断</small><p>${escapeHtml(item.impact || "待判断")}</p></div><div><small>来源</small><p>${escapeHtml(item.source || "待补充")}${item.sourceUrl ? ` · <a href="${escapeAttribute(item.sourceUrl)}" target="_blank" rel="noreferrer">在线表格</a>` : ""}</p></div></div><div class="rline-qa-loop"><div><span>其他部门解决方案</span><p class="is-solution">${escapeHtml(item.solution || "待协同部门补充")}</p></div><div><span>负责人 / 截止</span><p>${escapeHtml(item.owner || "待填写")} · ${escapeHtml(item.dueDate || "待填写")}</p></div><div><span>验证结果</span><p>${escapeHtml(item.verification || "待回收")}</p></div></div><div class="rline-qa-form"><label class="is-wide"><span>问题</span><input data-qa-field="issue" value="${escapeAttribute(item.issue)}"></label><label><span>QA类型</span><select data-qa-field="type"><option${item.type === "用户QA" ? " selected" : ""}>用户QA</option><option${item.type === "课程QA" ? " selected" : ""}>课程QA</option></select></label><label><span>责任部门</span><input data-qa-field="department" value="${escapeAttribute(item.department)}"></label><label><span>负责人</span><input data-qa-field="owner" value="${escapeAttribute(item.owner)}"></label><label><span>截止时间</span><input data-qa-field="dueDate" type="date" value="${escapeAttribute(item.dueDate)}"></label><label class="is-wide"><span>影响判断</span><textarea data-qa-field="impact">${escapeHtml(item.impact)}</textarea></label><label class="is-wide"><span>其他部门解决方案</span><textarea data-qa-field="solution">${escapeHtml(item.solution)}</textarea></label><label class="is-wide"><span>验证结果 / 指标</span><textarea data-qa-field="verification">${escapeHtml(item.verification)}</textarea></label></div><button type="button" class="rline-project-save" data-qa-save>保存QA闭环</button><small class="rline-project-save-status" data-qa-save-status>修改方案、负责人或验证结果后保存</small></article>`;
}

export function renderQACenter(snapshot, qaEntries = [], context = {}) {
  const items = Array.isArray(qaEntries) ? qaEntries : [];
  const userCount = items.filter((item) => item.type === "用户QA").length;
  const courseCount = items.filter((item) => item.type === "课程QA").length;
  const closedCount = items.filter((item) => item.status === "已闭环").length;
  const blockedCount = items.filter((item) => item.status === "待协同").length;
  const categories = [...new Set(items.map((item) => item.category || "未分类"))];
  const departments = [...new Set(items.map((item) => item.department || "待分派"))];
  const categoryChart = renderBarChart({ title: "QA问题分类", subtitle: "按上传表格/已确认日报中的问题分类计数", labels: categories.length ? categories : ["暂无"], datasets: [{ label: "问题数", data: categories.length ? categories.map((value) => items.filter((item) => (item.category || "未分类") === value).length) : [0], color: "#4d8fe3" }], yMax: Math.max(4, items.length), unit: "条", decimals: 0, showValues: true });
  const departmentChart = renderBarChart({ title: "责任部门分布", subtitle: "用来判断本周需要谁协同，不把QA只留在运营侧", labels: departments.length ? departments : ["待分派"], datasets: [{ label: "待处理数", data: departments.length ? departments.map((value) => items.filter((item) => (item.department || "待分派") === value && item.status !== "已闭环").length) : [0], color: "#dd9d22" }], yMax: Math.max(4, items.length), unit: "条", decimals: 0, showValues: true });
  const intake = `<div class="rline-input-intake"><div class="rline-input-intake__lead"><span class="rline-input-intake__icon">QA</span><div><strong>导入OA表 / 在线表格</strong><p>按表头自动提取问题、证据、影响、责任部门和解决方案；字段缺失会保留为“待补充”，不会静默丢失。</p></div></div><div class="rline-input-form"><label><span>OA表格文件</span><input type="file" data-qa-file accept=".csv,.tsv,.json,.xlsx,.xls,.txt,.md"></label><label><span>来源名称</span><input data-qa-source placeholder="例如：课程QA周表"></label><label><span>在线表格链接</span><input type="url" data-qa-link placeholder="粘贴线上表格链接"></label><label><span>默认QA类型</span><select data-qa-default-type><option>用户QA</option><option>课程QA</option></select></label><label class="is-wide"><span>表格内容粘贴回退</span><textarea data-qa-paste rows="5" placeholder="复制OA表格后粘贴，支持CSV/TSV/JSON"></textarea></label></div><div class="rline-input-intake__actions"><button type="button" class="rline-export-button" data-qa-add-text>提取QA并加入中心</button><span data-qa-status aria-live="polite">在线表格若受登录/CORS限制，会提示你改用粘贴或上传。</span></div></div>`;
  const body = items.length ? `<div class="rline-qa-list">${items.map(renderQAEntry).join("")}</div>` : `<div class="rline-empty-workflow"><strong>当前没有QA记录</strong><p>上传OA表或粘贴线上表格内容后，系统会把每条问题转成可追踪的方案闭环。</p></div>`;
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · QA中心</p><h1>用户QA / 课程QA：从证据到解决方案闭环</h1><p>QA不再埋在周报文字里；每条问题都有来源、影响、协同部门、方案、截止时间和验证结果。</p></div>${renderBadge(items.length ? "info" : "warning", items.length ? "已有记录" : "待导入")}</section>${intake}<section class="rline-qa-summary"><article><span>QA总数</span><strong>${items.length}</strong><small>上传与已确认记录</small></article><article><span>用户QA</span><strong>${userCount}</strong><small>家长/用户反馈</small></article><article><span>课程QA</span><strong>${courseCount}</strong><small>教研/产品问题</small></article><article><span>待协同</span><strong>${blockedCount}</strong><small>需要其他部门接手</small></article><article><span>已闭环</span><strong>${closedCount}</strong><small>已有验证结果</small></article></section>${inputSection("QA图表分析", "图表只做结构性回答：问题集中在哪类、需要谁协同；具体业务判断仍以每条QA的证据和解决方案为准。", `<div class="rline-chart-grid rline-report-chart-grid">${categoryChart}${departmentChart}</div>`, renderBadge("info", "问题结构"))}${inputSection("QA逐条闭环台账", "每条QA都要有其他部门解决方案；保存后会进入本浏览器，下一次周报可引用其进展。", body, renderBadge("success", "可编辑"))}</div>`;
}


function archiveStatus(container, message) {
  const node = container.querySelector("[data-archive-status]");
  if (node) node.textContent = message;
}

function qaStatus(container, message) {
  const node = container.querySelector("[data-qa-status]");
  if (node) node.textContent = message;
}

function appendArchive(context, entry) {
  const current = Array.isArray(context.inputArchives) ? context.inputArchives : [];
  context.onArchivesChange?.([entry, ...current]);
}

async function fetchReadableSource(url) {
  const response = await fetch(url, { headers: { Accept: "text/plain, text/csv, application/json" } });
  if (!response.ok) throw new Error("链接返回" + response.status);
  return response.text();
}

async function createArchiveFromFile(file, container, context) {
  const isImage = String(file.type || "").startsWith("image/");
  const isText = !isImage && !/.xlsx?$/i.test(file.name);
  let parsed = { columns: [], rows: [], format: "file", parseStatus: "原文件已登记" };
  if (isText) parsed = parseUploadedText(await file.text(), file.name);
  const previewUrl = isImage ? await fileToDataUrl(file) : "";
  appendArchive(context, buildArchiveEntry({
    name: container.querySelector("[data-archive-name]")?.value || file.name,
    kind: isImage ? "image" : parsed.rows.length ? "table" : "file",
    source: container.querySelector("[data-archive-source]")?.value || "本地上传",
    sourceUrl: container.querySelector("[data-archive-link]")?.value || "",
    capturedAt: container.querySelector("[data-archive-date]")?.value || new Date().toISOString(),
    note: container.querySelector("[data-archive-note]")?.value || "",
    mimeType: file.type,
    size: file.size,
    columns: parsed.columns,
    rows: parsed.rows,
    previewUrl,
    parseStatus: parsed.parseStatus
  }));
  archiveStatus(container, "已存档：" + file.name + "；" + parsed.parseStatus);
}

function createArchiveFromText(container, context, text, sourceUrl = "") {
  const name = container.querySelector("[data-archive-name]")?.value || "粘贴表格-" + new Date().toISOString().slice(0, 10);
  const parsed = parseUploadedText(text, name.endsWith(".json") ? name : name + ".csv");
  appendArchive(context, buildArchiveEntry({
    name,
    kind: "table",
    source: container.querySelector("[data-archive-source]")?.value || "粘贴内容",
    sourceUrl,
    capturedAt: container.querySelector("[data-archive-date]")?.value || new Date().toISOString(),
    note: container.querySelector("[data-archive-note]")?.value || "",
    mimeType: "text/plain",
    columns: parsed.columns,
    rows: parsed.rows,
    parseStatus: parsed.parseStatus
  }));
  archiveStatus(container, "已解析并存档" + (sourceUrl ? "在线表格内容" : "粘贴内容") + "，共" + parsed.rows.length + "行。");
}

function bindArchiveActions(container, context) {
  container.querySelector("[data-archive-file]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await createArchiveFromFile(file, container, context);
    } catch (error) {
      archiveStatus(container, "文件读取失败：" + (error instanceof Error ? error.message : String(error)));
    }
  });
  container.querySelector("[data-archive-add-text]")?.addEventListener("click", async () => {
    const paste = container.querySelector("[data-archive-paste]")?.value?.trim() || "";
    const link = container.querySelector("[data-archive-link]")?.value?.trim() || "";
    if (paste) {
      createArchiveFromText(container, context, paste, link);
      return;
    }
    if (!link) {
      archiveStatus(container, "请先上传文件、粘贴表格内容或登记在线链接。");
      return;
    }
    try {
      archiveStatus(container, "正在尝试读取在线表格……");
      createArchiveFromText(container, context, await fetchReadableSource(link), link);
    } catch {
      appendArchive(context, buildArchiveEntry({
        name: container.querySelector("[data-archive-name]")?.value || "在线表格链接",
        kind: "file",
        source: container.querySelector("[data-archive-source]")?.value || "在线表格",
        sourceUrl: link,
        capturedAt: container.querySelector("[data-archive-date]")?.value || new Date().toISOString(),
        note: "浏览器受登录或CORS限制未能直接读取；请复制表格内容到粘贴框后再次解析。",
        parseStatus: "链接已登记，等待粘贴/上传内容"
      }));
      archiveStatus(container, "链接已登记，但当前无法直接读取；请复制表格内容粘贴后再次解析。");
    }
  });
  container.querySelectorAll("[data-archive-delete]").forEach((button) => button.addEventListener("click", () => {
    const id = button.closest("[data-archive-id]")?.dataset.archiveId;
    if (!id) return;
    context.onArchivesChange?.((context.inputArchives || []).filter((entry) => entry.id !== id));
  }));
}

function appendQAFromText(container, context, text, sourceUrl = "") {
  const source = container.querySelector("[data-qa-source]")?.value?.trim() || "OA表格";
  const defaultType = container.querySelector("[data-qa-default-type]")?.value || "用户QA";
  const parsed = parseUploadedText(text, source + ".csv");
  const entries = normalizeQAEntries(parsed.rows, { label: source, url: sourceUrl, defaultType });
  if (!entries.length) {
    qaStatus(container, parsed.parseStatus + "；没有提取到QA行，请检查表头或粘贴内容。");
    return;
  }
  context.onQAChange?.([...entries, ...(context.qaEntries || [])]);
  qaStatus(container, "已提取" + entries.length + "条QA，字段缺失处已标为待补充。");
}

function bindQAActions(container, context) {
  container.querySelector("[data-qa-file]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (/.xlsx?$/i.test(file.name)) {
      qaStatus(container, "XLSX原文件可在数据留存区归档；请另存为CSV后在这里提取QA字段。");
      return;
    }
    try {
      appendQAFromText(container, context, await file.text());
    } catch (error) {
      qaStatus(container, "QA表读取失败：" + (error instanceof Error ? error.message : String(error)));
    }
  });
  container.querySelector("[data-qa-add-text]")?.addEventListener("click", async () => {
    const paste = container.querySelector("[data-qa-paste]")?.value?.trim() || "";
    const link = container.querySelector("[data-qa-link]")?.value?.trim() || "";
    if (paste) {
      appendQAFromText(container, context, paste, link);
      return;
    }
    if (!link) {
      qaStatus(container, "请先上传OA表、粘贴表格内容或登记在线表格链接。");
      return;
    }
    try {
      qaStatus(container, "正在尝试读取在线表格……");
      appendQAFromText(container, context, await fetchReadableSource(link), link);
    } catch {
      qaStatus(container, "链接已记录但受登录/CORS限制，无法直接提取；请复制表格内容粘贴后再次提取。");
    }
  });
  container.querySelectorAll("[data-qa-save]").forEach((button) => button.addEventListener("click", () => {
    const card = button.closest("[data-qa-id]");
    const id = card?.dataset.qaId;
    if (!id) return;
    const current = (context.qaEntries || []).find((item) => item.id === id);
    if (!current) return;
    const read = (field) => card.querySelector("[data-qa-field='" + field + "']")?.value ?? current[field] ?? "";
    const next = (context.qaEntries || []).map((item) => item.id === id ? { ...item, type: read("type"), status: read("status"), issue: read("issue"), department: read("department"), owner: read("owner"), dueDate: read("dueDate"), impact: read("impact"), solution: read("solution"), verification: read("verification") } : item);
    context.onQAChange?.(next);
    const status = card.querySelector("[data-qa-save-status]");
    if (status) status.textContent = "已保存QA方案、协同和验证字段";
  }));
}

function safeValue(value, fallback = "") { return value === null || value === undefined ? fallback : value; }
function projectCard(item) {
  const statusOptions = ["已完成", "验证中", "待协同", "有风险", "已验收"].map((status) => `<option value="${status}"${item.status === status ? " selected" : ""}>${status}</option>`).join("");
  return `<article class="rline-project-card rline-project-card--editable" data-status="${escapeHtml(item.status)}" data-project-id="${escapeHtml(item.id)}"><header><div><span>${escapeHtml(item.status)}</span><strong>${escapeHtml(item.title)}</strong></div><b>${Number(item.progress || 0)}%</b></header><div class="rline-project-progress"><i style="width:${Math.min(100, Math.max(0, Number(item.progress || 0)))}%"></i></div><div class="rline-project-loop"><span>目标</span><p>${escapeHtml(item.goal)}</p><span>当前产出</span><p>${escapeHtml(item.output)}</p><span>卡点</span><p class="${item.blocker ? "is-blocked" : "is-clear"}">${escapeHtml(item.blocker || "当前无卡点")}</p><span>协同 / 截止</span><p>${escapeHtml(item.collaborators || "待填写")} · ${escapeHtml(item.dueDate || "待填写")}</p><span>下一步</span><p>${escapeHtml(item.next)}</p><span>验收标准</span><p>${escapeHtml(item.acceptance)}</p></div><div class="rline-project-form"><label><span>状态</span><select data-project-field="status">${statusOptions}</select></label><label><span>进度%</span><input data-project-field="progress" type="number" min="0" max="100" value="${Number(item.progress || 0)}"></label><label><span>负责人</span><input data-project-field="owner" value="${escapeHtml(safeValue(item.owner))}"></label><label><span>截止日期</span><input data-project-field="dueDate" type="date" value="${escapeHtml(safeValue(item.dueDate))}"></label><label class="is-wide"><span>本周产出</span><textarea data-project-field="output">${escapeHtml(safeValue(item.output))}</textarea></label><label class="is-wide"><span>卡点</span><textarea data-project-field="blocker">${escapeHtml(safeValue(item.blocker))}</textarea></label><label class="is-wide"><span>协同人/团队</span><input data-project-field="collaborators" value="${escapeHtml(safeValue(item.collaborators))}"></label><label class="is-wide"><span>下一步</span><textarea data-project-field="next">${escapeHtml(safeValue(item.next))}</textarea></label><label class="is-wide"><span>验收标准</span><textarea data-project-field="acceptance">${escapeHtml(safeValue(item.acceptance))}</textarea></label></div><button type="button" class="rline-project-save" data-project-save>保存本事项</button><small class="rline-project-save-status" data-project-save-status>修改后点击保存，进度会保留在本浏览器</small></article>`;
}
export function renderProjectProgress(projects = DEFAULT_PROJECTS) {
  const items = Array.isArray(projects) && projects.length ? projects : DEFAULT_PROJECTS;
  const summary = progressOverview(items);
  const blockedItems = items.filter((item) => item.status === "有风险" || item.status === "待协同");
  const openItems = items.filter((item) => item.status !== "已验收" && item.status !== "已完成");
  const closedItems = items.filter((item) => item.status === "已验收" || item.status === "已完成");
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 项目推进</p><h1>项目进度不是一句“推进中”，而是一条可验收的闭环</h1><p>填报顺序：目标 → 当前产出 → 卡点 → 协同人 → 截止时间 → 下一步 → 验收标准；周报自动读取这里的状态。</p></div><div class="rline-project-head-actions">${renderBadge(summary.closureRate >= 50 ? "success" : "warning", `闭环率${summary.closureRate}%`)}<button type="button" class="rline-export-button" data-project-add>新增事项</button></div></section><section class="rline-project-overview"><article><span>事项总数</span><strong>${summary.total}</strong><small>本周纳入跟踪</small></article><article><span>已闭环</span><strong>${summary.closed}</strong><small>已完成 / 已验收</small></article><article><span>开放事项</span><strong>${summary.open}</strong><small>需要下周继续推进</small></article><article><span>卡点事项</span><strong>${summary.blocked}</strong><small>待协同 / 有风险</small></article><article><span>闭环率</span><strong>${summary.closureRate}%</strong><small>按事项数计算</small></article></section>${section("项目推进台账（可编辑）", "每个事项保存后才进入下一次周报；页面不再依赖固定文案猜测进度。", `<div class="rline-project-grid">${items.map(projectCard).join("")}</div>`)}${section("本周闭环", "闭环的判断标准是：有产出、有验收、有结果回写；不是仅完成配置。", `<div class="rline-closure-grid"><article><strong>已闭环 ${closedItems.length} 项</strong><p>${escapeHtml(closedItems.map((item) => `${item.title}（${item.acceptance}）`).join("；") || "暂无")}</p></article><article><strong>未闭环 ${openItems.length} 项</strong><p>${escapeHtml(openItems.map((item) => `${item.title}：${item.next}`).join("；") || "暂无")}</p></article><article class="is-alert"><strong>当前卡点 ${blockedItems.length} 项</strong><p>${escapeHtml(blockedItems.map((item) => `${item.title}｜卡点：${item.blocker || "待填写"}｜协同：${item.collaborators || "待填写"}｜截止：${item.dueDate || "待填写"}`).join("；") || "暂无")}</p></article></div>`)}${section("下周安排", "下周安排自动从未闭环事项生成；每项都有负责人、截止时间和验收标准。", `<div class="rline-next-plan-list">${openItems.map((item, index) => `<article><b>0${index + 1}</b><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.next)}</p><small>负责人：${escapeHtml(item.owner || "待填写")} · 协同：${escapeHtml(item.collaborators || "待填写")} · 截止：${escapeHtml(item.dueDate || "待填写")} · 验收：${escapeHtml(item.acceptance || "待填写")}</small></div></article>`).join("") || "暂无未闭环安排"}</div>`)}</div>`;
}

export function bindReportingActions(container, snapshot, context = {}) {
  bindArchiveActions(container, context);
  bindQAActions(container, context);
  container.querySelector("[data-rline-export-archive]")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), history: snapshot.history || {}, ipSnapshots: IP_ROWS }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "R线数据留存.json"; link.click(); URL.revokeObjectURL(link.href);
  });
  const items = Array.isArray(context.projects) && context.projects.length ? context.projects : DEFAULT_PROJECTS;
  const collectProjects = () => items.map((item) => {
    const card = container.querySelector(`[data-project-id="${CSS.escape(item.id)}"]`);
    if (!card) return item;
    const read = (field) => card.querySelector(`[data-project-field="${field}"]`)?.value ?? item[field] ?? "";
    return { ...item, status: read("status"), progress: Math.min(100, Math.max(0, Number(read("progress") || 0))), owner: read("owner"), dueDate: read("dueDate"), output: read("output"), blocker: read("blocker"), collaborators: read("collaborators"), next: read("next"), acceptance: read("acceptance") };
  });
  container.querySelectorAll("[data-project-save]").forEach((button) => button.addEventListener("click", () => {
    const next = collectProjects();
    context.onProjectsChange?.(next);
    const status = button.closest("[data-project-id]")?.querySelector("[data-project-save-status]");
    if (status) status.textContent = "已保存到本浏览器；下次周报将读取最新状态";
  }));
  container.querySelector("[data-project-add]")?.addEventListener("click", () => {
    const next = [...collectProjects(), { id: `project-${Date.now()}`, title: "新事项（请填写）", goal: "", status: "待协同", progress: 0, owner: "", collaborators: "", dueDate: "", output: "", blocker: "", next: "", acceptance: "" }];
    context.onProjectsChange?.(next);
  });
}
