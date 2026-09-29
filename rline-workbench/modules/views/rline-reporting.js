import { escapeHtml, renderBadge } from "../ui/components.js";
import { renderBarChart, renderLineChart } from "./rline-charts.js";
import { ALL_COHORTS, dayEndRecords, summarizeHistory } from "../history.js";
import { buildWeeklyReport, progressOverview } from "../reporting.js";

const IP_ROWS = [
  ["R1-2期", "Kitty", 32.06, 30.72], ["R1-2期", "Taby", 36.47, 35.27],
  ["R2-2期", "Kitty", 32.54, 30.14], ["R2-2期", "Taby", 35.94, 34.38]
];
const PROJECTS = [
  ["R线首版SOP与期分群", "已验收", 100, "动态SOP、私信和跟进策略已可配置下发", "沉淀为默认SOP并按周复盘", "运营", "任务下发成功率、分群命中率"],
  ["APP Push日督学与周督学", "验证中", 80, "19:00及晚间督学已配置", "对19:00、20:00和不触达做对照", "运营", "2小时/6小时/当日回流率"],
  ["策略有效性看板与日周月口径", "验证中", 60, "班期筛选和基础看板已验证", "补齐动作ID、触达、回流、完课链路", "数据+产品", "数据齐全率、策略归因覆盖率"],
  ["课程QA优化", "待协同", 45, "课程难度、复习、互动和开口问题已整理", "确认R1词汇、复述、游戏和复习环节方案", "教研+运营", "深度、完课、负向反馈占比"],
  ["动态SOP公共素材与奖励物料", "有风险", 65, "表扬与奖励图片已提需并出图", "修复R2图片报错并观察奖励回流", "产品+运营", "任务成功率、奖励后回流率"],
  ["续费链接与10月15日直播", "待协同", 50, "通用链接及直播物料已提需沟通", "完成链接规则确认和直播物料配置", "销售+中台", "链接可用率、直播报名与到课"]
].map(([title, status, progress, output, next, owner, metric]) => ({ title, status, progress, output, next, owner, metric }));

const pct = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? "暂无数据" : `${Number(value).toFixed(2)}%`;
const delta = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? "暂无数据" : `${value > 0 ? "+" : ""}${Number(value).toFixed(2)}pp`;
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
  return renderLineChart({
    title, subtitle: "实线为24:00日终实际，虚线为首周每日目标；空缺表示暂无数据",
    labels: report.days.map((row) => row.day),
    datasets: [{ label: "实际", data: report.days.map((row) => row.actual[metric]), color }, { label: "目标", data: report.days.map((row) => row.target[metric]), color, dashed: true }],
    yMax: 100, unit: "%", decimals: 1, emptyLabel: "暂无24:00日终数据"
  });
}
function channelRows(snapshot) {
  const map = new Map();
  (snapshot.bi?.cohorts || []).filter((cohort) => cohort.status === "行课中").forEach((cohort) => (cohort.sources || []).forEach((source) => {
    const users = Number(source.users || 0); if (!users) return;
    const row = map.get(source.name) || { name: source.name, users: 0, participation: 0, depth: 0 };
    row.users += users; row.participation += users * Number(source.participation || 0); row.depth += users * Number(source.depth || 0); map.set(source.name, row);
  }));
  return [...map.values()].map((row) => ({ ...row, participation: row.participation / row.users, depth: row.depth / row.users }));
}
function ipPanel() {
  const labels = [...new Set(IP_ROWS.map((row) => row[0]))];
  const values = (ip, index) => labels.map((label) => IP_ROWS.find((row) => row[0] === label && row[1] === ip)?.[index] ?? null);
  return section("IP分析：Kitty / Taby", "Kitty 与 Taby是内容IP，不是用户来源渠道；渠道分析在下一张图单独呈现。", `<div class="rline-chart-grid">${renderBarChart({ title: "IP留存", subtitle: "R1/R2二期D5日终数据", labels, datasets: [{ label: "Kitty", data: values("Kitty", 2), color: "#4d8fe3" }, { label: "Taby", data: values("Taby", 2), color: "#e86c56" }], yMax: 100, unit: "%", decimals: 1 })}${renderBarChart({ title: "IP深度", subtitle: "R1/R2二期D5日终数据", labels, datasets: [{ label: "Kitty", data: values("Kitty", 3), color: "#4d8fe3" }, { label: "Taby", data: values("Taby", 3), color: "#e86c56" }], yMax: 100, unit: "%", decimals: 1 })}</div>`, renderBadge("info", "IP维度"));
}
function channelPanel(snapshot) {
  const rows = channelRows(snapshot);
  return section("渠道分析：扩科 / 用户召回 / APP部", "渠道按用户来源渠道统计，供运营判断规模与结果差异；不与内容IP混用。", `<div class="rline-chart-grid">${renderBarChart({ title: "渠道参与率", subtitle: "行课中班期按在班人数加权", labels: rows.map((row) => row.name), datasets: [{ label: "参与率", data: rows.map((row) => row.participation), color: "#16795a" }], yMax: 100, unit: "%", decimals: 1 })}${renderBarChart({ title: "渠道深度", subtitle: "行课中班期按在班人数加权", labels: rows.map((row) => row.name), datasets: [{ label: "深度", data: rows.map((row) => row.depth), color: "#4d8fe3" }], yMax: 100, unit: "%", decimals: 1 })}</div>`, renderBadge("info", "来源渠道"));
}

