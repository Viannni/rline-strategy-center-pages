export const ALL_COHORTS = "all";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value, fallback = "未知") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function observationKey(record) {
  return [
    text(record.cohortId),
    text(record.date),
    text(record.day),
    text(record.asOf)
  ].join("|");
}

function asOfMinutes(value) {
  if (value === "日终") return 24 * 60;
  const match = String(value || "").trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2] || 0);
}

function comparableTime(record) {
  return asOfMinutes(record.asOf);
}

function comparableRecord(record) {
  const date = Date.parse(`${record.date || ""}T00:00:00+08:00`);
  if (Number.isFinite(date)) return date + comparableTime(record) * 60 * 1000;
  const capturedAt = Date.parse(record.capturedAt || record.sourceUpdatedAt || "");
  return Number.isFinite(capturedAt) ? capturedAt : comparableTime(record);
}

function isDayEnd(record) {
  return record?.status === "closed" || record?.isDayEnd === true || record?.asOf === "24:00" || record?.asOf === "日终";
}

function cohortFrom(record) {
  return {
    id: text(record.cohortId, text(record.cohortName, "unknown")),
    name: text(record.cohortName, text(record.cohort, "未命名班期")),
    startDate: text(record.courseStartDate, text(record.date, "待确认"))
  };
}

function dailyRecords(history) {
  return Array.isArray(history?.daily) ? history.daily.filter(isRecord) : [];
}

function weeklyRecords(history) {
  return Array.isArray(history?.weekly) ? history.weekly.filter(isRecord) : [];
}

export function retainDailyObservation(history = {}, observation) {
  if (!isRecord(observation) || !observation.cohortId || !observation.date || !observation.asOf) {
    throw new Error("日快照缺少班期、日期或时间点");
  }
  const daily = [...dailyRecords(history)];
  const index = daily.findIndex((item) => observationKey(item) === observationKey(observation));
  const next = {
    ...(index >= 0 ? daily[index] : {}),
    ...observation,
    metrics: {
      ...(index >= 0 && isRecord(daily[index].metrics) ? daily[index].metrics : {}),
      ...(isRecord(observation.metrics) ? observation.metrics : {})
    }
  };
  if (index >= 0) daily[index] = next;
  else daily.push(next);
  return { ...history, daily };
}

export function latestDailyByCohort(history = {}) {
  const latest = new Map();
  dailyRecords(history).forEach((record) => {
    const id = cohortFrom(record).id;
    const previous = latest.get(id);
    if (!previous || comparableRecord(record) >= comparableRecord(previous)) latest.set(id, record);
  });
  return [...latest.values()].sort((a, b) => cohortFrom(a).name.localeCompare(cohortFrom(b).name, "zh-CN"));
}

export function selectCohortRecord(history = {}, cohortId) {
  if (!cohortId || cohortId === ALL_COHORTS) return null;
  return latestDailyByCohort(history).find((record) => cohortFrom(record).id === cohortId) || null;
}

function latestRecordsForDate(history, date, cohortId = ALL_COHORTS) {
  const observations = dailyRecords(history).filter((record) => record.date === date && (cohortId === ALL_COHORTS || cohortFrom(record).id === cohortId));
  const latest = new Map();
  observations.forEach((record) => {
    const key = `${cohortFrom(record).id}|${record.asOf}`;
    const previous = latest.get(key);
    if (!previous || comparableTime(record) >= comparableTime(previous)) latest.set(key, record);
  });
  return [...latest.values()];
}

function sumMetric(records, key) {
  const values = records.map((record) => record.metrics?.[key]).filter((value) => Number.isFinite(Number(value)));
  return values.length === records.length && values.length > 0 ? values.reduce((sum, value) => sum + Number(value), 0) : null;
}

