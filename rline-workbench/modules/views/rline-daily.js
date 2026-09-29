import { escapeAttribute, escapeHtml, renderBadge } from "../ui/components.js";
import { icon } from "../ui/icons.js";
import { RLINE_DAILY_SNAPSHOT } from "../data/rline-daily-data.js?v=20260923-full-analysis";
import { renderBarChart, renderLineChart } from "./rline-charts.js";
import { ALL_COHORTS, cohortEntries, dayEndRecords, deriveWeeklyRollups, historyDates, previousDailyRecord, selectSnapshotForCohort, summarizeHistory } from "../history.js";
import { bindReportingActions, renderDataArchive, renderProjectProgress, renderQACenter, renderWeeklyReport } from "./rline-reporting.js?v=20260929-weekly-scope";

function snapshotFrom(context) {
  return context.state.rlineDailyWorkbench || RLINE_DAILY_SNAPSHOT;
}

function number(value, fallback = "待回填") {
  return value === null || value === undefined || value === "" ? fallback : Number(value).toLocaleString("zh-CN");
}

function percent(value, fallback = "待回填") {
  return value === null || value === undefined || value === "" ? fallback : `${Number(value).toFixed(2)}%`;
}

function hasNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function delta(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "待回填";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Number(value).toFixed(2)}pp`;
}

function countDelta(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "待回填";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${Number(value)}人`;
}

function historyFrom(snapshot) {
  return snapshot.history || { cohorts: [], daily: [], weekly: [] };
}

function weekDayEndRecords(snapshot, cohortId = ALL_COHORTS, week = snapshot.weekly?.currentWeek) {
  const history = historyFrom(snapshot);
  const daily = (history.daily || []).filter((record) => !week || record.week === week);
  return dayEndRecords({ ...history, daily }, cohortId);
}

function comparisonWeekFor(snapshot, cohortId = ALL_COHORTS) {
  const config = snapshot.weekly?.cohortComparison;
  if (!config) return snapshot.weekly?.currentWeek;
  if (cohortId === ALL_COHORTS) return config.weeks?.first || config.week || snapshot.weekly?.currentWeek;
  const index = config.cohortIds?.indexOf(cohortId) ?? -1;
  return index === 0 ? (config.weeks?.first || config.week) : index === 1 ? (config.weeks?.second || config.week) : snapshot.weekly?.currentWeek;
}

function comparisonSeries(records, key, labels) {
  const byDay = new Map(records.map((record) => [record.day || record.stage || record.date, trendMetric(record, key)]));
  return labels.map((label) => byDay.get(label) ?? null);
}

function comparisonRecordForDay(records, day) {
  return records.find((record) => (record.day || record.stage || record.date) === day) || null;
}

function comparisonDelta(firstValue, secondValue, type = "count") {
  if (!hasNumber(firstValue) || !hasNumber(secondValue)) return "待回填";
  const change = Number(secondValue) - Number(firstValue);
  if (type === "pp") return delta(change);
  return countDelta(change);
}

function historyDateEntries(snapshot, cohortId = ALL_COHORTS) {
  const entries = historyDates(historyFrom(snapshot), cohortId);
  if (snapshot.current?.date && !entries.some((item) => item.date === snapshot.current.date)) {
    entries.unshift({ date: snapshot.current.date, stage: snapshot.current.stage || "当前快照", day: "", cohortCount: 1 });
  }
  return entries;
}

function renderCohortFilter(snapshot, selectedCohortId, selectedDate, activeTab) {
  const history = historyFrom(snapshot);
  const cohorts = cohortEntries(history);
  const summary = summarizeHistory(history);
  const selected = selectedCohortId === ALL_COHORTS || cohorts.some((cohort) => cohort.id === selectedCohortId) ? selectedCohortId : ALL_COHORTS;
  const options = [`<option value="${ALL_COHORTS}"${selected === ALL_COHORTS ? " selected" : ""}>全部班期（总览）</option>`, ...cohorts.map((cohort) => `<option value="${escapeAttribute(cohort.id)}"${selected === cohort.id ? " selected" : ""}>${escapeHtml(cohort.name)} · ${escapeHtml(cohort.startDate)}</option>`)].join("");
  const dates = historyDateEntries(snapshot, selected);
  const effectiveDate = dates.some((item) => item.date === selectedDate) ? selectedDate : dates[0]?.date || snapshot.current.date;
  const dateOptions = dates.map((item) => `<option value="${escapeAttribute(item.date)}"${item.date === effectiveDate ? " selected" : ""}>${escapeHtml(item.date)} · ${escapeHtml(item.stage || item.day || "")}</option>`).join("");
  const dateFilter = activeTab === "daily" ? `<label for="rlineDateSelector"><span>数据日期</span><select id="rlineDateSelector" data-rline-date>${dateOptions || `<option value="${escapeAttribute(snapshot.current.date)}">${escapeHtml(snapshot.current.date)}</option>`}</select></label>` : "";
  return `<div class="rline-history-toolbar"><div class="rline-history-toolbar__filters"><label for="rlineCohortSelector"><span>班期视图</span><select id="rlineCohortSelector" data-rline-cohort>${options}</select></label>${dateFilter}</div><span class="rline-history-toolbar__meta">已留存 ${summary.cohortCount} 个班期 · ${summary.dailyCount} 条日快照 · ${summary.weeklyCount} 条周汇总</span></div>`;
}

function historyPercent(value) {
  return value === null || value === undefined ? "待回填" : `${Number(value).toFixed(2)}%`;
}

function renderHistoryPanel(snapshot) {
  const history = historyFrom(snapshot);
  const summary = summarizeHistory(history);
  const rollups = deriveWeeklyRollups(history);
  const cohorts = cohortEntries(history);
  const rows = rollups.map((rollup) => {
    const record = history.daily.filter((item) => (item.cohortId || item.cohortName) === rollup.cohortId && (item.week || "待确认") === rollup.week).sort((a, b) => (b.capturedAt || "").localeCompare(a.capturedAt || ""))[0];
    return `<div class="rline-history-row"><strong>${escapeHtml(rollup.cohortName)}</strong><span>${escapeHtml(rollup.courseStartDate)}</span><span>${escapeHtml(rollup.week)}</span><span>${escapeHtml(record?.stage || `${rollup.week}${record?.day || ""}`)}</span><span>${rollup.daysCaptured}天</span><span>${rollup.summary ? `${historyPercent(rollup.summary.retention)} / ${historyPercent(rollup.summary.depth)} / ${historyPercent(rollup.summary.completion)}` : "待周汇总"}</span><em class="${rollup.status === "closed" ? "is-closed" : ""}">${rollup.status === "closed" ? "已结周" : "进行中"}</em></div>`;
  }).join("");
  const declaredWithoutData = cohorts.filter((cohort) => !rollups.some((rollup) => rollup.cohortId === cohort.id)).map((cohort) => `<div class="rline-history-row"><strong>${escapeHtml(cohort.name)}</strong><span>${escapeHtml(cohort.startDate)}</span><span>待回填</span><span>待回填</span><span>0天</span><span>待周汇总</span><em>待同步</em></div>`).join("");
  return `<section class="panel rline-section" aria-labelledby="rline-history-title"><header class="panel__header"><div><p class="section-kicker">数据留存与班期范围</p><h2 id="rline-history-title">日快照追加保存，周汇总按班期和周次独立产出</h2><p>同一班期的12:00、14:00、18:00、24:00等时间点全部保留；周留存、周深度、周完课只读取明确的周汇总，不用阶段数据替代。</p></div>${renderBadge("info", `${summary.dailyCount}条日快照`)}</header><div class="rline-history-summary"><article><span>已纳入班期</span><strong>${summary.cohortCount}个</strong></article><article><span>已留存日快照</span><strong>${summary.dailyCount}条</strong></article><article><span>已产出周汇总</span><strong>${summary.weeklyCount}条</strong></article><article><span>最近快照时间</span><strong>${escapeHtml(summary.latestAsOf)}</strong></article></div><div class="rline-history-table"><div class="rline-history-row rline-history-row--head"><span>班期</span><span>开班日</span><span>周次</span><span>最新阶段</span><span>覆盖天数</span><span>周留存 / 深度 / 完课</span><span>状态</span></div>${rows || declaredWithoutData || `<div class="rline-history-empty">暂无班期留存数据</div>`}${rows ? declaredWithoutData : ""}</div><p class="rline-history-note">周汇总规则：按 <code>cohortId + week</code> 分组；只有周度表明确回填或连续5个日终快照齐全时，才标记为已结周。比例指标不跨班期简单平均。</p></section>`;
}

function biDataDate(bi) {
  if (bi?.dataDate) return bi.dataDate;
  const match = String(bi?.note || "").match(/本次为(\d{4}-\d{2}-\d{2})昨日快照/);
  return match?.[1] || null;
}

function completionReviewTextForDate(bi, date, selectedStage = ALL_BI_STAGES, selectedCohortId = ALL_BI_COHORTS) {
  const latestBiDate = biDataDate(bi);
  if (latestBiDate && date && latestBiDate !== date) return `日终完课数据待回填；BI最新可用日期为${latestBiDate}，不能替代${date}日终完课结论。`;
  return completionReviewText(bi, selectedStage, selectedCohortId);
}

function dailyTarget(snapshot, key, day) {
  const index = Number(String(day || "").replace(/^D/, "")) - 1;
  const series = snapshot.weekly?.targets?.daily?.[key];
  return Number.isInteger(index) && Array.isArray(series) ? series[index] ?? null : null;
}

function reviewContext(snapshot, cohortId, selectedDate) {
  const history = historyFrom(snapshot);
  const previous = previousDailyRecord(history, cohortId, selectedDate || snapshot.current?.date);
  if (!previous) return null;
  const prior = previousDailyRecord(history, cohortId, previous.date);
  return {
    previous,
    prior,
    metrics: previous.metrics || {},
    priorMetrics: prior?.metrics || {}
  };
}

function generatedEffectivenessText(snapshot, context) {
  if (!context) return "前一日暂无可用的24:00日终数据。";
  const { previous, prior, metrics, priorMetrics } = context;
  const quality = hasNumber(metrics.participant) && Number(metrics.participant) > 0 && hasNumber(metrics.positiveRead)
    ? `正读占参与${(Number(metrics.positiveRead) / Number(metrics.participant) * 100).toFixed(2)}%`
    : "正读占参与待回填";
  const movement = prior && hasNumber(priorMetrics.participant) && hasNumber(metrics.participant) && hasNumber(priorMetrics.positiveRead) && hasNumber(metrics.positiveRead)
    ? `较${prior.day || "前一日"}日终参与${countDelta(Number(metrics.participant) - Number(priorMetrics.participant))}、正读${countDelta(Number(metrics.positiveRead) - Number(priorMetrics.positiveRead))}`
    : "暂无上一日可对比数据";
  const retentionTarget = dailyTarget(snapshot, "retention", previous.day);
  const depthTarget = dailyTarget(snapshot, "depth", previous.day);
  const targetText = hasNumber(retentionTarget) && hasNumber(depthTarget)
    ? `较${previous.day}目标留存${delta(Number(metrics.retention) - retentionTarget)}、深度${delta(Number(metrics.depth) - depthTarget)}`
    : "日目标待回填";
  return `${previous.day || "前一日"} 24:00日终：总参与${number(metrics.participant)}人、正读${number(metrics.positiveRead)}人；${movement}。留存${percent(metrics.retention)}、深度${percent(metrics.depth)}，${targetText}；${quality}，参与质量${hasNumber(metrics.participant) && hasNumber(metrics.positiveRead) && Number(metrics.positiveRead) / Number(metrics.participant) >= 0.9 ? "稳定" : "仍需观察"}。`;
}

function generatedActionResultText(context) {
  if (!context) return "待回写：SOP动作完成情况、实际触达覆盖、用户反馈和异常原因。";
  const { previous, metrics } = context;
  return previous.actionResult || previous.review?.actionResult || `${previous.day || "前一日"} 24:00日终已回填；当前参与未完成${number(metrics.notFinished)}人。SOP发送、触达覆盖和用户反馈仍需主管日报或发送记录验证。`;
}

function generatedNextStepText(snapshot, context, selectedDate) {
  if (!context) return `进入${selectedDate || snapshot.current?.date || "下一日"}后，等待前一日24:00数据回填再形成策略结论。`;
  const { previous, metrics } = context;
  return previous.review?.nextStep || `进入${selectedDate || snapshot.current?.date || "下一日"}后，优先回看${previous.day || "前一日"}参与未完成${number(metrics.notFinished)}人的补读/正读变化，并结合日终动作证据决定SOP保留、调整或升级。`;
}

function generatedSopReviewText(context) {
  if (!context) return "待回写：结合前一日指标和日终动作回写，判断动作保留、调整或新增。";
  const { previous, metrics } = context;
  return previous.review?.sopReview || (hasNumber(metrics.notFinished)
    ? `日终仍有${number(metrics.notFinished)}人参与未完成；下一日增加未完成用户的定向补读提醒，验证补读完成率和次日正读变化；若补读仍无改善，再升级人工跟进。`
    : "结合前一日指标和日终动作回写，判断动作保留、调整或新增。 ");
}

function dayEndRecordsForWeek(snapshot, cohortId, week) {
  const history = historyFrom(snapshot);
  const daily = (history.daily || []).filter((record) => !week || record.week === week);
  return dayEndRecords({ ...history, daily }, cohortId);
}

function latestRecordByCohortName(snapshot, cohortName, day) {
  const records = (historyFrom(snapshot).daily || []).filter((record) => record.cohortName === cohortName && (!day || record.day === day) && (record.status === "closed" || record.asOf === "24:00"));
  return records.sort((a, b) => `${b.date}${b.asOf}`.localeCompare(`${a.date}${a.asOf}`))[0] || null;
}

