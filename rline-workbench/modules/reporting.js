import { dayEndRecords } from "./history.js";

export const reportingTargets = Object.freeze({
  daily: Object.freeze({
    retention: Object.freeze([72, 68, 65, 62, 55]),
    depth: Object.freeze([69, 66.5, 63.5, 60.5, 52.5]),
    completion: Object.freeze([69, 69.2, 69.2, 69, 66.5])
  }),
  weekly: Object.freeze({
    W1: Object.freeze({ retention: 64, depth: 61, completion: 72 }),
    W2: Object.freeze({ retention: 54, depth: 51.5, completion: 68.8 }),
    W3: Object.freeze({ retention: 48.5, depth: 46, completion: 65.5 }),
    W4: Object.freeze({ retention: 42, depth: 40.5, completion: 62 })
  })
});

const METRICS = Object.freeze(["retention", "depth", "completion"]);
const METRIC_LABELS = Object.freeze({ retention: "留存", depth: "深度", completion: "完课" });

function numeric(value) {
  return value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}

function weekNumber(week = "") {
  return String(week).match(/W(\d+)/)?.[1] || "1";
}

function dayNumber(day = "") {
  return Number(String(day).match(/D(\d+)/)?.[1] || 0);
}

function pp(value) {
  if (value === null || value === undefined) return "暂无数据";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}pp`;
}

function dayTarget(day) {
  const index = Math.max(0, dayNumber(day) - 1);
  return Object.fromEntries(Object.entries(reportingTargets.daily).map(([key, values]) => [key, values[index] ?? null]));
}

function reportMetrics(record) {
  const metrics = record?.metrics || {};
  return {
    participant: numeric(metrics.participant),
    positiveRead: numeric(metrics.positiveRead),
    retention: numeric(metrics.retention),
    depth: numeric(metrics.depth),
    completion: numeric(metrics.completion),
    absent: numeric(metrics.absent),
    notFinished: numeric(metrics.notFinished)
  };
}

function weeklyRecord(history, cohortId, week) {
  return (history?.weekly || []).find((item) => item.cohortId === cohortId && item.week === week) || null;
}

function weeklySummary(history, cohortId, week, days) {
  const record = weeklyRecord(history, cohortId, week);
  const summary = record?.summary || record || {};
  const fallback = days.at(-1)?.actual || {};
  return Object.fromEntries(METRICS.map((metric) => [metric, numeric(summary[metric]) ?? (record ? null : numeric(fallback[metric]))]));
}

function metricComparison(actual, target) {
  return METRICS.map((metric) => {
    const value = numeric(actual?.[metric]);
    const goal = numeric(target?.[metric]);
    const gap = value === null || goal === null ? null : Number((value - goal).toFixed(2));
    return { metric, label: METRIC_LABELS[metric], actual: value, target: goal, gap, status: value === null ? "待回填" : "已回填" };
  });
}

function dailyNarrative(days, weeklyComparison) {
  const first = days[0]?.actual;
  const last = days.at(-1)?.actual;
  const participantDelta = first?.participant !== null && last?.participant !== null && first?.participant !== undefined && last?.participant !== undefined
    ? Number((last.participant - first.participant).toFixed(0)) : null;
  const missingDaily = ["D1", "D2", "D3", "D4", "D5"].filter((day) => { const row = days.find((item) => item.day === day); return !row || row.actual.retention === null || row.actual.depth === null; });
  const finished = last?.notFinished;
  const retentionGap = weeklyComparison.find((item) => item.metric === "retention")?.gap;
  const depthGap = weeklyComparison.find((item) => item.metric === "depth")?.gap;
  const completionGap = weeklyComparison.find((item) => item.metric === "completion")?.gap;
  const overall = weeklyComparison.map((item) => `${item.label}目标${item.target === null ? "暂无" : item.target + "%"}、实际${item.actual === null ? "暂无" : item.actual + "%"}、差值${pp(item.gap)}`).join("；");
  const userText = participantDelta === null
    ? "当前缺少连续日终参与人数，不能判断掉队节点；先补齐D1-D5 24:00数据。"
    : `日终参与人数从${first.participant}人变化至${last.participant}人，${participantDelta < 0 ? `减少${Math.abs(participantDelta)}人` : `增加${participantDelta}人`}；用户侧优先拆解首次缺课、连续缺课和历史回流三类人群。`;
  const courseText = finished === null || finished === undefined
    ? "参与未完成字段缺失，暂不把课程问题与用户未参与混为一谈；需补齐正读、未完成和家长反馈。"
    : `最新日终参与未完成${finished}人；正读与参与的差距用于判断课程承接，结合家长反馈继续验证词汇难度、复习、互动和开口环节。`;
  const strategyText = `当前周度${retentionGap !== null && retentionGap < 0 ? "留存未达目标" : "留存已达目标或暂无周值"}、${depthGap !== null && depthGap < 0 ? "深度未达目标" : "深度已达目标或暂无周值"}；保留分层召回、首次缺课提醒和晚间督学，下一次以24:00回流、深度与完课验证动作效果。`;
  return {
    summary: `本周${overall}。`,
    sections: [
      { id: "overall", title: "数据结论", fact: `周维度：${overall}。`, judgment: completionGap === null ? "完课数据待回填，不能用阶段性BI数据替代。" : completionGap < 0 ? "完课低于目标，需要把参与掉队与参与后未完成拆开。" : "完课达到目标，继续观察稳定性。", action: "下周保留目标差值看板，每次周报固定给出实际、目标、差值。", validation: "下周周终补齐三项指标并复盘差值变化。" },
      { id: "user-qa", title: "用户QA", fact: userText, judgment: "若参与人数下降而参与未完成较少，首要矛盾是未参与/缺课，而不是参与后无法完成。", action: "按首次缺课、连续缺课、历史回流分层触达，并记录触达结果。", validation: "观察2小时、6小时、当日回流率及D+1参与变化。" },
      { id: "course-qa", title: "课程QA", fact: courseText, judgment: "只有参与后未完成持续偏高且有家长反馈支撑时，才判定为课程承接问题。", action: "同步教研验证低龄适配、复习、互动、单词开口和结课反馈。", validation: "对比深度、完课、参与未完成和负向反馈占比。" },
      { id: "strategy", title: "策略调整", fact: `已留存${days.length}/5个首周日终；${missingDaily.length ? `缺少${missingDaily.join("、")}数据。` : "D1-D5日终已齐。"}`, judgment: "策略是否有效必须与触达覆盖和动作回写关联，当前仅能先判断结果趋势，不能直接宣称因果。", action: "保留19:00督学并设置19:00/20:00/不触达对照；把补读、奖励、Push分别标记动作ID。", validation: "下周按动作组回收触达覆盖、回流、深度和完课结果。" }
    ]
  };
}

export function buildWeeklyReport({ history = {}, cohortId = "all", week, ipSnapshots = [], channelSnapshots = [] } = {}) {
  const endRecords = dayEndRecords(history, cohortId)
    .filter((record) => !week || record.week === week)
    .sort((left, right) => dayNumber(left.day) - dayNumber(right.day));
  const days = endRecords.map((record) => {
    const actual = reportMetrics(record);
    const target = dayTarget(record.day);
    const gap = Object.fromEntries(METRICS.map((key) => [key, actual[key] === null || target[key] === null ? null : Number((actual[key] - target[key]).toFixed(2))]));
    return { day: record.day, date: record.date, asOf: record.asOf, actual, target, gap, status: actual.retention === null && actual.depth === null ? "待回填" : "已回填" };
  });
  const normalizedWeek = week || endRecords[0]?.week || "M1W1";
  const summary = weeklySummary(history, cohortId, normalizedWeek, days);
  const target = reportingTargets.weekly[`W${weekNumber(normalizedWeek)}`] || reportingTargets.weekly.W1;
  const weeklyComparison = metricComparison(summary, target);
  const narrative = dailyNarrative(days, weeklyComparison);
  const storedWeekly = weeklyRecord(history, cohortId, normalizedWeek);
  const dataQuality = {
    expectedDays: 5,
    capturedDays: days.length,
    missingDays: ["D1", "D2", "D3", "D4", "D5"].filter((day) => !days.some((item) => item.day === day)),
    latestAsOf: days.at(-1)?.asOf || "暂无数据",
    source: "24:00日终；D2 14:00排除"
  };
  return {
    cohortId,
    week: normalizedWeek,
    days,
    dailyComparison: days,
    summary,
    target,
    weeklyComparison,
    dataQuality,
    narrative,
    conclusion: `${narrative.summary}${narrative.sections.find((section) => section.id === "user-qa")?.judgment || ""}`,
    ipSnapshots: ipSnapshots.filter((item) => (!cohortId || cohortId === "all" || item.cohortId === cohortId) && (!week || item.week === week)),
    channelSnapshots: channelSnapshots.filter((item) => (!cohortId || cohortId === "all" || item.cohortId === cohortId) && (!week || item.week === week)),
    weeklyStatus: storedWeekly?.status || (days.length === 5 ? "阶段已齐" : "进行中")
  };
}

export function progressOverview(items = []) {
  const byStatus = Object.fromEntries(["已完成", "验证中", "待协同", "有风险", "已验收"].map((status) => [status, 0]));
  items.forEach((item) => { if (Object.hasOwn(byStatus, item.status)) byStatus[item.status] += 1; });
  const closed = byStatus["已完成"] + byStatus["已验收"];
  const blocked = byStatus["有风险"] + byStatus["待协同"];
  return { total: items.length, closed, open: Math.max(items.length - closed, 0), blocked, closureRate: items.length ? Number((closed / items.length * 100).toFixed(1)) : 0, byStatus };
}
