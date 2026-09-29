import { escapeHtml, renderBadge } from "../ui/components.js";
import { renderBarChart, renderLineChart } from "./rline-charts.js";
import { ALL_COHORTS, dayEndRecords, summarizeHistory } from "../history.js";
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
    title, subtitle: "实线=24:00日终实际；虚线=首周每日目标；空缺=暂无日终数据",
    labels: ["D1", "D2", "D3", "D4", "D5"],
    datasets: [{ label: "实际", data: actual.length ? [...actual, ...Array(Math.max(0, 5 - actual.length)).fill(null)] : [null, null, null, null, null], color }, { label: "目标", data: reportingTargetFor(report, metric), color, dashed: true }],
    yMax: 100, unit: "%", decimals: 1, emptyLabel: report.dataQuality.capturedDays < 5 ? `已回填${report.dataQuality.capturedDays}/5天` : ""
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
function dailyTrendPanel(report) {
  return section("首周每日趋势", "每日数据与周数据分开；固定使用D1-D5的24:00日终，D2 14:00已排除。", `<div class="rline-daily-target-strip">${["D1", "D2", "D3", "D4", "D5"].map((day, index) => `<span><b>${day}</b><em>留存${[72, 68, 65, 62, 55][index]}%</em><em>深度${[69, 66.5, 63.5, 60.5, 52.5][index]}%</em><em>完课${[69, 69.2, 69.2, 69, 66.5][index]}%</em></span>`).join("")}</div><div class="rline-daily-value-strip">${["D1", "D2", "D3", "D4", "D5"].map((day) => { const row = report.days.find((item) => item.day === day); return `<span><b>${day}</b><em>留存 实际${pct(row?.actual?.retention, 2)} / 目标${pct(row?.target?.retention, 1)} / 差值${delta(row?.gap?.retention)}</em><em>深度 实际${pct(row?.actual?.depth, 2)} / 目标${pct(row?.target?.depth, 1)} / 差值${delta(row?.gap?.depth)}</em><em>完课 实际${pct(row?.actual?.completion, 2)} / 目标${pct(row?.target?.completion, 1)} / 差值${delta(row?.gap?.completion)}</em></span>`; }).join("")}</div><div class="rline-chart-grid rline-report-chart-grid">${trend(report, "retention", "首周留存：实际 vs 目标", "#16795a")}${trend(report, "depth", "首周深度：实际 vs 目标", "#4d8fe3")}${trend(report, "completion", "首周完课：实际 vs 目标", "#dd9d22")}</div>`, renderBadge("success", report.dataQuality.source));
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
  return `<div class="rline-tab-content"><section class="rline-hero rline-weekly-hero"><div><p class="section-kicker">R线策略工作台 · 周汇报</p><h1>${escapeHtml(report.week)}领导周会版自动周报</h1><p class="rline-hero__sub">播报顺序：周目标达成 → 首周每日趋势 → 班期/IP/渠道下钻 → 用户QA/课程QA → 策略调整与验证。数据口径固定为24:00日终。</p><div class="rline-hero__status">${renderBadge("success", "D2 14:00排除")}${renderBadge(report.dataQuality.capturedDays === 5 ? "success" : "warning", `日终${report.dataQuality.capturedDays}/5天`)}</div></div><div class="rline-hero__mark"><span>W</span><small>WEEKLY</small></div></section>${weeklyOverviewPanel(report)}${dailyTrendPanel(report)}${cohortPanel(snapshot, cohortId)}${ipPanel()}${channelPanel(snapshot)}${narrativePanel(report)}<section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">自动周报播报摘要</p><h2>可直接复制到周会纪要</h2></div>${renderBadge("info", "目标—实际—差值—动作")}</header><div class="rline-weekly-summary-text"><p>${escapeHtml(report.narrative.summary)}</p>${report.narrative.sections.filter((item) => item.id !== "overall").map((item) => `<p><strong>${escapeHtml(item.title)}：</strong>${escapeHtml(item.judgment)} 当前动作：${escapeHtml(item.action)} 验证：${escapeHtml(item.validation)}</p>`).join("")}</div></section></div>`;
}

export function renderDataArchive(snapshot, cohortId = ALL_COHORTS) {
  const summary = summarizeHistory(snapshot.history || {});
  const records = dayEndRecords(snapshot.history || {}, chosenCohort(snapshot, cohortId));
  const labels = records.map((row) => `${row.week || ""}${row.day || ""}`);
  const weeks = snapshot.history?.weekly || [];
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 数据留存</p><h1>从一期W1开始保留每一次日终快照</h1><p>日数据按班期、周次、行课日和24:00记录；周数据按班期与周次独立归档，后续复盘不会覆盖历史记录。</p></div><button type="button" class="rline-export-button" data-rline-export-archive>导出留存数据</button></section><section class="rline-retention-stats"><article><span>留存班期</span><strong>${summary.cohortCount}</strong><small>从一期W1开始</small></article><article><span>日终快照</span><strong>${summary.dailyCount}</strong><small>周报只取24:00</small></article><article><span>周汇总</span><strong>${summary.weeklyCount}</strong><small>独立保存</small></article><article><span>最近快照</span><strong>${escapeHtml(summary.latestAsOf)}</strong><small>以源表时间为准</small></article></section>${section("日终数据趋势", "当前选中班期的24:00留存与深度，支撑后续周报复盘。", `<div class="rline-chart-grid">${renderLineChart({ title: "日终留存", subtitle: "仅24:00", labels, datasets: [{ label: "留存", data: records.map((row) => row.metrics?.retention ?? null), color: "#16795a" }], yMax: 100, unit: "%", decimals: 1 })}${renderLineChart({ title: "日终深度", subtitle: "仅24:00", labels, datasets: [{ label: "深度", data: records.map((row) => row.metrics?.depth ?? null), color: "#4d8fe3" }], yMax: 100, unit: "%", decimals: 1 })}</div>`)}${section("周度归档覆盖", "每根柱代表一个班期周次的日终数据覆盖天数。", renderBarChart({ title: "已归档周次", subtitle: "周汇总与日终记录独立保存", labels: weeks.map((row) => `${row.cohortName || row.cohortId} ${row.week}`), datasets: [{ label: "日终覆盖天数", data: weeks.map((row) => row.daysCaptured ?? null), color: "#dd9d22" }], unit: "天", decimals: 0 }))}</div>`;
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