function weightedBiSourceRows(snapshot, matcher = () => true) {
  const grouped = new Map();
  filterBiCohorts(snapshot.bi, ALL_BI_STAGES, ALL_BI_COHORTS)
    .filter((cohort) => cohort.status === "行课中" && matcher(cohort))
    .forEach((cohort) => (cohort.sources || []).forEach((source) => {
      const users = Number(source.users);
      if (!Number.isFinite(users) || users <= 0) return;
      const row = grouped.get(source.name) || { name: source.name, users: 0, participationTotal: 0, completionTotal: 0, depthTotal: 0 };
      row.users += users;
      row.participationTotal += users * Number(source.participation || 0);
      row.completionTotal += users * Number(source.completion || 0);
      row.depthTotal += users * Number(source.depth || 0);
      grouped.set(source.name, row);
    }));
  return [...grouped.values()].map((row) => ({
    ...row,
    participation: row.users > 0 ? row.participationTotal / row.users : null,
    completion: row.users > 0 ? row.completionTotal / row.users : null,
    depth: row.users > 0 ? row.depthTotal / row.users : null
  }));
}

function dataDrivenAnalysis(snapshot, cohortId = ALL_COHORTS) {
  const context = reviewContext(snapshot, cohortId, snapshot.current?.date);
  const current = context?.previous || null;
  const prior = context?.prior || null;
  const currentMetrics = current?.metrics || {};
  const priorMetrics = prior?.metrics || {};
  const firstCohortId = cohortEntries(historyFrom(snapshot)).find((cohort) => cohort.name === "1期")?.id;
  const firstWeek = firstCohortId ? dayEndRecordsForWeek(snapshot, firstCohortId, "M1W1") : [];
  const firstWeekStart = firstWeek[0]?.metrics || {};
  const firstWeekEnd = firstWeek[firstWeek.length - 1]?.metrics || {};
  const secondLatest = latestRecordByCohortName(snapshot, "2期", current?.day);
  const firstLatest = latestRecordByCohortName(snapshot, "1期", current?.day);
  const dailyRetentionTarget = dailyTarget(snapshot, "retention", current?.day);
  const dailyDepthTarget = dailyTarget(snapshot, "depth", current?.day);
  const weekly = snapshot.weekly?.officialSummary?.rows?.find((row) => row.label === "1期总") || null;
  const weeklyTarget = snapshot.references?.weekly || {};
  const currentQuality = hasNumber(currentMetrics.participant) && Number(currentMetrics.participant) > 0 && hasNumber(currentMetrics.positiveRead)
    ? Number(currentMetrics.positiveRead) / Number(currentMetrics.participant) * 100
    : null;
  const currentCohortRows = weightedBiSourceRows(snapshot, (cohort) => /-2期$/.test(String(cohort.cohortName || "")));
  const historicalCohortRows = weightedBiSourceRows(snapshot, (cohort) => /-1期$/.test(String(cohort.cohortName || "")));
  const currentChannelEvidence = filterBiCohorts(snapshot.bi, ALL_BI_STAGES, ALL_BI_COHORTS)
    .filter((cohort) => cohort.status === "行课中" && /-2期$/.test(String(cohort.cohortName || "")))
    .flatMap((cohort) => (cohort.sources || []).map((source) => ({ ...source, cohortName: cohort.cohortName })));
  const largestCurrentChannel = [...currentCohortRows].sort((a, b) => b.users - a.users)[0] || null;
  const lowestCurrentChannel = [...currentCohortRows].filter((row) => row.users >= 50).sort((a, b) => a.completion - b.completion)[0] || null;
  const largestHistoricalDepthGap = [...historicalCohortRows].filter((row) => row.users >= 50).sort((a, b) => a.depth - b.depth)[0] || null;
  return {
    context,
    current,
    prior,
    currentMetrics,
    priorMetrics,
    firstWeekStart,
    firstWeekEnd,
    secondLatest,
    firstLatest,
    dailyRetentionTarget,
    dailyDepthTarget,
    weekly,
    weeklyTarget,
    currentQuality,
    largestCurrentChannel,
    lowestCurrentChannel,
    largestHistoricalDepthGap,
    currentChannelEvidence,
    currentParticipantDelta: hasNumber(currentMetrics.participant) && hasNumber(priorMetrics.participant) ? Number(currentMetrics.participant) - Number(priorMetrics.participant) : null,
    currentPositiveDelta: hasNumber(currentMetrics.positiveRead) && hasNumber(priorMetrics.positiveRead) ? Number(currentMetrics.positiveRead) - Number(priorMetrics.positiveRead) : null
  };
}

function analysisValue(value, suffix = "%") {
  return hasNumber(value) ? `${Number(value).toFixed(2)}${suffix}` : "待回填";
}

function ppChangeLabel(value) {
  if (!hasNumber(value)) return "待回填";
  const amount = Math.abs(Number(value)).toFixed(2);
  if (Number(value) < 0) return `下降${amount}pp`;
  if (Number(value) > 0) return `上升${amount}pp`;
  return "持平";
}

function renderDecisionAnalysis(snapshot, cohortId = ALL_COHORTS) {
  const analysis = dataDrivenAnalysis(snapshot, cohortId);
  const {
    current, currentMetrics, prior, priorMetrics, firstWeekStart, firstWeekEnd, secondLatest, firstLatest,
    dailyRetentionTarget, dailyDepthTarget, weekly, weeklyTarget, currentQuality, largestCurrentChannel,
    lowestCurrentChannel, largestHistoricalDepthGap, currentChannelEvidence, currentParticipantDelta, currentPositiveDelta
  } = analysis;
  if (!current) return "";
  const currentDay = current.day || "前一日";
  const secondDayOne = latestRecordByCohortName(snapshot, "2期", "D1");
  const secondRetentionDrop = secondLatest && secondDayOne ? Number(secondLatest.metrics.retention) - Number(secondDayOne.metrics.retention) : null;
  const secondDepthDrop = secondLatest && secondDayOne ? Number(secondLatest.metrics.depth) - Number(secondDayOne.metrics.depth) : null;
  const weeklyText = weekly
    ? `M1W1官方周汇总为留存${analysisValue(weekly.retention)}、深度${analysisValue(weekly.depth)}、完课${analysisValue(weekly.completion)}，较周目标${delta(Number(weekly.retention) - Number(weeklyTarget.retention))}、${delta(Number(weekly.depth) - Number(weeklyTarget.depth))}、${delta(Number(weekly.completion) - Number(weeklyTarget.completion))}。`
    : "M1W1官方周汇总待回填。";
  const firstWeekTrend = hasNumber(firstWeekStart.retention) && hasNumber(firstWeekEnd.retention) && hasNumber(firstWeekStart.depth) && hasNumber(firstWeekEnd.depth)
    ? `首周D1→D5留存${analysisValue(firstWeekStart.retention)}→${analysisValue(firstWeekEnd.retention)}（${ppChangeLabel(Number(firstWeekEnd.retention) - Number(firstWeekStart.retention))}），深度${analysisValue(firstWeekStart.depth)}→${analysisValue(firstWeekEnd.depth)}（${ppChangeLabel(Number(firstWeekEnd.depth) - Number(firstWeekStart.depth))}）。`
    : "首周D1→D5日终趋势待回填。";
  const cohortComparison = secondLatest && firstLatest
    ? `同一${currentDay}口径下，2期留存${analysisValue(secondLatest.metrics?.retention)}、深度${analysisValue(secondLatest.metrics?.depth)}，高于1期${delta(Number(secondLatest.metrics.retention) - Number(firstLatest.metrics.retention))}/${delta(Number(secondLatest.metrics.depth) - Number(firstLatest.metrics.depth))}；2期自身较D1仍${ppChangeLabel(secondRetentionDrop)}/${ppChangeLabel(secondDepthDrop)}。`
    : "一期/二期同日对比待回填。";
  const channelText = largestCurrentChannel && lowestCurrentChannel
    ? `当前2期渠道中，${currentChannelEvidence.find((row) => row.cohortName === "R1-2期" && row.name === "APP部") ? `R1-2期APP部为${number(currentChannelEvidence.find((row) => row.cohortName === "R1-2期" && row.name === "APP部").users)}人、参与${biPercent(currentChannelEvidence.find((row) => row.cohortName === "R1-2期" && row.name === "APP部").participation)}、完课${biPercent(currentChannelEvidence.find((row) => row.cohortName === "R1-2期" && row.name === "APP部").completion)}；` : ""}${currentChannelEvidence.find((row) => row.cohortName === "R2-2期" && row.name === "用户召回") ? `R2-2期用户召回为${number(currentChannelEvidence.find((row) => row.cohortName === "R2-2期" && row.name === "用户召回").users)}人、参与${biPercent(currentChannelEvidence.find((row) => row.cohortName === "R2-2期" && row.name === "用户召回").participation)}、完课${biPercent(currentChannelEvidence.find((row) => row.cohortName === "R2-2期" && row.name === "用户召回").completion)}；` : ""}${lowestCurrentChannel.name}合并为${number(lowestCurrentChannel.users)}人、完课${biPercent(lowestCurrentChannel.completion)}，是有规模渠道里的最低完课结果；${largestCurrentChannel.name}合并规模最大，为${number(largestCurrentChannel.users)}人，应优先做分层触达验证。`
    : "当前行课渠道明细不足，暂不形成渠道优先级。";
  const historicalChannelText = largestHistoricalDepthGap
    ? `历史1期中，${largestHistoricalDepthGap.name}渠道100%深度${biPercent(largestHistoricalDepthGap.depth)}，说明参与后完整学习仍是结构性短板。`
    : "历史渠道深度数据待回填。";
  const actionEvidence = current.review?.actionResult || "SOP发送覆盖、回复率和动作结果证据待回写。";
  const currentFact = `D1→${currentDay}参与${number(priorMetrics.participant)}→${number(currentMetrics.participant)}人（${countDelta(currentParticipantDelta)}），正读${number(priorMetrics.positiveRead)}→${number(currentMetrics.positiveRead)}人（${countDelta(currentPositiveDelta)}）；留存${analysisValue(currentMetrics.retention)}（${ppChangeLabel(Number(currentMetrics.retention) - Number(priorMetrics.retention))}）、深度${analysisValue(currentMetrics.depth)}（${ppChangeLabel(Number(currentMetrics.depth) - Number(priorMetrics.depth))}），距${currentDay}目标${delta(Number(currentMetrics.retention) - Number(dailyRetentionTarget))}/${delta(Number(currentMetrics.depth) - Number(dailyDepthTarget))}。`;
  return `<section class="panel rline-section rline-decision-analysis" data-rline-decision-analysis aria-labelledby="rline-decision-analysis-title"><header class="panel__header"><div><p class="section-kicker">数据驱动分析</p><h2 id="rline-decision-analysis-title">数据分析与优化建议</h2><p>按“现象→判断→动作→验证”组织；事实来自日终、周汇总、BI渠道和已记录的主管反馈，推断与因果保持区分。</p></div>${renderBadge("warning", "需要动作")}</header><div class="rline-analysis-summary"><div><span>核心事实</span><strong>${escapeHtml(currentDay)}参与${number(currentMetrics.participant)}人 / 正读${number(currentMetrics.positiveRead)}人</strong><small>正读占参与${analysisValue(currentQuality)}；留存${analysisValue(currentMetrics.retention)}、深度${analysisValue(currentMetrics.depth)}</small></div><div><span>目标差距</span><strong>留存${ppChangeLabel(Number(currentMetrics.retention) - Number(dailyRetentionTarget))} / 深度${ppChangeLabel(Number(currentMetrics.depth) - Number(dailyDepthTarget))}</strong><small>${escapeHtml(weeklyText)}</small></div><div><span>优先对象</span><strong>${escapeHtml(lowestCurrentChannel?.name || "渠道待回填")}</strong><small>${escapeHtml(channelText)}</small></div></div><div class="rline-analysis-grid"><article data-priority="p0"><header><span class="rline-analysis-priority">P0 · 入口与持续参与</span><h3>问题不是“读不出来”，而是用户没有持续进入</h3></header><p><strong>现象：</strong>${escapeHtml(currentFact)} ${escapeHtml(firstWeekTrend)}</p><p><strong>判断：</strong>参与质量${analysisValue(currentQuality)}，说明已进入学习的用户大多能正读；主要损失发生在缺勤、回流和连续学习承接，不能把问题归结为单纯的阅读质量。</p><p><strong>动作：</strong>运营将缺勤/未开始、已参与未完成、失联用户拆成三组，分别配置APP Push、18:00补读提醒、20:30督学和人工首联；今日D3先按${number(currentMetrics.notFinished)}名参与未完成用户建立名单。</p><p><strong>负责人：</strong>运营+服务；<strong>验证指标：</strong>D3/D4 12:00、18:00、24:00参与回流人数、补读完成率、正读占参与。</p></article><article data-priority="p0"><header><span class="rline-analysis-priority">P0 · 完整学习与完课</span><h3>周留存不等于完整学习，深度和完课才是当前缺口</h3></header><p><strong>现象：</strong>${escapeHtml(weeklyText)} ${escapeHtml(historicalChannelText)}</p><p><strong>判断：</strong>首周官方留存看似达成，但深度、完课均未达标；结合主管反馈“词汇偏多且相似、缺少复述/趣味游戏/口语输出、绘本后直接答题”，当前更像内容承接和完成路径问题，不能只继续加触达次数。</p><p><strong>动作：</strong>教研在R1词汇引入增加开口练习、绘本到答题之间补故事回顾和轻量游戏；运营把完课用户奖励与补读入口写入18:00/20:30动作，先做D3-D5小范围验证。</p><p><strong>负责人：</strong>教研+运营；<strong>验证指标：</strong>100%深度、日终完课率、参与未完成转完课人数，按R1/R2和渠道分别回收。</p></article><article data-priority="p1"><header><span class="rline-analysis-priority">P1 · 渠道精细化</span><h3>优先改造有规模且结果偏低的渠道</h3></header><p><strong>现象：</strong>${escapeHtml(channelText)} ${escapeHtml(cohortComparison)}</p><p><strong>判断：</strong>2期整体比1期同日高，但2期D1→D2仍明显下滑；${escapeHtml(lowestCurrentChannel?.name || "低完课渠道")}既有规模又有结果压力，适合先做内容和触达AB验证。${largestCurrentChannel && largestCurrentChannel.name !== lowestCurrentChannel?.name ? `${escapeHtml(largestCurrentChannel.name)}规模最大，不能只看总盘平均完课率。` : ""}</p><p><strong>动作：</strong>优先对${escapeHtml(lowestCurrentChannel?.name || "低完课渠道")}补齐入口教育、分层提醒和完课承接；对${escapeHtml(largestCurrentChannel?.name || "大规模渠道")}单独看触达覆盖和回流，避免用总盘平均掩盖渠道问题。</p><p><strong>负责人：</strong>运营+渠道协同；<strong>验证指标：</strong>渠道参与率、课时完课率、100%深度、补完率，连续观察D3-D5；BI聚合结果只做方向判断，不作因果证明。</p></article><article data-priority="p1"><header><span class="rline-analysis-priority">P1 · 证据链与数据基建</span><h3>现在无法证明哪条SOP真正有效</h3></header><p><strong>现象：</strong>${escapeHtml(actionEvidence)} 当前BI最新日期为${escapeHtml(biDataDate(snapshot.bi) || "待回填")}，而本次日终已到${escapeHtml(current.date || "最新业务日")}；动作发送、触达、回复、回流和完课没有同一用户链路。</p><p><strong>判断：</strong>目前可以判断“结果变差、渠道有差异、内容存在反馈问题”，但不能把某个时间点的SOP直接说成有效或无效；继续只写“加强督学”不会产生可复用结论。</p><p><strong>动作：</strong>数据/产品补齐用户ID、动作ID、发送时间、送达/回复、补读/正读/完课回流字段；运营每天按12:00、14:00、18:00、24:00回写覆盖与结果，形成动作验收表。</p><p><strong>负责人：</strong>数据+产品+运营；<strong>验证指标：</strong>四个时点数据齐全率、动作触达率、回复率、触达后回流率，以及每条SOP对应的结果样本量。</p></article></div></section>`;
}

