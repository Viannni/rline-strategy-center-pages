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

function weeklySummary(history, cohortId, week) {
  const record = (history?.weekly || []).find((item) => item.cohortId === cohortId && item.week === week);
  const summary = record?.summary || record || {};
  return {
    retention: numeric(summary.retention),
    depth: numeric(summary.depth),
    completion: numeric(summary.completion)
  };
}

function makeConclusion(days, summary, target) {
  const latest = days.at(-1);
  if (!latest) return "本周尚无24:00日终数据，暂不形成策略结论；先补齐日终数据，再按目标、实际、差值、问题、动作和验证指标输出。";
  const actual = summary.retention === null ? latest.actual : summary;
  const gap = {
    retention: actual.retention === null || target.retention === null ? null : actual.retention - target.retention,
    depth: actual.depth === null || target.depth === null ? null : actual.depth - target.depth,
    completion: actual.completion === null || target.completion === null ? null : actual.completion - target.completion
  };
  const issue = gap.retention !== null && gap.retention < 0
    ? "主要问题在持续参与和缺课回流"
    : gap.depth !== null && gap.depth < 0
      ? "主要问题在已参与用户的深度完成"
      : "先持续观察日终变化与动作证据";
  const action = latest.actual.notFinished !== null && latest.actual.notFinished > 0
    ? `优先对${latest.actual.notFinished}名参与未完成用户补读提醒，并对连续缺课用户做人工首联`
    : "按首次缺课、连续缺课和已参与未完成三类用户分层触达";
  return `目标：留存${target.retention ?? "暂无"}%、深度${target.depth ?? "暂无"}%、完课${target.completion ?? "暂无"}%；实际：留存${actual.retention ?? "暂无"}%、深度${actual.depth ?? "暂无"}%、完课${actual.completion ?? "暂无"}%；差值：留存${pp(gap.retention)}、深度${pp(gap.depth)}、完课${pp(gap.completion)}。判断：${issue}。动作：${action}。验证：观察下一日24:00回流人数、补读完成率、深度和完课变化。`;
}

export function buildWeeklyReport({ history = {}, cohortId = "all", week, ipSnapshots = [], channelSnapshots = [] } = {}) {
  const endRecords = dayEndRecords(history, cohortId)
    .filter((record) => !week || record.week === week)
    .sort((left, right) => dayNumber(left.day) - dayNumber(right.day));
  const days = endRecords.map((record) => {
    const actual = reportMetrics(record);
    const target = dayTarget(record.day);
    const gap = Object.fromEntries(["retention", "depth", "completion"].map((key) => [key, actual[key] === null || target[key] === null ? null : Number((actual[key] - target[key]).toFixed(2))]));
    return { day: record.day, date: record.date, asOf: record.asOf, actual, target, gap };
  });
  const normalizedWeek = week || endRecords[0]?.week || "M1W1";
  const summary = weeklySummary(history, cohortId, normalizedWeek);
  const target = reportingTargets.weekly[`W${weekNumber(normalizedWeek)}`] || reportingTargets.weekly.W1;
  return {
    cohortId,
    week: normalizedWeek,
    days,
    summary,
    target,
    conclusion: makeConclusion(days, summary, target),
    ipSnapshots: ipSnapshots.filter((item) => (!cohortId || cohortId === "all" || item.cohortId === cohortId) && (!week || item.week === week)),
    channelSnapshots: channelSnapshots.filter((item) => (!cohortId || cohortId === "all" || item.cohortId === cohortId) && (!week || item.week === week))
  };
}

export function progressOverview(items = []) {
  const byStatus = Object.fromEntries(["已完成", "验证中", "待协同", "有风险", "已验收"].map((status) => [status, 0]));
  items.forEach((item) => { if (Object.hasOwn(byStatus, item.status)) byStatus[item.status] += 1; });
  const closed = byStatus["已完成"] + byStatus["已验收"];
  return { total: items.length, closed, closureRate: items.length ? Number((closed / items.length * 100).toFixed(1)) : 0, byStatus };
}
