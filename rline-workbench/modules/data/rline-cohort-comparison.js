// Comparison records transcribed from the two user-provided 24:00 screenshots.
// The second cohort screenshot is split by Kitty/Taby, so the comparison view
// keeps the source breakdown while using weighted R1/R2 aggregates for charts.
const FIRST_COHORT_ID = "rline-2026-09-14-1";
const SECOND_COHORT_ID = "rline-2026-09-21-2";
// The screenshots are yesterday's 24:00 final snapshot; 24:00 is captured after midnight
// but belongs to the previous course day for daily review and cohort comparison.
const FIRST_D1_DATE = "2026-09-21";
const CURRENT_DATE = "2026-09-22";
const REPORT_DATE = "2026-09-23";

const firstCohortW2D1 = {
  cohortId: FIRST_COHORT_ID,
  cohortName: "1期",
  courseStartDate: "2026-09-14",
  date: FIRST_D1_DATE,
  week: "M2W1",
  day: "D1",
  stage: "M2W1D1",
  asOf: "24:00",
  status: "closed",
  isDayEnd: true,
  dataStatus: "用户截图回填",
  totalUsers: 610,
  split: [
    { level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 128, positiveRead: 122, retention: 33.42, depth: 31.85, absent: 255, notFinished: 6 },
    { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 81, positiveRead: 79, retention: 35.68, depth: 34.8, absent: 146, notFinished: 2 }
  ],
  metrics: { participant: 209, positiveRead: 201, retention: 34.26, depth: 32.95, absent: 401, notFinished: 8 },
  points: [{ time: "24:00", participant: 209, positiveRead: 201, retention: 34.26, depth: 32.95, absent: 401, notFinished: 8, capturedAt: "2026-09-22T00:00:00+08:00" }],
  pending: [],
  missing: [],
  finalAsOf: "24:00",
  capturedAt: "2026-09-22T00:00:00+08:00"
};

const firstCohortW2D2 = {
  cohortId: FIRST_COHORT_ID,
  cohortName: "1期",
  courseStartDate: "2026-09-14",
  date: CURRENT_DATE,
  week: "M2W1",
  day: "D2",
  stage: "M2W1D2",
  asOf: "24:00",
  status: "closed",
  isDayEnd: true,
  dataStatus: "用户截图回填",
  totalUsers: 610,
  split: [
    { level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 115, positiveRead: 113, retention: 30.03, depth: 29.50, absent: 268, notFinished: 2 },
    { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 74, positiveRead: 71, retention: 32.60, depth: 31.28, absent: 153, notFinished: 3 }
  ],
  metrics: { participant: 189, positiveRead: 184, retention: 30.98, depth: 30.16, absent: 421, notFinished: 5 },
  points: [{ time: "24:00", participant: 189, positiveRead: 184, retention: 30.98, depth: 30.16, absent: 421, notFinished: 5, capturedAt: "2026-09-23T00:00:00+08:00" }],
  pending: [],
  missing: [],
  finalAsOf: "24:00",
  capturedAt: "2026-09-23T00:00:00+08:00"
};

const secondCohortW1D1 = {
  cohortId: SECOND_COHORT_ID,
  cohortName: "2期",
  courseStartDate: "2026-09-21",
  date: FIRST_D1_DATE,
  week: "M1W1",
  day: "D1",
  stage: "M1W1D1",
  asOf: "24:00",
  status: "closed",
  isDayEnd: true,
  dataStatus: "用户截图回填；R1/R2为Kitty、Taby加权汇总",
  totalUsers: 1328,
  split: [
    { level: "R1", className: "R1-2期", totalUsers: 862, participant: 522, positiveRead: 497, retention: 60.56, depth: 57.66, absent: 340, notFinished: 25 },
    { level: "R2", className: "R2-2期", totalUsers: 466, participant: 253, positiveRead: 242, retention: 54.29, depth: 51.93, absent: 213, notFinished: 11 }
  ],
  sourceBreakdown: [
    { level: "R1", className: "R1-2期 Kitty", totalUsers: 448, participant: 252, positiveRead: 240, retention: 56.25, depth: 53.57, absent: 196, notFinished: 12 },
    { level: "R1", className: "R1-2期 Taby", totalUsers: 414, participant: 270, positiveRead: 257, retention: 65.22, depth: 62.08, absent: 144, notFinished: 13 },
    { level: "R2", className: "R2-2期 Kitty", totalUsers: 209, participant: 112, positiveRead: 108, retention: 53.59, depth: 51.67, absent: 97, notFinished: 4 },
    { level: "R2", className: "R2-2期 Taby", totalUsers: 257, participant: 141, positiveRead: 134, retention: 54.86, depth: 52.14, absent: 116, notFinished: 7 }
  ],
  metrics: { participant: 775, positiveRead: 739, retention: 58.36, depth: 55.72, absent: 553, notFinished: 36 },
  points: [{ time: "24:00", participant: 775, positiveRead: 739, retention: 58.36, depth: 55.72, absent: 553, notFinished: 36, capturedAt: "2026-09-22T00:00:00+08:00" }],
  pending: [],
  missing: [],
  finalAsOf: "24:00",
  capturedAt: "2026-09-22T00:00:00+08:00"
};