function renderPreviousDayReview(baseSnapshot, selectedCohortId, selectedDate, selectedBiStage = ALL_BI_STAGES, selectedBiCohortId = ALL_BI_COHORTS) {
  const context = reviewContext(baseSnapshot, selectedCohortId, selectedDate);
  if (!context) return "";
  const { previous, metrics } = context;
  const review = previous.review || {};
  const reference = previous.reference || baseSnapshot.references?.daily || {};
  const latestBiDate = biDataDate(baseSnapshot.bi);
  const completionStats = latestBiDate && latestBiDate !== previous.date ? null : summarizeBiCompletion(filterBiCohorts(baseSnapshot.bi, selectedBiStage, selectedBiCohortId));
  const completionText = completionReviewTextForDate(baseSnapshot.bi, previous.date, selectedBiStage, selectedBiCohortId);
  const effectiveness = review.effectiveness || review.strategy || generatedEffectivenessText(baseSnapshot, context);
  const nextStep = review.nextStep || generatedNextStepText(baseSnapshot, context, selectedDate);
  const actionResult = review.actionResult || previous.actionResult || generatedActionResultText(context);
  const sopReview = review.sopReview || generatedSopReviewText(context);
  const referenceText = hasNumber(metrics.retention) && hasNumber(reference.retention) && hasNumber(metrics.depth) && hasNumber(reference.depth)
    ? `留存${percent(metrics.retention)}（较参考${delta(Number(metrics.retention) - Number(reference.retention))}），深度${percent(metrics.depth)}（较参考${delta(Number(metrics.depth) - Number(reference.depth))}）。`
    : "前一日参考值或完整指标尚未回填。";
  return `<section class="panel rline-section rline-previous-review" aria-labelledby="rline-previous-review-title"><header class="panel__header"><div><p class="section-kicker">前一日24:00复盘</p><h2 id="rline-previous-review-title">${escapeHtml(previous.date)} · ${escapeHtml(previous.stage || `${previous.week || ""}${previous.day || ""}`)}</h2><p>当前查看${escapeHtml(selectedDate)}，复盘依据为前一日24:00日终数据；先判断策略结果，再承接今天的动作。</p></div>${renderBadge("success", "基于24:00日终")}</header><div class="rline-kpi-grid rline-previous-review__kpis">${metricCard("前一日参与", number(metrics.participant) + "人", `截至${previous.asOf || "24:00"}`, "blue")}${metricCard("前一日正读", number(metrics.positiveRead) + "人", "课程结果", "green")}${metricCard("前一日完课", completionStats ? `${number(completionStats.completedTotal)}人` : "待回填", completionStats ? `课时完课率${completionStats.overallCompletionRate.toFixed(1)}%` : `BI最新${latestBiDate || "数据待回填"}`, "teal")}${metricCard("前一日留存", percent(metrics.retention), "与参考值对照", "amber")}${metricCard("前一日深度", percent(metrics.depth), "与参考值对照", "coral")}</div><div class="rline-conclusion-grid"><article><span class="rline-conclusion__label">量化事实</span><p>${escapeHtml(referenceText)} 参与未完成${number(metrics.notFinished)}人；补读${number(metrics.supplementRead)}人。</p></article><article><span class="rline-conclusion__label">完课结果</span><p>${escapeHtml(completionText)}</p></article><article><span class="rline-conclusion__label">策略有效性</span><p>${escapeHtml(effectiveness)}</p></article><article><span class="rline-conclusion__label">今日承接</span><p>${escapeHtml(nextStep)}</p></article></div><p class="rline-history-note"><strong>动作证据：</strong>${escapeHtml(actionResult)}</p><p class="rline-history-note"><strong>SOP复盘：</strong>${escapeHtml(sopReview)}</p></section>`;
}

function previousDayReportRow(snapshot, cohortId, selectedBiStage = ALL_BI_STAGES, selectedBiCohortId = ALL_BI_COHORTS) {
  const context = reviewContext(snapshot, cohortId, snapshot.current.date);
  if (!context) return null;
  const { previous, metrics } = context;
  if (!previous) {
    return { label: "前一日24:00复盘", text: `${snapshot.current.date}的前一日24:00日终数据尚未回填，当前不提前形成策略结论；回填后再判断前一日SOP是否需要保留、调整或新增。` };
  }
  const reference = previous.reference || snapshot.references?.daily || {};
  const targetText = hasNumber(metrics.retention) && hasNumber(reference.retention) && hasNumber(metrics.depth) && hasNumber(reference.depth)
    ? `留存${percent(metrics.retention)}（较参考${delta(Number(metrics.retention) - Number(reference.retention))}），深度${percent(metrics.depth)}（较参考${delta(Number(metrics.depth) - Number(reference.depth))}）`
    : "留存、深度或参考值待回填";
  const completionText = completionReviewTextForDate(snapshot.bi, previous.date, selectedBiStage, selectedBiCohortId);
  return { label: "前一日24:00复盘", text: `依据${previous.date} ${previous.asOf || "24:00"}日终：参与${number(metrics.participant)}人、正读${number(metrics.positiveRead)}人，${targetText}；${completionText}今日结合日终动作回写和未完成用户补读/正读变化，判断前一日SOP保留、调整或新增。` };
}

function autoReportRows(snapshot, cohortId, date, selectedBiStage = ALL_BI_STAGES, selectedBiCohortId = ALL_BI_COHORTS) {
  const baseRows = Array.isArray(snapshot.report?.rows) ? snapshot.report.rows : [];
  const context = reviewContext(snapshot, cohortId, snapshot.current?.date || date);
  if (!context) return baseRows;
  const { previous, metrics } = context;
  const analysis = dataDrivenAnalysis(snapshot, cohortId);
  const { currentQuality, currentParticipantDelta, currentPositiveDelta, largestCurrentChannel, lowestCurrentChannel, weekly, weeklyTarget, currentChannelEvidence } = analysis;
  const previousRow = previousDayReportRow(snapshot, cohortId, selectedBiStage, selectedBiCohortId);
  const retentionTarget = dailyTarget(snapshot, "retention", previous.day);
  const depthTarget = dailyTarget(snapshot, "depth", previous.day);
  const completionText = completionReviewTextForDate(snapshot.bi, previous.date, selectedBiStage, selectedBiCohortId);
  const weeklyText = weekly
    ? `M1W1官方周汇总：留存${analysisValue(weekly.retention)}（较目标${delta(Number(weekly.retention) - Number(weeklyTarget.retention))}）、深度${analysisValue(weekly.depth)}（较目标${delta(Number(weekly.depth) - Number(weeklyTarget.depth))}）、完课${analysisValue(weekly.completion)}（较目标${delta(Number(weekly.completion) - Number(weeklyTarget.completion))}）。`
    : "M1W1官方周汇总待回填。";
  const channelText = lowestCurrentChannel
    ? `2期渠道中${lowestCurrentChannel.name}合并${number(lowestCurrentChannel.users)}人、完课${biPercent(lowestCurrentChannel.completion)}，为有规模渠道最低；${largestCurrentChannel?.name || "大规模渠道"}合并${number(largestCurrentChannel?.users)}人。R1-2期APP部${number(currentChannelEvidence.find((row) => row.cohortName === "R1-2期" && row.name === "APP部")?.users)}人，R2-2期用户召回${number(currentChannelEvidence.find((row) => row.cohortName === "R2-2期" && row.name === "用户召回")?.users)}人。`
    : "渠道结果待回填。";
  const effectivenessText = `${generatedEffectivenessText(snapshot, context)} 正读占参与${analysisValue(currentQuality)}，说明参与后的阅读质量稳定；但参与规模较前一日${countDelta(currentParticipantDelta)}、正读${countDelta(currentPositiveDelta)}，问题集中在回流和持续参与。动作证据：${generatedActionResultText(context)}`;
  const strategyText = `${generatedEffectivenessText(snapshot, context)} ${hasNumber(retentionTarget) && hasNumber(depthTarget) ? `距${previous.day}目标留存${ppChangeLabel(Number(metrics.retention) - retentionTarget)}、深度${ppChangeLabel(Number(metrics.depth) - depthTarget)}。` : "日目标待回填。"} ${weeklyText}${completionText} 判断：先保留分层召回和晚间督学，但不能只增加触达次数；需同时改造完课承接，并在D3-D5按渠道验证。`;
  const businessText = `${previous.day || "前一日"}日终用于判断总盘变化，一期/二期日终对比和BI渠道结果用于定位优先对象：${channelText}。规划上将缺勤/未开始、参与未完成、失联用户分别绑定APP Push、补读督学、人工首联；负责人为运营+服务，D3/D4回收参与回流、完课和100%深度。`;
  const infrastructureText = `日终数据已能按班期和D1/D2日维度留存，但BI最新为${biDataDate(snapshot.bi) || "待回填"}，与${previous.date}日终不一致；管理后台仍无法实时取数。数据/产品需补齐用户ID、动作ID、发送/回复/回流字段，验收12:00、14:00、18:00、24:00四个时点。`;
  const blockersText = `1、当前能判断参与下滑、目标差距、一期/二期和渠道差异，但不能证明某条SOP带来结果，因发送覆盖、回复率、回流和完课链路未齐。2、完课数据与日终日期未对齐，不能用旧BI阶段值替代最新日终。3、历史主管反馈已指出词汇偏多相似、缺少复述/趣味游戏/口语输出，需教研改造后用D3-D5验证。`;
  const needsText = `P0：补齐未开始/缺勤、参与未完成、失联用户分层名单和触达记录；P0：教研评估R1词汇开口练习及绘本到答题的回顾承接；P1：数据/产品开放实时取数和用户级动作回流字段；P1：为APP部和用户召回补充渠道触达及完课验证。每项需明确owner、截止时间和验收指标。`;
  const nextText = `${snapshot.current?.date || date}：12:00先拿D2参与未完成名单，18:00执行分层补读/入口教育，20:30执行未完成督学；同步记录发送覆盖、回复、补读/正读回流。24:00回收后更新D3目标差距，判断SOP保留、调整或升级。`;
  return [
    previousRow,
    { label: "关键节点服务策略有效性评估", text: effectivenessText },
    { label: "策略目标是否达成以及分析", text: strategyText },
    { label: "策略对业务的支撑程度和规划", text: businessText },
    { label: "基建推进", text: infrastructureText },
    { label: "卡点", text: blockersText },
    { label: "需求", text: needsText },
    { label: "明日安排", text: nextText }
  ].filter(Boolean);
}

function renderReportEditor(rows, draft = {}) {
  const draftCount = Object.keys(draft || {}).length;
  const fields = rows.map((row) => {
    const value = Object.prototype.hasOwnProperty.call(draft, row.label) ? draft[row.label] : row.text;
    return `<label class="rline-report-field"><span>${escapeHtml(row.label)}</span><textarea data-rline-report-row="${escapeAttribute(row.label)}" rows="4">${escapeHtml(value)}</textarea></label>`;
  }).join("");
  return `<section class="panel rline-section rline-report-editor" data-rline-report-editor aria-labelledby="rline-report-editor-title"><header class="panel__header"><div><p class="section-kicker">策略日报草稿</p><h2 id="rline-report-editor-title">今日策略结论</h2><p>上方“数据分析与优化建议”始终按最新全量数据生成；文本框只保留人工改动，未修改行继续跟随自动分析结果更新。</p></div><div class="rline-report-editor__actions"><button class="rline-report-editor__save" type="button" data-rline-report-save title="保存当前日报草稿">${icon("save")}<span>保存日报</span></button><button class="rline-report-editor__reset" type="button" data-rline-report-reset title="恢复自动生成的日报结论">${icon("rotate-ccw")}<span>恢复自动结论</span></button></div></header><div class="rline-report-table">${fields}</div><p class="rline-report-editor__status" data-rline-report-status aria-live="polite">${draftCount > 0 ? `已有${draftCount}行人工补充；上方自动分析预览已按最新数据更新` : "当前使用自动生成结论"}</p></section>`;
}

function reportRowsForEditor(snapshot, cohortId, date, selectedBiStage = ALL_BI_STAGES, selectedBiCohortId = ALL_BI_COHORTS) {
  return autoReportRows(snapshot, cohortId, date, selectedBiStage, selectedBiCohortId);
}

function splitFor(point, level, fallback = {}) {
  const split = Array.isArray(point?.split) ? point.split : [];
  return split.find((item) => item.level === level || String(item.className || "").startsWith(`${level}-`)) || fallback;
}

function pair(value, suffix = "人") {
  return `${number(value)}${suffix}`;
}