export function renderWeeklyReport(snapshot, cohortId = ALL_COHORTS) {
  const report = reportFor(snapshot, cohortId);
  const actual = report.summary.retention === null ? report.days.at(-1)?.actual || {} : report.summary;
  const gaps = Object.fromEntries(["retention", "depth", "completion"].map((key) => [key, actual[key] === null || actual[key] === undefined ? null : actual[key] - report.target[key]]));
  const first = report.days[0]?.actual, last = report.days.at(-1)?.actual;
  const userQa = first && last ? `参与人数从${first.participant}人变化至${last.participant}人，优先定位首次缺课、连续缺课和回流用户。` : "补齐日终参与与缺勤数据后再判断用户掉队节点。";
  const courseQa = last?.notFinished !== null && last?.notFinished !== undefined ? `当前参与未完成${last.notFinished}人；结合家长反馈验证课程难度、复习、互动和开口环节。` : "课程QA待补充参与未完成与家长反馈证据。";
  return `<div class="rline-tab-content"><section class="rline-hero rline-weekly-hero"><div><p class="section-kicker">R线策略工作台 · 周汇报</p><h1>${escapeHtml(report.week)}自动周报</h1><p class="rline-hero__sub">固定按“目标 → 实际 → 差值 → 问题 → 动作 → 验证”输出；只使用24:00日终数据。</p></div><div class="rline-hero__mark"><span>W</span><small>WEEKLY</small></div></section>${section("本周经营结论", "实际、目标和差值同时呈现；完课未回填时保留暂无数据。", `<div class="rline-target-summary">${card("留存", `目标${pct(report.target.retention)} · 实际${pct(actual.retention)} · 差值${delta(gaps.retention)}`, gaps.retention < 0 ? "is-alert" : "")}${card("深度", `目标${pct(report.target.depth)} · 实际${pct(actual.depth)} · 差值${delta(gaps.depth)}`, gaps.depth < 0 ? "is-alert" : "")}${card("完课", `目标${pct(report.target.completion)} · 实际${pct(actual.completion)} · 差值${delta(gaps.completion)}`, gaps.completion !== null && gaps.completion < 0 ? "is-alert" : "")}</div><div class="rline-conclusion-grid">${card("自动结论", report.conclusion)}${card("用户QA", userQa)}${card("课程QA", courseQa)}${card("策略调整", "保留分层召回与晚间督学；按触达时间、覆盖人群和补读入口拆组，以下一日24:00回流、深度和完课验证。")}</div>`, renderBadge("info", `已留存${report.days.length}/5天`))}${section("首周每日趋势", "所有趋势图均为实际实线与目标虚线；D2 14:00已排除。", `<div class="rline-chart-grid">${trend(report, "retention", "首周留存：实际 vs 目标", "#16795a")}${trend(report, "depth", "首周深度：实际 vs 目标", "#4d8fe3")}${trend(report, "completion", "首周完课：实际 vs 目标", "#dd9d22")}</div>`, renderBadge("success", "24:00口径"))}${ipPanel()}${channelPanel(snapshot)}</div>`;
}