const secondCohortW1D2 = {
  cohortId: SECOND_COHORT_ID,
  cohortName: "2期",
  courseStartDate: "2026-09-21",
  date: CURRENT_DATE,
  week: "M1W1",
  day: "D2",
  stage: "M1W1D2",
  asOf: "24:00",
  status: "closed",
  isDayEnd: true,
  dataStatus: "用户截图回填；R1/R2为Kitty、Taby加权汇总",
  totalUsers: 1327,
  split: [
    { level: "R1", className: "R1-2期", totalUsers: 861, participant: 424, positiveRead: 403, retention: 49.25, depth: 46.81, absent: 437, notFinished: 21 },
    { level: "R2", className: "R2-2期", totalUsers: 466, participant: 219, positiveRead: 215, retention: 47.00, depth: 46.14, absent: 247, notFinished: 4 }
  ],
  sourceBreakdown: [
    { level: "R1", className: "R1-2期 Kitty", totalUsers: 447, participant: 201, positiveRead: 191, retention: 44.97, depth: 42.73, absent: 246, notFinished: 10 },
    { level: "R1", className: "R1-2期 Taby", totalUsers: 414, participant: 223, positiveRead: 212, retention: 53.86, depth: 51.21, absent: 191, notFinished: 11 },
    { level: "R2", className: "R2-2期 Kitty", totalUsers: 209, participant: 98, positiveRead: 95, retention: 46.89, depth: 45.45, absent: 111, notFinished: 3 },
    { level: "R2", className: "R2-2期 Taby", totalUsers: 257, participant: 121, positiveRead: 120, retention: 47.08, depth: 46.69, absent: 136, notFinished: 1 }
  ],
  metrics: { participant: 643, positiveRead: 618, retention: 48.46, depth: 46.57, absent: 684, notFinished: 25 },
  points: [{ time: "24:00", participant: 643, positiveRead: 618, retention: 48.46, depth: 46.57, absent: 684, notFinished: 25, capturedAt: "2026-09-23T00:00:00+08:00" }],
  pending: [],
  missing: [],
  finalAsOf: "24:00",
  capturedAt: "2026-09-23T00:00:00+08:00"
};

function sameRecord(record, addition) {
  return record?.cohortId === addition.cohortId && record?.date === addition.date && record?.stage === addition.stage && record?.asOf === addition.asOf;
}

function appendUnique(records, additions) {
  const next = Array.isArray(records) ? [...records] : [];
  additions.forEach((addition) => {
    const index = next.findIndex((record) => sameRecord(record, addition));
    if (index >= 0) next[index] = { ...next[index], ...addition };
    else next.push(addition);
  });
  return next;
}