function renderIntradayComparison(snapshot) {
  const points = Array.isArray(snapshot.current.points) ? snapshot.current.points : [];
  const finalAsOf = snapshot.current.finalAsOf || "24:00";
  const fallbackSplit = snapshot.current.split || [];
  const rows = points.map((point, index) => {
    const previous = points[index - 1] || null;
    const final = point.time === finalAsOf || point.time === "日终";
    const r1 = splitFor(point, "R1", final ? fallbackSplit[0] : {});
    const r2 = splitFor(point, "R2", final ? fallbackSplit[1] : {});
    const participantDelta = hasNumber(point.participant) && hasNumber(previous?.participant) ? Number(point.participant) - Number(previous.participant) : null;
    const positiveDelta = hasNumber(point.positiveRead) && hasNumber(previous?.positiveRead) ? Number(point.positiveRead) - Number(previous.positiveRead) : null;
    const state = final ? "日终" : hasNumber(point.participant) ? "阶段" : "待回填";
    return `<div class="rline-intraday-row${final ? " is-day-end" : ""}"><span class="rline-intraday-time"><strong>${escapeHtml(point.time)}</strong><small>${state}</small></span><span>${pair(r1.participant)} / ${pair(r1.positiveRead)}</span><span>${percent(r1.retention)} / ${percent(r1.depth)}</span><span>${pair(r2.participant)} / ${pair(r2.positiveRead)}</span><span>${percent(r2.retention)} / ${percent(r2.depth)}</span><span>${pair(point.participant)} / ${pair(point.positiveRead)}</span><span>${percent(point.retention)} / ${percent(point.depth)}</span><span>${pair(point.absent)} / ${pair(point.notFinished)}</span><span>${countDelta(participantDelta)} / ${countDelta(positiveDelta)}</span></div>`;
  }).join("");
  return `<section class="panel rline-section" data-rline-intraday aria-labelledby="rline-intraday-title"><header class="panel__header"><div><p class="section-kicker">日内时点对比</p><h2 id="rline-intraday-title">${escapeHtml(snapshot.current.stage)} 全部时间点留存</h2><p>表内每个时点均保留；${escapeHtml(finalAsOf)} 是当天最终数据，阶段数据只用于看策略动作带来的增量。</p></div>${renderBadge("info", `${points.length}个时点`)}</header><div class="rline-intraday-table"><div class="rline-intraday-row rline-intraday-row--head"><span>时点</span><span>R1参与 / 正读</span><span>R1留存 / 深度</span><span>R2参与 / 正读</span><span>R2留存 / 深度</span><span>总参与 / 正读</span><span>总留存 / 深度</span><span>总缺勤 / 未完成</span><span>较前一时点</span></div>${rows || `<div class="rline-history-empty">暂无日内时点数据</div>`}</div><p class="rline-history-note">增量按相邻时间点计算；24:00 行以绿色标记，作为日终复盘和次日策略验证的主数据。</p></section>`;
}

function renderDataAvailability(snapshot, current) {
  const points = Array.isArray(snapshot.current.points) ? snapshot.current.points : [];
  const dayEndReady = points.some((point) => point.time === (snapshot.current.finalAsOf || "24:00") && hasNumber(point.participant));
  const missing = Array.isArray(snapshot.current.missing) ? snapshot.current.missing : [];
  const activeChannels = new Set((snapshot.bi?.cohorts || []).filter((cohort) => cohort.status === "行课中").flatMap((cohort) => (cohort.sources || []).map((source) => source.name))).size;
  const sopActions = (snapshot.sop?.actions || []).filter((action) => action.day === String(snapshot.current.stage || "").match(/D\d+$/)?.[0]).length;
  const items = [
    { label: "日内课程结果", value: `${points.length}个时点`, detail: dayEndReady ? "24:00日终已留存" : `${missing.length > 0 ? `待补${missing.join("、")}` : "阶段数据持续回收"}`, state: dayEndReady ? "ready" : "partial" },
    { label: "渠道完课结果", value: `${activeChannels}个渠道`, detail: "BI可看参与率、课时完课率", state: activeChannels > 0 ? "ready" : "partial" },
    { label: "SOP动作验证", value: `${sopActions}项已同步`, detail: "当前可看目标与执行节点，动作结果待回写", state: sopActions > 0 ? "partial" : "blocked" },
    { label: "首联服务有效性", value: "待接入", detail: "缺少用户级首联与完课关联", state: "blocked" }
  ];
  return `<section class="panel rline-section rline-data-availability" aria-labelledby="rline-data-availability-title"><header class="panel__header"><div><p class="section-kicker">当前数据能力</p><h2 id="rline-data-availability-title">现在能验证什么</h2><p>先用已有课程日数据和BI聚合结果判断推进方向；用户级首联服务效果暂不下结论。</p></div>${renderBadge(dayEndReady ? "success" : "warning", dayEndReady ? "日终可判断" : `截至${escapeHtml(current.time || snapshot.current.asOf)}`)}</header><div class="rline-data-availability__grid">${items.map((item) => `<article data-state="${item.state}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.detail)}</small></article>`).join("")}</div></section>`;
}

function biPercent(value) {
  return hasNumber(value) ? `${Number(value).toFixed(1)}%` : "待BI回填";
}

function renderSourceLabel(url, label) { const safeLabel = escapeHtml(label || "数据源"); return url ? `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${safeLabel}</a>` : `<span>${safeLabel}</span>`; }
function biCapturedAt(value) {
  if (!value) return "未知时间";
  return String(value).replace("T", " ").replace(/\+08:00$/, "").slice(0, 16);
}

const ALL_BI_STAGES = "all";
const ALL_BI_COHORTS = "all";

export function filterBiCohorts(bi, selectedStage = ALL_BI_STAGES, selectedCohortId = ALL_BI_COHORTS) {
  const cohorts = Array.isArray(bi?.cohorts) ? bi.cohorts : [];
  return cohorts.filter((cohort) => {
    const stageMatches = selectedStage === ALL_BI_STAGES || cohort.level === selectedStage;
    const cohortMatches = selectedCohortId === ALL_BI_COHORTS || cohort.cohortId === selectedCohortId;
    return stageMatches && cohortMatches;
  });
}

function summarizeBiCompletion(visibleCohorts) {
  const activeCohorts = visibleCohorts.filter((cohort) => cohort.status === "行课中");
  const grouped = new Map();
  activeCohorts.forEach((cohort) => {
    (cohort.sources || []).forEach((source) => {
      const users = Number(source.users);
      const completion = Number(source.completion);
      if (!Number.isFinite(users) || users < 0 || !Number.isFinite(completion)) return;
      const current = grouped.get(source.name) || { name: source.name, users: 0, completedExact: 0 };
      current.users += users;
      current.completedExact += users * completion / 100;
      grouped.set(source.name, current);
    });
  });
  const channels = [...grouped.values()].map((row) => ({
    ...row,
    completed: Math.round(row.completedExact),
    incomplete: Math.max(row.users - Math.round(row.completedExact), 0),
    incompleteExact: Math.max(row.users - row.completedExact, 0)
  }));
  if (channels.length === 0) return null;
  const completedTotalExact = channels.reduce((total, row) => total + row.completedExact, 0);
  const incompleteTotalExact = channels.reduce((total, row) => total + row.incompleteExact, 0);
  const rows = channels.map((row) => ({
    ...row,
    completedShare: completedTotalExact > 0 ? row.completedExact / completedTotalExact * 100 : null,
    incompleteShare: incompleteTotalExact > 0 ? row.incompleteExact / incompleteTotalExact * 100 : null,
    completionRate: row.users > 0 ? row.completedExact / row.users * 100 : null
  }));
  const totalUsers = completedTotalExact + incompleteTotalExact;
  return {
    rows,
    completedTotalExact,
    incompleteTotalExact,
    completedTotal: Math.round(completedTotalExact),
    incompleteTotal: Math.round(incompleteTotalExact),
    overallCompletionRate: totalUsers > 0 ? completedTotalExact / totalUsers * 100 : 0
  };
}

function completionReviewText(bi, selectedStage = ALL_BI_STAGES, selectedCohortId = ALL_BI_COHORTS) {
  const stats = summarizeBiCompletion(filterBiCohorts(bi, selectedStage, selectedCohortId));
  if (!stats) return "BI暂未提供可用于复盘的行课完课数据。";
  const channelRates = stats.rows.map((row) => `${row.name}${row.completionRate === null ? "待回填" : `${row.completionRate.toFixed(1)}%`}`).join("、");
  return `课时完课${stats.completedTotal}人、未完课${stats.incompleteTotal}人，整体课时完课率${stats.overallCompletionRate.toFixed(1)}%；各渠道课时完课率：${channelRates}。人数按BI在班用户×课时完课率估算。`;
}

function renderBiCompletionDistribution(visibleCohorts, selectedStageLabel, selectedCohortLabel) {
  const stats = summarizeBiCompletion(visibleCohorts);
  if (!stats) {
    return `<section class="rline-bi-distribution" aria-labelledby="rline-bi-distribution-title"><header class="rline-bi-distribution__header"><div><p class="section-kicker">完课渠道分析</p><h3 id="rline-bi-distribution-title">完课 / 未完课用户渠道分布</h3><p>当前筛选下没有可用于分析的行课中班期，未开课班期不形成完课结论。</p></div>${renderBadge("info", "待行课数据")}</header></section>`;
  }
  const { rows, completedTotalExact, incompleteTotalExact, completedTotal, incompleteTotal, overallCompletionRate } = stats;
  const topCompleted = [...rows].sort((a, b) => b.completedExact - a.completedExact)[0];
  const topIncomplete = [...rows].sort((a, b) => b.incompleteExact - a.incompleteExact)[0];
  const scope = selectedCohortLabel === "全部班期" ? `${selectedStageLabel}行课中班期` : selectedCohortLabel;
  const totalUsers = completedTotalExact + incompleteTotalExact;
  const shareColors = ["#2ea76f", "#4d8fe3", "#e86c56", "#d79a2b"];
  const shareRows = [...rows].sort((a, b) => (b.completedShare ?? -1) - (a.completedShare ?? -1)).map((row, index) => {
    const width = row.completedShare === null ? 0 : Math.max(0, Math.min(100, row.completedShare));
    return `<div class="rline-bi-share-row"><div><strong>${escapeHtml(row.name)}</strong><span>${number(row.completed)}人 · ${row.completedShare === null ? "待回填" : `${row.completedShare.toFixed(1)}%`}</span></div><div class="rline-bi-share-track"><i style="--share-width:${width.toFixed(1)}%;--share-color:${shareColors[index % shareColors.length]}"></i></div></div>`;
  }).join("");
  const channelShareChart = `<div class="rline-bi-channel-share" aria-label="完课用户渠道占比"><header><h4>完课用户渠道占比</h4><p>在全部完课用户中，各渠道贡献的比例</p></header><div class="rline-bi-share-list">${shareRows || `<p class="rline-history-empty">完课用户渠道占比待回填</p>`}</div></div>`;
  const distributionChart = `<div class="rline-bi-distribution__overview"><div class="rline-bi-donut" style="--complete-angle:${(overallCompletionRate * 3.6).toFixed(2)}deg" role="img" aria-label="完课${overallCompletionRate.toFixed(1)}%，未完课${(100 - overallCompletionRate).toFixed(1)}%"><div><strong>${overallCompletionRate.toFixed(1)}%</strong><span>完课率</span></div></div><div class="rline-bi-distribution__legend"><div><i class="is-complete"></i><strong>完课 ${number(completedTotal)}人</strong><span>${overallCompletionRate.toFixed(1)}%</span></div><div><i class="is-incomplete"></i><strong>未完课 ${number(incompleteTotal)}人</strong><span>${(100 - overallCompletionRate).toFixed(1)}%</span></div><p>当前渠道范围合计 ${number(totalUsers)} 人</p></div>${channelShareChart}</div>`;
  const conclusion = completedTotal > 0 && incompleteTotal > 0
    ? `当前查看${scope}：按BI“在班用户 × 课时完课率”估算，完课用户主要来自${topCompleted.name}，占${topCompleted.completedShare.toFixed(1)}%；未完课用户也主要集中在${topIncomplete.name}，占${topIncomplete.incompleteShare.toFixed(1)}%。策略上优先检查${topIncomplete.name}渠道的补读触达、学习入口和督学承接，下一时点回收补读完成率与正读变化。`
    : "当前筛选下完课或未完课分母为0，暂不形成渠道优先级；待行课日数据和24:00日终值回填后再判断。";
  const tableRows = rows.map((row) => `<div class="rline-bi-distribution-row"><span><strong>${escapeHtml(row.name)}</strong></span><span>${number(row.users)}人</span><span>${number(row.completed)}人</span><span>${number(row.incomplete)}人</span><span>${row.completedShare === null ? "待回填" : `${row.completedShare.toFixed(1)}%`}</span><span>${row.incompleteShare === null ? "待回填" : `${row.incompleteShare.toFixed(1)}%`}</span><span>${row.completionRate === null ? "待回填" : `${row.completionRate.toFixed(1)}%`}</span></div>`).join("");
  return `<section class="rline-bi-distribution" aria-labelledby="rline-bi-distribution-title"><header class="rline-bi-distribution__header"><div><p class="section-kicker">完课渠道分析</p><h3 id="rline-bi-distribution-title">完课 / 未完课用户渠道分布</h3><p>当前查看${escapeHtml(scope)}；用于定位完课和未完课集中渠道，承接补读与督学动作。</p></div>${renderBadge("warning", "BI口径估算")}</header><div class="rline-bi-distribution__conclusion"><span class="rline-conclusion__label">渠道结论</span><p>${escapeHtml(conclusion)}</p></div>${distributionChart}<div class="rline-bi-distribution-table"><div class="rline-bi-distribution-row rline-bi-distribution-row--head"><span>来源渠道</span><span>在班用户</span><span>完课人数（估算）</span><span>未完课人数（估算）</span><span>完课用户分布</span><span>未完课用户分布</span><span>BI课时完课率</span></div>${tableRows}</div><p class="rline-history-note">口径说明：当前日数据源尚未返回渠道级完课人数，人数按BI在班用户与课时完课率四舍五入估算；每日正式结论仍以对应日的24:00数据为准，精确渠道分析需日数据补回渠道字段。</p></section>`;
}