function aggregateDailyRecords(records, date) {
  const latestByCohort = new Map();
  records.forEach((record) => {
    const id = cohortFrom(record).id;
    const previous = latestByCohort.get(id);
    if (!previous || comparableRecord(record) >= comparableRecord(previous)) latestByCohort.set(id, record);
  });
  const cohortTotals = [...latestByCohort.values()];
  const latest = [...cohortTotals].sort((a, b) => comparableTime(b) - comparableTime(a))[0];
  const totalUsers = cohortTotals.reduce((sum, record) => sum + (Number.isFinite(Number(record.totalUsers)) ? Number(record.totalUsers) : 0), 0) || null;
  const participant = sumMetric(cohortTotals, "participant");
  const positiveRead = sumMetric(cohortTotals, "positiveRead");
  const completed = sumMetric(cohortTotals, "completed");
  const weightedRate = (key) => {
    if (!totalUsers) return null;
    const values = cohortTotals.map((record) => record.metrics?.[key]);
    if (!values.every((value) => Number.isFinite(Number(value)))) return null;
    return Number((cohortTotals.reduce((sum, record) => sum + Number(record.totalUsers || 0) * Number(record.metrics[key]), 0) / totalUsers).toFixed(2));
  };
  const completion = weightedRate("completion") ?? (completed !== null && totalUsers ? Number((completed / totalUsers * 100).toFixed(2)) : null);
  const metric = (key, numerator) => {
    if (numerator !== null && totalUsers) return Number(((numerator / totalUsers) * 100).toFixed(2));
    const values = cohortTotals.map((record) => record.metrics?.[key]).filter((value) => Number.isFinite(Number(value)));
    return values.length === cohortTotals.length && values.length > 0 ? Number((values.reduce((sum, value) => sum + Number(value), 0) / cohortTotals.length).toFixed(2)) : null;
  };
  const observations = [...records].sort((a, b) => comparableTime(a) - comparableTime(b));
  const pointsByTime = new Map();
  observations.forEach((record) => {
    const point = pointsByTime.get(record.asOf) || { time: record.asOf, split: [] };
    Object.keys(record.metrics || {}).forEach((key) => {
      if (Number.isFinite(Number(record.metrics[key]))) point[key] = (point[key] || 0) + Number(record.metrics[key]);
    });
    if (Array.isArray(record.split) && record.split.length > 0) point.split.push(...record.split);
    pointsByTime.set(record.asOf, point);
  });
  const points = [...pointsByTime.values()].map((point) => ({
    ...point,
    retention: totalUsers && Number.isFinite(Number(point.participant)) ? Number(((point.participant / totalUsers) * 100).toFixed(2)) : point.retention,
    depth: totalUsers && Number.isFinite(Number(point.positiveRead)) ? Number(((point.positiveRead / totalUsers) * 100).toFixed(2)) : point.depth,
    split: point.split.length > 0 ? point.split : undefined
  }));
  return {
    cohortId: ALL_COHORTS,
    cohortName: "全部班期",
    courseStartDate: "多班期",
    date,
    week: latest?.week,
    day: latest?.day,
    stage: latest?.stage,
    asOf: latest?.asOf,
    status: isDayEnd(latest) ? "closed" : "partial",
    totalUsers,
    split: cohortTotals.flatMap((record) => Array.isArray(record.split) ? record.split : []),
    points,
    metrics: {
      participant,
      positiveRead,
      completed,
      completion,
      retention: metric("retention", participant),
      depth: metric("depth", positiveRead),
      notFinished: sumMetric(cohortTotals, "notFinished"),
      absent: sumMetric(cohortTotals, "absent")
    },
    pending: latest?.pending || [],
    capturedAt: latest?.capturedAt || latest?.sourceUpdatedAt
  };
}

export function dailyRecordForDate(history = {}, cohortId = ALL_COHORTS, date) {
  if (!date) return cohortId === ALL_COHORTS ? null : selectCohortRecord(history, cohortId);
  const records = latestRecordsForDate(history, date, cohortId);
  if (records.length === 0) return null;
  if (cohortId === ALL_COHORTS) return aggregateDailyRecords(records, date);
  return records.sort((a, b) => comparableTime(b) - comparableTime(a))[0];
}

export function dayEndRecords(history = {}, cohortId = ALL_COHORTS) {
  const records = dailyRecords(history);
  const dates = [...new Set(records
    .filter((record) => cohortId === ALL_COHORTS || cohortFrom(record).id === cohortId)
    .map((record) => record.date)
    .filter(Boolean))].sort();
  return dates.map((date) => {
    const dateRecords = records.filter((record) => record.date === date);
    const cohortIds = [...new Set(dateRecords.map((record) => cohortFrom(record).id))];
    const scopedRecords = dateRecords.filter((record) => cohortId === ALL_COHORTS || cohortFrom(record).id === cohortId);
    const hasDayEnd = cohortId === ALL_COHORTS
      ? cohortIds.length > 0 && cohortIds.every((id) => dateRecords.some((record) => cohortFrom(record).id === id && isDayEnd(record)))
      : scopedRecords.some(isDayEnd);
    if (!hasDayEnd) return null;
    const record = dailyRecordForDate(history, cohortId, date);
    return record && isDayEnd(record) ? record : null;
  }).filter(Boolean);
}