function nextCalendarDate(date) {
  const [year, month, day] = String(date || "").split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return REPORT_DATE;
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function nextCourseStage(week, day) {
  const dayNumber = Number(String(day || "").replace(/^D/, ""));
  const weekMatch = String(week || "").match(/^(M\d+)W(\d+)$/);
  if (!Number.isFinite(dayNumber) || !weekMatch) {
    return { week: week || "M2W1", day: "D3", stage: `${week || "M2W1"}D3` };
  }
  const nextDayNumber = dayNumber >= 5 ? 1 : dayNumber + 1;
  const nextWeek = dayNumber >= 5 ? `${weekMatch[1]}W${Number(weekMatch[2]) + 1}` : week;
  return { week: nextWeek, day: `D${nextDayNumber}`, stage: `${nextWeek}D${nextDayNumber}` };
}

function latestClosedRecord(records, cohortId) {
  return (records || [])
    .filter((record) => record.cohortId === cohortId && (record.status === "closed" || record.isDayEnd === true || record.asOf === "24:00"))
    .sort((a, b) => `${b.date || ""}${b.capturedAt || ""}`.localeCompare(`${a.date || ""}${a.capturedAt || ""}`))[0] || null;
}

function nextReportContext(records, fallback) {
  const latest = latestClosedRecord(records, FIRST_COHORT_ID) || fallback;
  const stage = nextCourseStage(latest.week, latest.day);
  return {
    ...fallback,
    cohortId: FIRST_COHORT_ID,
    cohortName: latest.cohortName || "1期",
    cohort: latest.cohortName || "1期",
    courseStartDate: latest.courseStartDate || "2026-09-14",
    date: nextCalendarDate(latest.date) || REPORT_DATE,
    week: stage.week,
    day: stage.day,
    stage: stage.stage,
    asOf: "12:00",
    status: "partial",
    isDayEnd: false,
    dataStatus: "今日数据待回填；前一日24:00已留存",
    totalUsers: latest.totalUsers,
    split: latest.split,
    points: [],
    pending: ["12:00", "14:00", "18:00", "24:00"],
    missing: ["12:00", "14:00", "18:00", "24:00"],
    finalAsOf: "24:00",
    capturedAt: latest.capturedAt
  };
}

export function enrichRlineComparisonSnapshot(snapshot) {
  const history = snapshot?.history || {};
  const cohorts = Array.isArray(history.cohorts) ? [...history.cohorts] : [];
  if (!cohorts.some((cohort) => cohort.id === SECOND_COHORT_ID)) {
    cohorts.push({ id: SECOND_COHORT_ID, name: "2期", startDate: "2026-09-21", status: "active" });
  }
  const daily = appendUnique(history.daily, [firstCohortW2D1, firstCohortW2D2, secondCohortW1D1, secondCohortW1D2]);
  const weekly = appendUnique(history.weekly, [
    {
      cohortId: FIRST_COHORT_ID,
      cohortName: "1期",
      courseStartDate: "2026-09-14",
      week: "M2W1",
      status: "in-progress",
      dataStatus: "M2W1 D1-D2已回填，D3-D5待回收",
      daysCaptured: 2,
      expectedDays: 5,
      latestDay: "D2",
      latestAsOf: "24:00",
      summary: { retention: null, depth: null, completion: null }
    },
    {
      cohortId: SECOND_COHORT_ID,
      cohortName: "2期",
      courseStartDate: "2026-09-21",
      week: "M1W1",
      status: "in-progress",
      dataStatus: "M1W1 D1-D2已回填，D3-D5待回收",
      daysCaptured: 2,
      expectedDays: 5,
      latestDay: "D2",
      latestAsOf: "24:00",
      summary: { retention: null, depth: null, completion: null }
    }
  ]);
  return {
    ...snapshot,
    version: "rline-daily-snapshot-2026-09-23-cohort-comparison",
    generatedAt: "2026-09-23T00:30:00+08:00",
    snapshotCapturedAt: "2026-09-23T00:30:00+08:00",
    current: nextReportContext(daily, firstCohortW2D2),
    weekly: {
      ...snapshot.weekly,
      cohortComparison: {
        week: "M1W1",
        weeks: { first: "M2W1", second: "M1W1" },
        weekLabel: "第一期 M2W1 vs 第二期 M1W1",
        primaryCohortId: FIRST_COHORT_ID,
        cohortIds: [FIRST_COHORT_ID, SECOND_COHORT_ID],
        note: "第一期与第二期按相同行课日、同一24:00日终节点对比；当前D1-D2已回填，后续D3-D5数据到达后自动补点。"
      }
    },
    history: { ...history, cohorts, daily, weekly }
  };
}

export const RLINE_COHORT_COMPARISON_SOURCE = Object.freeze({
  firstCohortW2D1,
  firstCohortW2D2,
  secondCohortW1D1,
  secondCohortW1D2,
  firstCohortId: FIRST_COHORT_ID,
  secondCohortId: SECOND_COHORT_ID
});