function renderBiRateComparison(visibleCohorts) {
  const activeCohorts = visibleCohorts.filter((cohort) => cohort.status === "行课中");
  const grouped = new Map();
  activeCohorts.forEach((cohort) => (cohort.sources || []).forEach((source) => {
    const users = Number(source.users);
    if (!Number.isFinite(users) || users <= 0) return;
    const row = grouped.get(source.name) || { name: source.name, users: 0, participationTotal: 0, completionTotal: 0 };
    row.users += users;
    row.participationTotal += users * Number(source.participation || 0);
    row.completionTotal += users * Number(source.completion || 0);
    grouped.set(source.name, row);
  }));
  const rows = [...grouped.values()].map((row) => ({
    ...row,
    participation: row.users > 0 ? row.participationTotal / row.users : null,
    completion: row.users > 0 ? row.completionTotal / row.users : null
  }));
  if (rows.length === 0) return "";
  const chart = renderBarChart({ title: "渠道参与率与完课率", subtitle: "按BI在班用户加权；用于比较渠道结果，不代表首联服务因果效果", labels: rows.map((row) => row.name), datasets: [{ label: "参与率", data: rows.map((row) => row.participation), color: "#4d8fe3" }, { label: "课时完课率", data: rows.map((row) => row.completion), color: "#2ea76f" }], yMax: 100, unit: "%", decimals: 1 });
  const table = rows.map((row) => `<div class="rline-bi-rate-row"><strong>${escapeHtml(row.name)}</strong><span>${number(row.users)}人</span><span>参与${biPercent(row.participation)}</span><span>完课${biPercent(row.completion)}</span></div>`).join("");
  return `<section class="rline-bi-rate-comparison" aria-labelledby="rline-bi-rate-title"><header><div><p class="section-kicker">渠道结果对比</p><h3 id="rline-bi-rate-title">先看渠道课程结果</h3><p>当前已有BI聚合数据，可先定位完课差异最大的渠道。</p></div>${renderBadge("success", "BI聚合可用")}</header><div class="rline-bi-rate-comparison__body">${chart}<div class="rline-bi-rate-table"><div class="rline-bi-rate-row rline-bi-rate-row--head"><span>渠道</span><span>在班</span><span>参与率</span><span>完课率</span></div>${table}</div></div></section>`;
}

function renderBiPanel(snapshot, selectedStage = ALL_BI_STAGES, selectedCohortId = ALL_BI_COHORTS) {
  const bi = snapshot.bi;
  if (!bi || !Array.isArray(bi.cohorts) || bi.cohorts.length === 0) return "";
  const stages = [...new Set(bi.cohorts.map((cohort) => cohort.level).filter(Boolean))];
  const normalizedStage = stages.includes(selectedStage) ? selectedStage : ALL_BI_STAGES;
  const stageCohorts = bi.cohorts.filter((cohort) => normalizedStage === ALL_BI_STAGES || cohort.level === normalizedStage);
  const normalizedCohortId = stageCohorts.some((cohort) => cohort.cohortId === selectedCohortId) ? selectedCohortId : ALL_BI_COHORTS;
  const visibleCohorts = filterBiCohorts(bi, normalizedStage, normalizedCohortId);
  const rows = visibleCohorts.flatMap((cohort) => (cohort.sources || []).map((source) => `<div class="rline-bi-row"><span><strong>${escapeHtml(cohort.cohortName)}</strong><small>${escapeHtml(cohort.level)} · ${escapeHtml(cohort.cohortId)}</small></span><span>${escapeHtml(cohort.status)}</span><span>${escapeHtml(cohort.courseStartDate || "待回填")}</span><span>${escapeHtml(source.name)}</span><span>${number(source.users)}人</span><span>${biPercent(source.userShare)}</span><span>${biPercent(source.participation)}</span><span>${biPercent(source.completion)}</span><span>${biPercent(source.depth)}</span><span>${biPercent(source.supplementCompletion)}</span><span>${biPercent(source.refundRate)}</span><span>${biPercent(source.conversionRate)}</span></div>`)).join("");
  const stageOptions = [`<option value="${ALL_BI_STAGES}"${normalizedStage === ALL_BI_STAGES ? " selected" : ""}>全部阶段</option>`, ...stages.map((stage) => `<option value="${escapeAttribute(stage)}"${stage === normalizedStage ? " selected" : ""}>${escapeHtml(stage)}</option>`)].join("");
  const cohortOptions = [`<option value="${ALL_BI_COHORTS}"${normalizedCohortId === ALL_BI_COHORTS ? " selected" : ""}>全部班期</option>`, ...stageCohorts.map((cohort) => `<option value="${escapeAttribute(cohort.cohortId)}"${cohort.cohortId === normalizedCohortId ? " selected" : ""}>${escapeHtml(cohort.cohortName)} · ${escapeHtml(cohort.courseStartDate || "待回填")}</option>`)].join("");
  const selectedStageLabel = normalizedStage === ALL_BI_STAGES ? "全部阶段" : normalizedStage;
  const selectedCohortLabel = normalizedCohortId === ALL_BI_COHORTS ? "全部班期" : stageCohorts.find((cohort) => cohort.cohortId === normalizedCohortId)?.cohortName || "全部班期";
  const sourceCount = visibleCohorts.reduce((total, cohort) => total + (cohort.sources || []).length, 0);
  const rateComparison = renderBiRateComparison(visibleCohorts);
  const completionDistribution = renderBiCompletionDistribution(visibleCohorts, selectedStageLabel, selectedCohortLabel);
  return `<section class="panel rline-section rline-bi-panel" data-rline-bi aria-labelledby="rline-bi-title"><header class="panel__header"><div><p class="section-kicker">课程BI实时结果</p><h2 id="rline-bi-title">按班期和来源渠道观察课程结果</h2><p>${escapeHtml(bi.note || "仅用于经营观察，不覆盖日内和日终历史快照。")}</p></div>${renderBadge(bi.status === "refreshed" ? "success" : "warning", `BI刷新 ${biCapturedAt(bi.capturedAt)}`)}</header><div class="rline-bi-toolbar" aria-label="课程BI筛选"><label for="rlineBiStageSelector"><span>查看阶段</span><select id="rlineBiStageSelector" data-rline-bi-stage>${stageOptions}</select></label><label for="rlineBiCohortSelector"><span>看哪一期</span><select id="rlineBiCohortSelector" data-rline-bi-cohort>${cohortOptions}</select></label><span class="rline-bi-toolbar__summary">当前查看：${escapeHtml(selectedStageLabel)} · ${escapeHtml(selectedCohortLabel)} · ${visibleCohorts.length}个班期 / ${sourceCount}个渠道</span></div>${rateComparison}<div class="rline-bi-table"><div class="rline-bi-row rline-bi-row--head"><span>班期</span><span>状态</span><span>开班日期</span><span>来源渠道</span><span>在班用户</span><span>用户占比</span><span>参与率</span><span>课时完课</span><span>100%深度</span><span>补完率</span><span>退单率</span><span>转化率</span></div>${rows || `<div class="rline-history-empty">当前筛选下暂无课程BI结果</div>`}</div>${completionDistribution}<p class="rline-history-note">数据源：${renderSourceLabel(bi.url, bi.name || "R线课程BI")}；未开课班期保留BI原始0值，但不纳入行课策略达成判断。</p></section>`;
}