export function renderDataArchive(snapshot, cohortId = ALL_COHORTS) {
  const summary = summarizeHistory(snapshot.history || {});
  const records = dayEndRecords(snapshot.history || {}, chosenCohort(snapshot, cohortId));
  const labels = records.map((row) => `${row.week || ""}${row.day || ""}`);
  const weeks = snapshot.history?.weekly || [];
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 数据留存</p><h1>从一期W1开始保留每一次日终快照</h1><p>日数据按班期、周次、行课日和24:00记录；周数据按班期与周次独立归档，后续复盘不会覆盖历史记录。</p></div><button type="button" class="rline-export-button" data-rline-export-archive>导出留存数据</button></section><section class="rline-retention-stats"><article><span>留存班期</span><strong>${summary.cohortCount}</strong><small>从一期W1开始</small></article><article><span>日终快照</span><strong>${summary.dailyCount}</strong><small>周报只取24:00</small></article><article><span>周汇总</span><strong>${summary.weeklyCount}</strong><small>独立保存</small></article><article><span>最近快照</span><strong>${escapeHtml(summary.latestAsOf)}</strong><small>以源表时间为准</small></article></section>${section("日终数据趋势", "当前选中班期的24:00留存与深度，支撑后续周报复盘。", `<div class="rline-chart-grid">${renderLineChart({ title: "日终留存", subtitle: "仅24:00", labels, datasets: [{ label: "留存", data: records.map((row) => row.metrics?.retention ?? null), color: "#16795a" }], yMax: 100, unit: "%", decimals: 1 })}${renderLineChart({ title: "日终深度", subtitle: "仅24:00", labels, datasets: [{ label: "深度", data: records.map((row) => row.metrics?.depth ?? null), color: "#4d8fe3" }], yMax: 100, unit: "%", decimals: 1 })}</div>`)}${section("周度归档覆盖", "每根柱代表一个班期周次的日终数据覆盖天数。", renderBarChart({ title: "已归档周次", subtitle: "周汇总与日终记录独立保存", labels: weeks.map((row) => `${row.cohortName || row.cohortId} ${row.week}`), datasets: [{ label: "日终覆盖天数", data: weeks.map((row) => row.daysCaptured ?? null), color: "#dd9d22" }], unit: "天", decimals: 0 }))}</div>`;
}

function projectCard(item) {
  return `<article class="rline-project-card" data-status="${escapeHtml(item.status)}"><header><span>${escapeHtml(item.status)}</span><strong>${escapeHtml(item.title)}</strong><b>${item.progress}%</b></header><div class="rline-project-progress"><i style="width:${item.progress}%"></i></div><p><small>本周产出</small>${escapeHtml(item.output)}</p><p><small>下一步</small>${escapeHtml(item.next)}</p><footer><span>${escapeHtml(item.owner)}</span><span>验收：${escapeHtml(item.metric)}</span></footer></article>`;
}
export function renderProjectProgress() {
  const summary = progressOverview(PROJECTS);
  const next = PROJECTS.filter((item) => item.status !== "已验收").map((item) => item.title).join("、");
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 项目推进</p><h1>每件事都要看到进度、风险、下一步和验收标准</h1><p>本周工作、本周闭环和下周安排围绕同一项目卡呈现。</p></div>${renderBadge(summary.closureRate >= 50 ? "success" : "warning", `闭环率${summary.closureRate}%`)}</section><section class="rline-project-overview">${Object.entries(summary.byStatus).map(([name, count]) => `<article><span>${escapeHtml(name)}</span><strong>${count}</strong></article>`).join("")}</section>${section("本周工作与项目进展", "每张卡包含当前产出、下一步、负责人和验收指标。", `<div class="rline-project-grid">${PROJECTS.map(projectCard).join("")}</div>`)}${section("本周闭环", "已验收事项进入默认SOP；验证中事项必须保留下一次数据验证。", `<div class="rline-conclusion-grid">${card("已闭环", "R线首版SOP、期分群与基础下发能力已经可以支撑老师执行。")}${card("验证中", "督学Push、看板回传和奖励物料已具备验证基础，需回收触达后的用户行为。")}${card("待协同 / 有风险", "课程QA、续费链接、直播配置和动态素材稳定性需要跨团队确认与验收。")}</div>`)}${section("下周安排", "以未闭环项目为对象，先推进有明确验证指标的动作。", `<div class="rline-quote">下周优先推进：${escapeHtml(next)}。每日以24:00数据复盘触达覆盖、回流、深度与完课；达到验收指标后才能把“验证中”改为“已验收”。</div>`)}</div>`;
}
export function bindReportingActions(container, snapshot) {
  container.querySelector("[data-rline-export-archive]")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), history: snapshot.history || {}, ipSnapshots: IP_ROWS }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "R线数据留存.json"; link.click(); URL.revokeObjectURL(link.href);
  });
}