export function historyDates(history = {}, cohortId = ALL_COHORTS) {
  const dates = new Map();
  dailyRecords(history).filter((record) => cohortId === ALL_COHORTS || cohortFrom(record).id === cohortId).forEach((record) => {
    const previous = dates.get(record.date);
    if (!previous || comparableTime(record) >= comparableTime(previous)) dates.set(record.date, record);
  });
  return [...dates.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, record]) => ({ date, stage: record.stage || `${record.week || ""}${record.day || ""}`, day: record.day || "", cohortCount: new Set(dailyRecords(history).filter((item) => item.date === date && (cohortId === ALL_COHORTS || cohortFrom(item).id === cohortId)).map((item) => cohortFrom(item).id)).size }));
}

export function previousDailyRecord(history = {}, cohortId = ALL_COHORTS, date) {
  const previousDate = historyDates(history, cohortId).map((item) => item.date).filter((item) => item < date)[0];
  if (!previousDate) return null;
  const records = dailyRecords(history).filter((record) => record.date === previousDate && (cohortId === ALL_COHORTS || cohortFrom(record).id === cohortId));
  const cohortIds = [...new Set(records.map((record) => cohortFrom(record).id))];
  const hasEveryCohortDayEnd = cohortIds.length > 0 && cohortIds.every((id) => records.some((record) => cohortFrom(record).id === id && isDayEnd(record)));
  return hasEveryCohortDayEnd ? dailyRecordForDate(history, cohortId, previousDate) : null;
}

function emptySummary() {
  return { retention: null, depth: null, completion: null };
}

function summaryFrom(record) {
  return {
    retention: record?.retention ?? record?.summary?.retention ?? null,
    depth: record?.depth ?? record?.summary?.depth ?? null,
    completion: record?.completion ?? record?.summary?.completion ?? null
  };
}

function applyWeeklySummary(snapshot, cohortId) {
  const targetWeek = snapshot.weekly?.currentWeek;
  const rollup = deriveWeeklyRollups(snapshot.history).find((item) => item.week === targetWeek && item.cohortId === cohortId);
  if (!rollup || Object.values(rollup.summary).every((value) => value === null)) return snapshot;
  const actual = rollup.summary;
  return {
    ...snapshot,
    weekly: {
      ...snapshot.weekly,
      status: rollup.status,
      dataStatus: rollup.status === "closed" ? "周度结果已留存" : "周度结果部分回填",
      fields: snapshot.weekly.fields.map((field, index) => index === 0 ? { ...field, value: actual.retention } : index === 1 ? { ...field, value: actual.depth } : index === 2 ? { ...field, value: actual.completion } : field),
      comparison: snapshot.weekly.comparison.map((item, index) => index === 0 ? { ...item, actual: actual.retention } : index === 1 ? { ...item, actual: actual.depth } : index === 2 ? { ...item, actual: actual.completion } : item)
    }
  };
}

export function deriveWeeklyRollups(history = {}) {
  const groups = new Map();
  dailyRecords(history).forEach((record) => {
    const cohort = cohortFrom(record);
    const week = text(record.week, "待确认");
    const key = `${cohort.id}|${week}`;
    if (!groups.has(key)) groups.set(key, { cohort, week, daily: [] });
    groups.get(key).daily.push(record);
  });

  weeklyRecords(history).forEach((record) => {
    const cohort = cohortFrom(record);
    const week = text(record.week, "待确认");
    const key = `${cohort.id}|${week}`;
    if (!groups.has(key)) groups.set(key, { cohort, week, daily: [] });
    groups.get(key).weekly = record;
  });

  return [...groups.values()]
    .sort((a, b) => `${a.week}${a.cohort.name}`.localeCompare(`${b.week}${b.cohort.name}`, "zh-CN"))
    .map(({ cohort, week, daily, weekly }) => {
      const closedDays = [...new Set(daily.filter((record) => record.status === "closed" || record.asOf === "日终").map((record) => record.day || record.date))];
      const latest = [...daily].sort((a, b) => comparableRecord(b) - comparableRecord(a))[0] || null;
      const explicitSummary = weekly ? summaryFrom(weekly) : emptySummary();
      const hasSummary = Object.values(explicitSummary).some((value) => value !== null);
      return {
        cohortId: cohort.id,
        cohortName: cohort.name,
        courseStartDate: cohort.startDate,
        week,
        daysCaptured: new Set(daily.map((record) => record.day || record.date)).size,
        closedDays: closedDays.length,
        latestAsOf: latest?.asOf || "待回填",
        status: weekly?.status || (closedDays.length >= 5 ? "closed" : "in-progress"),
        summary: hasSummary ? explicitSummary : emptySummary()
      };
    });
}