function metricCard(label, value, detail, tone = "blue") {
  return `<article class="rline-kpi rline-kpi--${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function statusFor(action, asOf) {
  if (action.time < asOf) return renderBadge("success", "已到执行窗口 · 待回收");
  if (action.time === asOf) return renderBadge("warning", "当前执行节点 · 待验证");
  return renderBadge("info", "待执行/回收");
}

function renderActions(snapshot) {
  const day = String(snapshot.current.stage || "").match(/D\d+$/)?.[0];
  const actions = day ? snapshot.sop.actions.filter((action) => action.day === day) : snapshot.sop.actions;
  const sopSync = snapshot.sop.lastSyncedStage === snapshot.current.stage ? `已同步${snapshot.sop.lastSyncedStage}` : "当前日待同步";
  const actionBody = actions.length > 0 ? actions.map((action) => `<div class="rline-action-row"><span class="rline-time">${escapeHtml(action.time)}</span><span><strong>${escapeHtml(action.channel)}</strong><small>${escapeHtml(action.audience)}</small></span><span><strong>${escapeHtml(action.action)}</strong><small>${escapeHtml(action.goal)}</small></span><span><small>${escapeHtml(action.validation)}</small></span><span>${statusFor(action, snapshot.current.asOf)}</span></div>`).join("") : `<div class="rline-history-empty">${escapeHtml(snapshot.current.stage)}的SOP动作待同步，当前不沿用其他行课日动作。</div>`;
  return `<section class="panel rline-section" aria-labelledby="rline-actions-title"><header class="panel__header"><div><p class="section-kicker">今日SOP动作</p><h2 id="rline-actions-title">${escapeHtml(snapshot.current.stage)} · ${escapeHtml(snapshot.current.asOf)}前后动作</h2><p>按SOP顺序呈现动作、目标和验证指标；${escapeHtml(sopSync)}。状态只代表进入工作台的执行节点，不替代实际回写结果。</p></div>${renderBadge("info", `${actions.length}项动作`)}</header><div class="rline-action-table"><div class="rline-action-row rline-action-row--head"><span>时间</span><span>渠道 / 人群</span><span>策略动作</span><span>目标与验证</span><span>状态</span></div>${actionBody}</div></section>`;
}

function renderIntradayQualityInsight(points) {
  const observed = points.filter((point) => hasNumber(point.participant) && Number(point.participant) > 0 && hasNumber(point.notFinished));
  if (observed.length < 2) return `<div class="rline-chart-insight is-neutral"><strong>问题信号</strong><span>待补齐至少两个时点后，判断未完成用户占参与用户比例的变化。</span></div>`;
  const first = observed[0];
  const latest = observed[observed.length - 1];
  const firstRate = Number(first.notFinished) / Number(first.participant) * 100;
  const latestRate = Number(latest.notFinished) / Number(latest.participant) * 100;
  const change = latestRate - firstRate;
  const direction = change > 0.05 ? "上升" : change < -0.05 ? "下降" : "基本稳定";
  const tone = change > 0.05 ? "is-risk" : change < -0.05 ? "is-positive" : "is-neutral";
  const action = change > 0.05 ? "优先核查补读提醒、晚间督学和实际触达覆盖" : change < -0.05 ? "可保留当前承接动作，并继续观察日终结果" : "继续结合正读占比和日终动作回写判断动作质量";
  return `<div class="rline-chart-insight ${tone}"><strong>问题信号</strong><span>参与未完成占比由${firstRate.toFixed(1)}%（${escapeHtml(first.time)}）${direction}${Math.abs(change).toFixed(1)}pp至${latestRate.toFixed(1)}%（${escapeHtml(latest.time)}）；${action}。</span></div>`;
}

function trendMetric(record, key) {
  const value = record?.metrics?.[key] ?? record?.[key] ?? record?.summary?.[key] ?? null;
  if (key !== "completion" || hasNumber(value)) return value;
  const completed = record?.metrics?.completed ?? record?.completed;
  const totalUsers = record?.totalUsers;
  return hasNumber(completed) && hasNumber(totalUsers) && Number(totalUsers) > 0 ? Number((Number(completed) / Number(totalUsers) * 100).toFixed(2)) : null;
}

function trendReference(snapshot, label, labels) {
  const trend = snapshot.weekly?.trend || {};
  const dataset = (trend.datasets || []).find((item) => item.label === label);
  return labels.map((day) => {
    const index = (trend.labels || []).indexOf(day);
    return index >= 0 ? dataset?.data?.[index] ?? null : null;
  });
}

function targetSeries(snapshot, key, labels, period = "daily") {
  const targets = snapshot.weekly?.targets?.[period];
  if (Array.isArray(targets?.[key])) {
    return labels.map((label) => {
      const index = (targets.labels || []).indexOf(label);
      return index >= 0 ? targets[key][index] ?? null : null;
    });
  }
  const legacyLabel = { retention: "日留存参考", depth: "日深度参考", completion: "日完课参考" }[key];
  return legacyLabel ? trendReference(snapshot, legacyLabel, labels) : labels.map(() => null);
}

function goalSummary(actual, target) {
  const difference = hasNumber(actual) && hasNumber(target) ? delta(Number(actual) - Number(target)) : "待回填";
  return `实际${percent(actual)} · 目标${percent(target)} · 较目标${difference}`;
}

function renderDayEndTrend(snapshot, cohortId = ALL_COHORTS, week = comparisonWeekFor(snapshot, cohortId)) {
  const records = weekDayEndRecords(snapshot, cohortId, week);
  const referenceTrend = snapshot.weekly?.trend || {};
  const labels = records.length > 0
    ? records.map((record, index) => record.day || String(record.stage || "").match(/D\d+$/)?.[0] || `D${index + 1}`)
    : (referenceTrend.labels || []);
  const actual = (key) => records.length > 0 ? records.map((record) => trendMetric(record, key)) : labels.map(() => null);
  const completionValues = actual("completion");
  const hasCompletion = completionValues.some(hasNumber);
  const scope = cohortId === ALL_COHORTS ? "全部班期" : snapshot.current.cohort;
  const actualDatasets = [
    { label: "留存实际", data: actual("retention"), color: "#16795a", valueLabelOffset: 14 },
    { label: "深度实际", data: actual("depth"), color: "#4d8fe3", valueLabelOffset: 28 },
    { label: "完课实际", data: completionValues, color: "#dd9d22", valueLabelOffset: 42 }
  ];
  const referenceDatasets = [
    { label: "留存目标线", data: targetSeries(snapshot, "retention", labels), color: "#16795a", dashed: true, valueLabelOffset: -12 },
    { label: "深度目标线", data: targetSeries(snapshot, "depth", labels), color: "#4d8fe3", dashed: true, valueLabelOffset: -26 },
    { label: "完课目标线", data: targetSeries(snapshot, "completion", labels), color: "#dd9d22", dashed: true, valueLabelOffset: -40 }
  ];
  const status = records.length === 0 ? "等待日终" : hasCompletion ? `已留存${records.length}天` : `已留存${records.length}天 · 完课待回填`;
  const note = records.length === 0
    ? `当前${scope}还没有可用的24:00日终点；先保留首周目标线，日终数据回填后自动连线。`
    : `${scope}已按24:00日终值连接${labels.join("、")}；实线为实际值，虚线为首周目标线。每个日终点都计算实际值与目标的差值；完课率${hasCompletion ? "已纳入" : "尚无逐日日终回填，暂不使用BI阶段完课率替代"}。`;
  const rows = records.map((record, index) => {
    const label = labels[index];
    const retention = trendMetric(record, "retention");
    const depth = trendMetric(record, "depth");
    const completion = trendMetric(record, "completion");
    return `<div><strong>${escapeHtml(label)}</strong><span>留存：${escapeHtml(goalSummary(retention, targetSeries(snapshot, "retention", [label])[0]))}</span><span>深度：${escapeHtml(goalSummary(depth, targetSeries(snapshot, "depth", [label])[0]))}</span><span>完课：${escapeHtml(goalSummary(completion, targetSeries(snapshot, "completion", [label])[0]))}</span></div>`;
  }).join("");
  return `<section class="rline-day-trend" aria-labelledby="rline-day-trend-title"><header class="rline-day-trend__header"><div><p class="section-kicker">首周日目标线 · 日维度变化</p><h3 id="rline-day-trend-title">D1、D2、D3…日终留存 / 深度 / 完课变化</h3><p>每日只取24:00最终值；实线是实际值，虚线是首周目标线，卡片显示每天与目标的差值。</p></div><span class="rline-chart-status">${escapeHtml(status)}</span></header>${renderLineChart({ title: "日终指标变化", subtitle: "实线：日终实际 · 虚线：首周目标线", labels, datasets: [...actualDatasets, ...referenceDatasets], yMax: 100, unit: "%", decimals: 1, showValues: true, emptyLabel: records.length === 0 ? "暂无日终数据" : "" })}<div class="rline-day-trend__note"><strong>目标口径</strong><span>${escapeHtml(note)}</span></div>${rows ? `<div class="rline-day-trend__table">${rows}</div>` : ""}</section>`;
}

function renderWeeklyDailyTable(snapshot, cohortId = ALL_COHORTS, week = comparisonWeekFor(snapshot, cohortId)) {
  const records = weekDayEndRecords(snapshot, cohortId, week);
  const rows = records.map((record) => {
    const day = record.day || record.stage || "待确认";
    const retentionTarget = targetSeries(snapshot, "retention", [day])[0];
    const depthTarget = targetSeries(snapshot, "depth", [day])[0];
    const completion = trendMetric(record, "completion");
    const completionTarget = targetSeries(snapshot, "completion", [day])[0];
    return `<div class="rline-weekly-daily-row"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(record.date || "待回填")}</span><span>${number(record.metrics?.participant)}人</span><span>${number(record.metrics?.positiveRead)}人</span><span>${escapeHtml(goalSummary(record.metrics?.retention, retentionTarget))}</span><span>${escapeHtml(goalSummary(record.metrics?.depth, depthTarget))}</span><span>${escapeHtml(goalSummary(completion, completionTarget))}</span><span>${number(record.metrics?.absent)}人</span><span>${number(record.metrics?.notFinished)}人</span></div>`;
  }).join("");
  return `<section class="panel rline-section rline-weekly-daily-table" aria-labelledby="rline-weekly-daily-table-title"><header class="panel__header"><div><p class="section-kicker">阶段周数据表</p><h2 id="rline-weekly-daily-table-title">${escapeHtml(week || "当前周")}前${records.length}个日终数据</h2><p>每日只取24:00最终值；留存、深度、完课均展示实际值、首周目标和差值。</p></div>${renderBadge(records.length >= 5 ? "success" : "info", `已留存${records.length}/5天`)}</header><div class="rline-weekly-daily-grid"><div class="rline-weekly-daily-row rline-weekly-daily-row--head"><span>行课日</span><span>日期</span><span>参与</span><span>正读</span><span>留存实际 / 目标 / 差值</span><span>深度实际 / 目标 / 差值</span><span>完课实际 / 目标 / 差值</span><span>缺勤</span><span>参与未完成</span></div>${rows || `<div class="rline-history-empty">暂无24:00日终数据</div>`}</div><p class="rline-history-note"><strong>周度口径：</strong>周留存、周深度、周完课以周数据表明确回写为准；本表用于观察D1-D${records.length}日终趋势和目标差距。</p></section>`;
}

function renderWeeklyOfficialSummary(snapshot) {
  const summary = snapshot.weekly?.officialSummary;
  const rows = summary?.rows || [];
  if (!rows.length) return "";
  const cells = rows.map((row) => `<div class="rline-weekly-official-row"><strong>${escapeHtml(row.label)}</strong><span>${number(row.totalUsers)}人</span><span>${number(row.participant)}人</span><span>${percent(row.retention)}</span><span>${number(row.depthCompletedUsers)}人</span><span>${percent(row.depth)}</span><span>${number(row.expectedLessonHours)}</span><span>${number(row.completedLessonHours)}</span><span>${percent(row.completion)}</span></div>`).join("");
  const total = rows.find((row) => row.label === "1期总") || rows[rows.length - 1];
  return `<section class="panel rline-section rline-weekly-official-table" aria-labelledby="rline-weekly-official-table-title"><header class="panel__header"><div><p class="section-kicker">官方周度汇总</p><h2 id="rline-weekly-official-table-title">M1W1 R1 / R2 / 1期总周数据</h2><p>来源于用户提供的M1W1周数据表；历史差值列未做口径推断。</p></div>${renderBadge("success", "周表已回填")}</header><div class="rline-weekly-official-grid"><div class="rline-weekly-official-row rline-weekly-official-row--head"><span>范围</span><span>总人数</span><span>参与人数</span><span>留存</span><span>深度完成</span><span>深度</span><span>应完成课时</span><span>实际完课</span><span>完课率</span></div>${cells}</div><p class="rline-history-note"><strong>整体结果：</strong>总人数${number(total.totalUsers)}人，参与${number(total.participant)}人，留存${percent(total.retention)}，深度${percent(total.depth)}，实际完课${number(total.completedLessonHours)}/${number(total.expectedLessonHours)}课时，完课率${percent(total.completion)}。</p></section>`;
}

function renderMonthlyTargetTrend(snapshot, cohortId = ALL_COHORTS) {
  const targets = snapshot.weekly?.targets?.monthly;
  if (!targets) return "";
  const labels = targets.labels || [];
  const records = (historyFrom(snapshot).weekly || []).filter((record) => cohortId === ALL_COHORTS || record.cohortId === cohortId);
  const byWeek = new Map(records.map((record) => [String(record.week || "").match(/W\d+/)?.[0] || record.week, record.summary || {}]));
  const actual = (key) => labels.map((label) => byWeek.get(label)?.[key] ?? null);
  const target = (key) => targetSeries(snapshot, key, labels, "monthly");
  const actualDatasets = [
    { label: "留存实际", data: actual("retention"), color: "#16795a" },
    { label: "深度实际", data: actual("depth"), color: "#4d8fe3" },
    { label: "完课实际", data: actual("completion"), color: "#dd9d22" }
  ];
  const targetDatasets = [
    { label: "留存目标线", data: target("retention"), color: "#16795a", dashed: true },
    { label: "深度目标线", data: target("depth"), color: "#4d8fe3", dashed: true },
    { label: "完课目标线", data: target("completion"), color: "#dd9d22", dashed: true }
  ];
  const rows = labels.map((label, index) => `<div><strong>${escapeHtml(label)}</strong><span>留存：${escapeHtml(goalSummary(actual("retention")[index], target("retention")[index]))}</span><span>深度：${escapeHtml(goalSummary(actual("depth")[index], target("depth")[index]))}</span><span>完课：${escapeHtml(goalSummary(actual("completion")[index], target("completion")[index]))}</span></div>`).join("");
  return `<section class="panel rline-section rline-month-target-trend" aria-labelledby="rline-month-target-trend-title"><header class="panel__header"><div><p class="section-kicker">首月周目标线 · 目标路径</p><h2 id="rline-month-target-trend-title">W1-W4实际变化与首月目标线</h2><p>实线为已回填周度实际值，虚线为首月目标；未回填周次保持断点，避免把目标误认为实际结果。</p></div>${renderBadge(records.length ? "info" : "warning", records.length ? `已回填${records.length}周` : "等待周度数据")}</header>${renderLineChart({ title: "首月周度指标变化", subtitle: "留存 / 深度 / 完课实际与目标线", labels, datasets: [...actualDatasets, ...targetDatasets], yMax: 100, unit: "%", decimals: 1, emptyLabel: records.length ? "W2-W4待回填" : "暂无周度实际" })}<div class="rline-day-trend__table">${rows}</div></section>`;
}

function renderCohortComparison(snapshot) {
  const config = snapshot.weekly?.cohortComparison;
  if (!config) return "";
  const history = historyFrom(snapshot);
  const cohorts = cohortEntries(history);
  const cohortMap = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
  const firstId = config.cohortIds?.[0];
  const secondId = config.cohortIds?.[1];
  const firstWeek = config.weeks?.first || config.week;
  const secondWeek = config.weeks?.second || config.week;
  const firstRecords = weekDayEndRecords(snapshot, firstId, firstWeek);
  const secondRecords = weekDayEndRecords(snapshot, secondId, secondWeek);
  const firstName = cohortMap.get(firstId)?.name || "第一期";
  const secondName = cohortMap.get(secondId)?.name || "第二期";
  const labels = [...new Set([...firstRecords, ...secondRecords].map((record) => record.day || record.stage || record.date))]
    .sort((a, b) => Number(String(a).replace(/\D/g, "")) - Number(String(b).replace(/\D/g, "")));
  const firstD1 = comparisonRecordForDay(firstRecords, "D1");
  const secondD1 = comparisonRecordForDay(secondRecords, "D1");
  const summaryValue = (record, level, key) => {
    if (level === "总体") return key === "totalUsers" ? record?.totalUsers : record?.metrics?.[key];
    return record?.split?.find((item) => item.level === level)?.[key];
  };
  const summaryRows = ["总体", "R1", "R2"].map((level) => {
    const firstSummary = `总人数${number(summaryValue(firstD1, level, "totalUsers"))} · 参与${number(summaryValue(firstD1, level, "participant"))} · 正读${number(summaryValue(firstD1, level, "positiveRead"))} · 留存${percent(summaryValue(firstD1, level, "retention"))} · 深度${percent(summaryValue(firstD1, level, "depth"))}`;
    const secondSummary = `总人数${number(summaryValue(secondD1, level, "totalUsers"))} · 参与${number(summaryValue(secondD1, level, "participant"))} · 正读${number(summaryValue(secondD1, level, "positiveRead"))} · 留存${percent(summaryValue(secondD1, level, "retention"))} · 深度${percent(summaryValue(secondD1, level, "depth"))}`;
    const change = `参与${comparisonDelta(summaryValue(firstD1, level, "participant"), summaryValue(secondD1, level, "participant"))} · 留存${comparisonDelta(summaryValue(firstD1, level, "retention"), summaryValue(secondD1, level, "retention"), "pp")} · 深度${comparisonDelta(summaryValue(firstD1, level, "depth"), summaryValue(secondD1, level, "depth"), "pp")}`;
    return `<div class="rline-cohort-compare-row"><strong>${escapeHtml(level)}</strong><span>${escapeHtml(firstSummary)}</span><span>${escapeHtml(secondSummary)}</span><em>${escapeHtml(change)}</em></div>`;
  }).join("");
  const firstLabel = `${firstName}日终`;
  const secondLabel = `${secondName}日终`;
  const retentionChart = renderLineChart({ title: "留存日变化", subtitle: `${firstName} vs ${secondName} · 实线为实际，虚线为首周目标`, labels, datasets: [{ label: firstLabel, data: comparisonSeries(firstRecords, "retention", labels), color: "#16795a" }, { label: secondLabel, data: comparisonSeries(secondRecords, "retention", labels), color: "#e86c56" }, { label: "留存目标线", data: targetSeries(snapshot, "retention", labels), color: "#16795a", dashed: true }], yMax: 100, unit: "%", decimals: 1, emptyLabel: "第二期后续日终待回填" });
  const depthChart = renderLineChart({ title: "深度日变化", subtitle: `${firstName} vs ${secondName} · 实线为实际，虚线为首周目标`, labels, datasets: [{ label: firstLabel, data: comparisonSeries(firstRecords, "depth", labels), color: "#4d8fe3" }, { label: secondLabel, data: comparisonSeries(secondRecords, "depth", labels), color: "#dd9d22" }, { label: "深度目标线", data: targetSeries(snapshot, "depth", labels), color: "#4d8fe3", dashed: true }], yMax: 100, unit: "%", decimals: 1, emptyLabel: "第二期后续日终待回填" });
  const completionChart = renderLineChart({ title: "完课日变化", subtitle: `${firstName} vs ${secondName} · 暂无日终完课时保持断点`, labels, datasets: [{ label: firstLabel, data: comparisonSeries(firstRecords, "completion", labels), color: "#b7791f" }, { label: secondLabel, data: comparisonSeries(secondRecords, "completion", labels), color: "#ef8d4d" }, { label: "完课目标线", data: targetSeries(snapshot, "completion", labels), color: "#b7791f", dashed: true }], yMax: 100, unit: "%", decimals: 1, emptyLabel: "逐日日终完课待回填" });
  const participantChart = renderLineChart({ title: "参与人数日变化", subtitle: `${firstName} vs ${secondName} · 绝对人数仅作规模观察，无人数目标线`, labels, datasets: [{ label: firstLabel, data: comparisonSeries(firstRecords, "participant", labels), color: "#16795a" }, { label: secondLabel, data: comparisonSeries(secondRecords, "participant", labels), color: "#e86c56" }], unit: "人", decimals: 0, emptyLabel: "第二期后续日终待回填" });
  const dailyRows = labels.map((label) => {
    const first = comparisonRecordForDay(firstRecords, label);
    const second = comparisonRecordForDay(secondRecords, label);
    return `<div class="rline-cohort-compare-daily-row"><strong>${escapeHtml(label)}</strong><span>${first ? `留存${percent(first.metrics?.retention)} · 深度${percent(first.metrics?.depth)} · 完课${percent(trendMetric(first, "completion"))} · 参与${number(first.metrics?.participant)}人` : "待回填"}</span><span>${second ? `留存${percent(second.metrics?.retention)} · 深度${percent(second.metrics?.depth)} · 完课${percent(trendMetric(second, "completion"))} · 参与${number(second.metrics?.participant)}人` : "待回填"}</span><em>${first ? `一期留存${comparisonDelta(first.metrics?.retention, targetSeries(snapshot, "retention", [label])[0], "pp")} · 深度${comparisonDelta(first.metrics?.depth, targetSeries(snapshot, "depth", [label])[0], "pp")}` : "等待一期数据"}${second ? `；二期留存${comparisonDelta(second.metrics?.retention, targetSeries(snapshot, "retention", [label])[0], "pp")} · 深度${comparisonDelta(second.metrics?.depth, targetSeries(snapshot, "depth", [label])[0], "pp")}` : "；等待二期数据"}</em></div>`;
  }).join("");
  const availableDays = secondRecords.map((record) => record.day || record.stage || record.date).join("、") || "暂无";
  const comparedDays = secondRecords.map((record) => record.day || record.stage || record.date).join("、") || "暂无";
  const pendingDays = ["D1", "D2", "D3", "D4", "D5"].filter((day) => !secondRecords.some((record) => (record.day || record.stage || record.date) === day)).join("、") || "无";
  return `<section class="panel rline-section rline-cohort-comparison" aria-labelledby="rline-cohort-comparison-title"><header class="panel__header"><div><p class="section-kicker">班期横向对比</p><h2 id="rline-cohort-comparison-title">${escapeHtml(firstName)} vs ${escapeHtml(secondName)}：${escapeHtml(config.weekLabel || config.week)}每天变化</h2><p>按相同行课日和24:00日终节点对齐；当前${escapeHtml(secondName)}已留存${escapeHtml(comparedDays)}，后续${escapeHtml(pendingDays)}数据到达后自动补点。</p></div>${renderBadge(secondRecords.length >= 5 ? "success" : "info", `已对比${escapeHtml(comparedDays)}`)}</header><div class="rline-cohort-compare-grid"><div class="rline-chart-grid">${retentionChart}${depthChart}${completionChart}${participantChart}</div><div class="rline-cohort-compare-table"><div class="rline-cohort-compare-row rline-cohort-compare-row--head"><span>范围</span><span>${escapeHtml(firstName)} D1</span><span>${escapeHtml(secondName)} D1</span><span>${escapeHtml(secondName)} - ${escapeHtml(firstName)}</span></div>${summaryRows}</div><div class="rline-cohort-compare-daily"><div class="rline-cohort-compare-daily-row rline-cohort-compare-daily-row--head"><span>行课日</span><span>${escapeHtml(firstName)}</span><span>${escapeHtml(secondName)}</span><span>实际与目标差值</span></div>${dailyRows}</div></div><p class="rline-history-note"><strong>数据说明：</strong>${escapeHtml(config.note || "")}${secondD1?.sourceBreakdown ? " 第二期D1/D2原始数据按Kitty、Taby拆分，表内使用R1/R2加权汇总；原始四组数据保留在记录中。" : ""} 参与人数是规模指标，当前没有人为设定目标线。</p></section>`;
}

function cohortMapLabel(snapshot, cohortId) {
  if (cohortId === ALL_COHORTS) return "全部班期";
  return cohortEntries(historyFrom(snapshot)).find((cohort) => cohort.id === cohortId)?.name || "选定班期";
}

function renderDailyCharts(snapshot, cohortId = ALL_COHORTS) {
  const points = snapshot.current.points || [];
  const latest = [...points].reverse().find((point) => hasNumber(point.participant)) || points[points.length - 1] || {};
  const pendingTime = snapshot.current.pending?.[0] || "无";
  const qualityDatasets = [
    { label: "正读占参与", data: points.map((point) => hasNumber(point.participant) && Number(point.participant) > 0 && hasNumber(point.positiveRead) ? Number(point.positiveRead) / Number(point.participant) * 100 : null), color: "#2ea76f" },
    { label: "未完成占参与", data: points.map((point) => hasNumber(point.participant) && Number(point.participant) > 0 && hasNumber(point.notFinished) ? Number(point.notFinished) / Number(point.participant) * 100 : null), color: "#e86c56" }
  ];
  const isFinal = snapshot.current.asOf === (snapshot.current.finalAsOf || "24:00") || snapshot.current.status === "closed";
  const qualityChart = renderBarChart({ title: "参与质量对比", subtitle: "把人数换成占比；未完成占比上升就是掉队信号", labels: points.map((point) => point.time), datasets: qualityDatasets, yMax: 100, unit: "%", decimals: 1, emptyLabel: isFinal ? "无待回填时点" : "当前时点待回填" });
  return `<section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">行课数据图表</p><h2>日内行为质量与目标差距</h2><p>用占比观察参与用户是否真正转成正读；${escapeHtml(snapshot.current.finalAsOf || "24:00")} 才作为日终数据判断${escapeHtml(snapshot.current.stage)}是否达标。</p></div>${renderBadge(isFinal ? "success" : "info", isFinal ? "日终数据" : `阶段性 · ${pendingTime}待回填`)}</header><div class="rline-chart-grid"><div class="rline-chart-with-insight">${qualityChart}${renderIntradayQualityInsight(points)}</div>${renderBarChart({ title: `日终数据与${snapshot.references.daily.label}对照`, subtitle: isFinal ? "24:00作为当日最终值" : "阶段值仅用于判断推进方向，不能替代日终值", labels: ["留存", "深度", "完课"], datasets: [{ label: `当前${snapshot.current.asOf}`, data: [latest.retention ?? null, latest.depth ?? null, null], color: "#4d8fe3" }, { label: "D1参考", data: [snapshot.references.daily.retention, snapshot.references.daily.depth, snapshot.references.daily.completion], color: "#16795a" }], yMax: 100, unit: "%", decimals: 2, emptyLabel: "完课字段待回填" })}</div>${renderDayEndTrend(snapshot, cohortId)}</section>`;
}

function renderDaily(snapshot, biFilters = {}) {
  const points = Array.isArray(snapshot.current.points) ? snapshot.current.points : [];
  const actualIndex = points.map((point) => hasNumber(point.participant)).lastIndexOf(true);
  const current = points[actualIndex >= 0 ? actualIndex : 0] || { time: snapshot.current.asOf };
  const before = actualIndex > 0 ? points[actualIndex - 1] : current;
  const finalAsOf = snapshot.current.finalAsOf || "24:00";
  const isFinal = current.time === finalAsOf && hasNumber(current.participant);
  const pending = isFinal ? { time: "无", participant: null } : { time: snapshot.current.pending?.[0] || finalAsOf, participant: null };
  const participantDelta = hasNumber(current.participant) && hasNumber(before.participant) && actualIndex > 0 ? current.participant - before.participant : null;
  const positiveDelta = hasNumber(current.positiveRead) && hasNumber(before.positiveRead) && actualIndex > 0 ? current.positiveRead - before.positiveRead : null;
  const retentionDelta = hasNumber(current.retention) && hasNumber(before.retention) && actualIndex > 0 ? current.retention - before.retention : null;
  const depthDelta = hasNumber(current.depth) && hasNumber(before.depth) && actualIndex > 0 ? current.depth - before.depth : null;
  const r1 = splitFor(current, "R1", snapshot.current.split?.[0] || {});
  const r2 = splitFor(current, "R2", snapshot.current.split?.[1] || {});
  const reportRows = autoReportRows(snapshot, biFilters.historyCohortId || ALL_COHORTS, snapshot.current.date, biFilters.stage, biFilters.cohortId);
  const reportDraft = biFilters.reportDraft || {};
  const reportDisplayRows = reportRows.map((row) => Object.prototype.hasOwnProperty.call(reportDraft, row.label) ? { ...row, text: reportDraft[row.label] } : row);
  const pendingLabel = isFinal ? "24:00日终值已留存" : (snapshot.current.pending || []).join("、");
  const stage = snapshot.current.stage;
  const nextTime = snapshot.current.pending?.[0] || finalAsOf;
  const conclusionTitle = isFinal ? `${stage}日终结果已留存，进入次日策略复盘` : `${stage}当前为${current.time}阶段，下一节点${nextTime}`;
  const factText = hasNumber(current.participant)
    ? actualIndex > 0
      ? `${escapeHtml(before.time)}至${escapeHtml(current.time)}，参与人数从${number(before.participant)}人升至${number(current.participant)}人，正读人数从${number(before.positiveRead)}人升至${number(current.positiveRead)}人；完整时点见下方对比表。`
      : `${escapeHtml(current.time)}阶段已回填：参与${number(current.participant)}人、正读${number(current.positiveRead)}人，留存${percent(current.retention)}、深度${percent(current.depth)}；完整时点见下方对比表。`
    : `当前${escapeHtml(current.time)}数据尚未回填；前一日${finalAsOf}终值已留存，可先查看下方前一日复盘。`;
  const judgmentText = isFinal
    ? `24:00留存${percent(current.retention)}、深度${percent(current.depth)}，较参考值（留存${snapshot.references.daily.retention}%、深度${snapshot.references.daily.depth}%）仍有差距；策略效果以日终值和日终动作回写动作证据共同判断。`
    : `当前只看到${escapeHtml(current.time)}阶段快照，不能用阶段值代替${finalAsOf}日终值；先观察参与、正读和未完成用户的变化。`;
  const nextText = isFinal
    ? `进入下一日后回看${stage}参与未完成用户的补读/正读变化，并结合日终动作回写判断晚间督学及次日承接是否有效。`
    : `继续回收${escapeHtml(nextTime)}及后续时点；日终后再判断${escapeHtml(stage)}策略是否达成，今日动作结果由日终动作回写补充验证。`;
  return `<div class="rline-tab-content"><section class="rline-hero"><div><p class="section-kicker">R线策略工作台 · 日策略</p><h1>把今天的动作，变成可验证的结论</h1><p class="rline-hero__sub">${escapeHtml(snapshot.current.date)} · ${escapeHtml(stage)} · ${escapeHtml(snapshot.current.cohort)} · 数据截至${escapeHtml(snapshot.current.asOf)}</p><div class="rline-hero__status">${renderBadge(isFinal ? "success" : "warning", isFinal ? "日终数据" : "阶段性快照")}<span>${escapeHtml(pendingLabel || "暂无待回填项")}</span></div></div><div class="rline-hero__mark"><span>R</span><small>${escapeHtml(stage)}</small></div></section><section class="rline-kpi-grid" aria-label="当前日数据摘要">${metricCard("总规模", `${number(snapshot.current.totalUsers)}人`, "R1 383 · R2 227", "blue")}${metricCard(`${isFinal ? "日终" : "阶段"}参与`, `${number(current.participant)}人`, `较${escapeHtml(before.time)} ${countDelta(participantDelta)}`, "teal")}${metricCard(`${isFinal ? "日终" : "阶段"}正读`, `${number(current.positiveRead)}人`, `较${escapeHtml(before.time)} ${countDelta(positiveDelta)}`, "green")}${metricCard(`${isFinal ? "日终" : "阶段"}留存`, percent(current.retention), `较${escapeHtml(before.time)} ${delta(retentionDelta)}`, "amber")}${metricCard(`${isFinal ? "日终" : "阶段"}深度`, percent(current.depth), `较${escapeHtml(before.time)} ${delta(depthDelta)}`, "coral")}${metricCard(isFinal ? "日终状态" : `${escapeHtml(pending.time)}数据`, isFinal ? "已留存" : "待回填", isFinal ? "24:00主数据" : "避免提前做日终判断", "slate")}</section>${renderDataAvailability(snapshot, current)}${renderDecisionAnalysis(snapshot, biFilters.historyCohortId || ALL_COHORTS)}<section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">今日关键结论</p><h2>${escapeHtml(conclusionTitle)}</h2></div>${renderBadge(isFinal ? "success" : "warning", isFinal ? "进入复盘" : "持续观察")}</header><div class="rline-conclusion-grid"><article><span class="rline-conclusion__label">事实</span><p>${factText}</p></article><article><span class="rline-conclusion__label">判断</span><p>${escapeHtml(judgmentText)}</p></article><article><span class="rline-conclusion__label">下一步</span><p>${escapeHtml(nextText)}</p></article></div></section>${renderIntradayComparison(snapshot)}${renderBiPanel(snapshot, biFilters.stage, biFilters.cohortId)}<section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">班期拆解</p><h2>增量来自哪里</h2></div><span class="rline-muted">按${escapeHtml(current.time)}${isFinal ? "日终" : "阶段"}快照</span></header><div class="rline-mini-grid"><article><strong>${escapeHtml(r1.className || "R1")}</strong><span>${number(r1.participant)}人参与 / ${number(r1.positiveRead)}人正读</span><small>留存${percent(r1.retention)} · 深度${percent(r1.depth)} · 未完成${number(r1.notFinished)}人</small></article><article><strong>${escapeHtml(r2.className || "R2")}</strong><span>${number(r2.participant)}人参与 / ${number(r2.positiveRead)}人正读</span><small>留存${percent(r2.retention)} · 深度${percent(r2.depth)} · 未完成${number(r2.notFinished)}人</small></article></div></section>${renderDailyCharts(snapshot, biFilters.historyCohortId || ALL_COHORTS)}${renderActions(snapshot)}${renderReportEditor(reportDisplayRows, reportDraft)}<footer class="rline-source-note">数据源：${snapshot.sourceLinks.map((source) => `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a>`).join(" · ")} · 快照生成于${escapeHtml(snapshot.generatedAt)}</footer></div>`;
}