export function summarizeHistory(history = {}) {
  const latest = dailyRecords(history).sort((a, b) => comparableRecord(b) - comparableRecord(a))[0];
  return {
    cohortCount: new Set(dailyRecords(history).map((record) => cohortFrom(record).id)).size,
    dailyCount: dailyRecords(history).length,
    weeklyCount: weeklyRecords(history).length,
    latestAsOf: latest?.asOf || "待回填"
  };
}

export function selectSnapshotForCohort(snapshot, cohortId = ALL_COHORTS, date = null) {
  if (!snapshot || !cohortId) return snapshot;
  if (cohortId === ALL_COHORTS && (!date || date === snapshot.current?.date)) return snapshot;
  const record = date ? dailyRecordForDate(snapshot.history, cohortId, date) : selectCohortRecord(snapshot.history, cohortId);
  if (!record) return snapshot;
  const metrics = isRecord(record.metrics) ? record.metrics : {};
  const sameDay = cohortId === ALL_COHORTS ? [] : dailyRecords(snapshot.history)
    .filter((item) => cohortFrom(item).id === cohortId && item.date === record.date && (item.day || item.date) === (record.day || record.date))
    .sort((a, b) => comparableTime(a) - comparableTime(b));
  const points = Array.isArray(record.points) && record.points.length > 0
    ? record.points
    : sameDay.length > 0
    ? sameDay.map((item) => ({ time: item.asOf, ...(isRecord(item.metrics) ? item.metrics : {}), split: Array.isArray(item.split) ? item.split : undefined }))
    : [{ time: record.asOf, ...metrics }];
  const keyTrends = snapshot.weekly?.keyTrends
    ? {
        ...snapshot.weekly.keyTrends,
        labels: points.map((point) => point.time),
        datasets: [
          { label: "参与人数", data: points.map((point) => point.participant ?? null), color: "#4d8fe3" },
          { label: "正读人数", data: points.map((point) => point.positiveRead ?? null), color: "#2ea76f" },
          { label: "参与未完成人数", data: points.map((point) => point.notFinished ?? null), color: "#e86c56" }
        ]
      }
    : snapshot.weekly?.keyTrends;
  return applyWeeklySummary({
    ...snapshot,
    weekly: keyTrends ? { ...snapshot.weekly, keyTrends } : snapshot.weekly,
    current: {
      ...snapshot.current,
      date: record.date || snapshot.current.date,
      stage: record.stage || `${record.week || snapshot.current.stage}${record.day || ""}`,
      cohort: record.cohortName || snapshot.current.cohort,
      asOf: record.asOf || snapshot.current.asOf,
      status: record.status || snapshot.current.status,
      totalUsers: record.totalUsers ?? snapshot.current.totalUsers,
      split: record.split || snapshot.current.split,
      points,
      pending: record.pending || snapshot.current.pending
    }
  }, cohortId);
}

export function cohortEntries(history = {}) {
  const declared = Array.isArray(history.cohorts) ? history.cohorts.filter(isRecord) : [];
  const byId = new Map(declared.map((cohort) => [text(cohort.id), cohort]));
  latestDailyByCohort(history).forEach((record) => {
    const cohort = cohortFrom(record);
    if (!byId.has(cohort.id)) byId.set(cohort.id, { id: cohort.id, name: cohort.name, startDate: cohort.startDate });
  });
  return [...byId.values()].sort((a, b) => text(a.name).localeCompare(text(b.name), "zh-CN"));
}