function renderWeekly(snapshot, cohortId = ALL_COHORTS) {
  const comparison = snapshot.weekly.comparison;
  const trend = snapshot.weekly.trend;
  const keyTrends = snapshot.weekly.keyTrends;
  const primaryCohortId = snapshot.weekly?.cohortComparison?.primaryCohortId || cohortId;
  const trendCohortId = cohortId === ALL_COHORTS ? primaryCohortId : cohortId;
  const weeklyRecords = weekDayEndRecords(snapshot, trendCohortId, snapshot.weekly?.currentWeek);
  const coverage = weeklyRecords.length;
  const latest = weeklyRecords[weeklyRecords.length - 1];
  const official = snapshot.weekly?.officialSummary;
  const officialTotal = official?.rows?.find((row) => row.label === "1期总") || official?.rows?.[official.rows.length - 1];
  const officialText = officialTotal
    ? `官方周度已回填：留存${percent(officialTotal.retention)}（较参考${(officialTotal.retention - snapshot.references.weekly.retention).toFixed(2)}pp）、深度${percent(officialTotal.depth)}（较参考${(officialTotal.depth - snapshot.references.weekly.depth).toFixed(2)}pp）、完课率${percent(officialTotal.completion)}（较参考${(officialTotal.completion - snapshot.references.weekly.completion).toFixed(2)}pp）。`
    : "官方周留存、周深度、周完课仍等待周数据表回写。";
  const latestText = latest
    ? `${latest.day} 24:00参与${number(latest.metrics?.participant)}人、正读${number(latest.metrics?.positiveRead)}人，留存${percent(latest.metrics?.retention)}、深度${percent(latest.metrics?.depth)}。`
    : "当前暂无可用的日终数据。";
  const statusLabel = snapshot.weekly.status === "closed" ? "已结周" : `前${coverage}天已留存`;
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 周度复盘</p><h1>按${escapeHtml(snapshot.weekly.currentWeek)}判断策略是否真的有效</h1><p>沿用周报的阅读顺序：核心结论 → 周行课对比 → 班期对比 → 行课趋势 → 关键数据趋势。</p></div>${renderBadge(snapshot.weekly.status === "closed" ? "success" : "info", statusLabel)}</section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">本周核心结论</p><h2>${escapeHtml(snapshot.weekly.currentWeek)}已留存D1-D${coverage}日终${official ? "及官方周度结果" : "，形成阶段性判断"}</h2></div>${renderBadge(official ? "success" : "info", official ? "周表已回填" : "先看事实")}</header><div class="rline-conclusion-grid"><article><span class="rline-conclusion__label">数据结论</span><p>${escapeHtml(latestText)} ${escapeHtml(officialText)}</p></article><article><span class="rline-conclusion__label">策略结论</span><p>D1-D${coverage}日终参与从${number(weeklyRecords[0]?.metrics?.participant)}人下降至${number(latest?.metrics?.participant)}人，正读从${number(weeklyRecords[0]?.metrics?.positiveRead)}人下降至${number(latest?.metrics?.positiveRead)}人；需结合每日SOP与主管日报定位掉队原因。</p></article><article><span class="rline-conclusion__label">管理结论</span><p>${official ? "M1W1已完成周度归档，下一步聚焦深度、完课和R1/R2差异，形成M1W2动作取舍。" : "待日终数据和周数据表补齐后，再完成官方周度结论和下周动作取舍。"}</p></article></div></section><section class="rline-kpi-grid">${snapshot.weekly.fields.map((field, index) => metricCard(field.label, field.value === null ? "待回填" : `${field.value}${field.unit}`, `参考 ${field.reference}${field.unit}`, ["blue", "teal", "green", "amber", "coral"][index])).join("")}</section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">周行课数据对比</p><h2>实际周汇总与参考线</h2><p>已回填指标直接对比目标，未回填指标保留待回填状态。</p></div>${renderBadge(official ? "success" : "warning", official ? "官方周数据已回填" : "官方周数据待回填")}</header><div class="rline-chart-grid">${renderBarChart({ title: "W1三项核心指标对比", subtitle: "周留存 / 周深度 / 周完课", labels: comparison.map((item) => item.label.replace("周", "")), datasets: [{ label: "W1实际", data: comparison.map((item) => item.actual), color: "#4d8fe3" }, { label: "目标", data: comparison.map((item) => item.reference), color: "#16795a", dashed: true }], yMax: 100, unit: "%", decimals: 1, emptyLabel: official ? "" : "官方周汇总待回填" })}</div><div class="rline-compare-table">${comparison.map((item) => `<div><strong>${escapeHtml(item.label)}</strong><span>实际：${item.actual === null ? "待回填" : `${item.actual}${item.unit}`} · 目标：${item.reference}${item.unit} · 差值：${item.actual === null ? "待回填" : delta(item.actual - item.reference)}</span><em>${item.actual === null ? "等待周汇总" : "已回填"}</em></div>`).join("")}</div></section>${renderWeeklyOfficialSummary(snapshot)}${renderMonthlyTargetTrend(snapshot, trendCohortId)}${renderCohortComparison(snapshot)}${renderWeeklyDailyTable(snapshot, trendCohortId)}<section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">行课趋势对比</p><h2>${escapeHtml(snapshot.weekly.currentWeek)} · ${escapeHtml(cohortMapLabel(snapshot, trendCohortId))}日终实际变化</h2><p>只连接已留存的24:00日终数据；首周目标线用于判断每天的目标差距，完课率不会用BI阶段结果代替。</p></div>${renderBadge("info", "日终趋势")}</header><div class="rline-chart-grid">${renderDayEndTrend(snapshot, trendCohortId)}${renderLineChart({ title: "R线关键数据趋势", subtitle: "当前已有关键时点快照；参与人数为规模观察，无人数目标线", labels: keyTrends.labels, datasets: keyTrends.datasets, yMax: 100, unit: "人", decimals: 0 })}</div></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">周度判断框架</p><h2>M1W1需要形成的四个结论</h2></div></header><div class="rline-week-grid"><article><strong>趋势</strong><span>W1留存、深度、完课是否达到目标；与D1-D5相比哪一天开始掉队。</span></article><article><strong>策略</strong><span>早签、补读提醒、激励、动态督学分别带来的用户变化，不能只看最终完课。</span></article><article><strong>业务</strong><span>补读是否拉回用户；活动和产品教育是否提升参与；问题是否需要产品介入。</span></article><article><strong>动作</strong><span>下周保留什么、调整什么、停止什么；明确负责人和下一次验证指标。</span></article></div></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">周报输出</p><h2>周度结论固定写法</h2></div></header><div class="rline-quote">本周${escapeHtml(snapshot.weekly.currentWeek)}目标为留存${snapshot.references.weekly.retention}%、深度${snapshot.references.weekly.depth}%、完课${snapshot.references.weekly.completion}%，当前已留存D1-D${coverage}日终数据，${official ? "官方周度指标已回填。" : "官方周度指标待周数据表回写。"}策略侧将按D1-D5日趋势、实际与目标差值、正读/补读拆解和各动作回写结果，判断首周策略是否达成，并形成下周调整建议。</div></section></div>`;
}

function renderMonthly(snapshot, cohortId = ALL_COHORTS) {
  const primaryCohortId = snapshot.weekly?.cohortComparison?.primaryCohortId || cohortId;
  const targetCohortId = cohortId === ALL_COHORTS ? primaryCohortId : cohortId;
  return `<div class="rline-tab-content"><section class="page-header rline-subheader"><div><p class="section-kicker">R线策略工作台 · 月度规划</p><h1>用四周的节奏管理一整个月</h1><p>月度页面承接每日和每周结论，沉淀策略动作、课程结果和下一阶段规划。</p></div>${renderBadge("info", snapshot.monthly.currentMonth)}</section>${renderMonthlyTargetTrend(snapshot, targetCohortId)}<section class="rline-month-roadmap">${snapshot.monthly.stages.map((stage, index) => `<article class="rline-roadmap-item"><span class="rline-roadmap-index">0${index + 1}</span><div><strong>${escapeHtml(stage.code)} · ${escapeHtml(stage.label)}</strong><p>${escapeHtml(stage.focus)}</p><small>重点观察：${escapeHtml(stage.metrics)}</small></div></article>`).join("")}</section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">月度指标池</p><h2>学习结果与服务结果分开看</h2></div></header><div class="rline-metric-pool"><span>学习结果：日留存 · 日深度 · 周留存 · 周深度 · 完课 · 正读/补读</span><span>服务结果：SOP执行 · 触达覆盖 · 补读召回 · 活动参与 · 月测反馈覆盖</span><span>业务结果：月转年续费/退款、报告查看、进阶承接（按确认口径纳入）</span></div></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">月度复盘规则</p><h2>每周都要留下可复用的策略判断</h2></div></header><div class="rline-report-table"><div><strong>保留</strong><span>目标达成且能解释用户变化的动作，沉淀为下一周默认SOP。</span></div><div><strong>调整</strong><span>动作已执行但指标未改善，优先调整触达对象、时间、内容或承接路径。</span></div><div><strong>升级</strong><span>涉及字段、入口、数据回写或产品能力的问题，形成明确需求和验收标准。</span></div></div></section></div>`;
}

export function render(container, context) {
  const baseSnapshot = snapshotFrom(context);
  let selectedCohortId = context.selectedCohortId || ALL_COHORTS;
  let selectedDate = context.selectedDate || "";
  let selectedBiStage = context.selectedBiStage || ALL_BI_STAGES;
  let selectedBiCohortId = context.selectedBiCohortId || ALL_BI_COHORTS;
  let activeTab = context.routeParams?.tab || "daily";
  const paint = () => {
    const availableDates = historyDateEntries(baseSnapshot, selectedCohortId);
    const effectiveDate = availableDates.some((item) => item.date === selectedDate) ? selectedDate : availableDates[0]?.date || baseSnapshot.current.date;
    const snapshot = selectSnapshotForCohort(baseSnapshot, selectedCohortId, activeTab === "daily" ? effectiveDate : null);
    const tabs = [["daily", "今日策略"], ["weekly", "周汇报"], ["archive", "数据留存"], ["qa", "QA中心"], ["progress", "项目推进"], ["monthly", "月度规划"]];
    const reportDraft = context.reportDrafts?.[`${selectedCohortId}::${effectiveDate}`]?.rows || {};
    const body = activeTab === "weekly" ? renderWeeklyReport(snapshot, selectedCohortId) : activeTab === "archive" ? renderDataArchive(baseSnapshot, selectedCohortId, context) : activeTab === "qa" ? renderQACenter(baseSnapshot, context.qaEntries, context) : activeTab === "progress" ? renderProjectProgress(context.projects) : activeTab === "monthly" ? renderMonthly(snapshot, selectedCohortId) : renderDaily(snapshot, { stage: selectedBiStage, cohortId: selectedBiCohortId, historyCohortId: selectedCohortId, reportDraft });
    const historyPanel = "";
    const previousReview = activeTab === "daily" ? renderPreviousDayReview(baseSnapshot, selectedCohortId, effectiveDate, selectedBiStage, selectedBiCohortId) : "";
    container.innerHTML = `<section class="rline-workbench-shell"><nav class="rline-tab-nav" aria-label="R线工作台视图">${tabs.map(([id, label]) => `<button type="button" class="rline-tab${activeTab === id ? " is-current" : ""}" data-rline-tab="${id}" aria-selected="${activeTab === id}">${icon(id === "daily" ? "calendar-days" : id === "weekly" ? "chart-no-axes-combined" : "route")}${escapeHtml(label)}</button>`).join("")}</nav>${renderCohortFilter(baseSnapshot, selectedCohortId, effectiveDate, activeTab)}${historyPanel}${previousReview}${body}</section>`;
    bindReportingActions(container, baseSnapshot, context);
    container.querySelectorAll("[data-rline-tab]").forEach((button) => button.addEventListener("click", () => {
      activeTab = button.dataset.rlineTab;
      context.onTabChange?.(activeTab);
      paint();
    }));
    container.querySelector("[data-rline-cohort]")?.addEventListener("change", (event) => {
      selectedCohortId = event.target.value;
      selectedDate = "";
      context.onCohortChange?.(selectedCohortId);
      paint();
    });
    container.querySelector("[data-rline-date]")?.addEventListener("change", (event) => {
      selectedDate = event.target.value;
      context.onDateChange?.(selectedDate);
      paint();
    });
    container.querySelector("[data-rline-bi-stage]")?.addEventListener("change", (event) => {
      selectedBiStage = event.target.value;
      selectedBiCohortId = ALL_BI_COHORTS;
      context.onBiFilterChange?.({ stage: selectedBiStage, cohortId: selectedBiCohortId });
      paint();
    });
    container.querySelector("[data-rline-bi-cohort]")?.addEventListener("change", (event) => {
      selectedBiCohortId = event.target.value;
      context.onBiFilterChange?.({ stage: selectedBiStage, cohortId: selectedBiCohortId });
      paint();
    });
    const reportEditor = container.querySelector("[data-rline-report-editor]");
    const generatedRows = new Map(reportRowsForEditor(baseSnapshot, selectedCohortId, effectiveDate, selectedBiStage, selectedBiCohortId).map((row) => [row.label, row.text]));
    const collectReportDraftRows = () => {
      const rows = {};
      reportEditor?.querySelectorAll("[data-rline-report-row]").forEach((field) => {
        const label = field.dataset.rlineReportRow;
        if (generatedRows.get(label) !== field.value) rows[label] = field.value;
      });
      return rows;
    };
    reportEditor?.querySelectorAll("[data-rline-report-row]").forEach((field) => field.addEventListener("input", () => {
      context.onReportDraftChange?.({ cohortId: selectedCohortId, date: effectiveDate, rows: collectReportDraftRows() });
      const status = reportEditor.querySelector("[data-rline-report-status]");
      if (status) status.textContent = "正在保留输入内容；未修改行继续跟随自动结论";
    }));
    reportEditor?.querySelector("[data-rline-report-save]")?.addEventListener("click", () => {
      const rows = collectReportDraftRows();
      context.onReportSave?.({ cohortId: selectedCohortId, date: effectiveDate, rows });
      const status = reportEditor.querySelector("[data-rline-report-status]");
      if (status) status.textContent = Object.keys(rows).length > 0 ? `已保存${Object.keys(rows).length}行人工补充；未修改行继续跟随自动结论` : "未检测到修改，当前继续使用自动生成结论";
    });
    reportEditor?.querySelector("[data-rline-report-reset]")?.addEventListener("click", () => {
      context.onReportReset?.({ cohortId: selectedCohortId, date: effectiveDate });
      paint();
    });
  };
  paint();
}
