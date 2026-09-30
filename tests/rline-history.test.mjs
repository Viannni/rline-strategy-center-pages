import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveWeeklyRollups,
  dayEndRecords,
  dailyRecordForDate,
  historyDates,
  latestDailyByCohort,
  previousDailyRecord,
  retainDailyObservation,
  selectCohortRecord,
  selectSnapshotForCohort,
  summarizeHistory
} from "../history.js";

const first = {
  cohortId: "rline-2026-09-14-1",
  cohortName: "1期",
  courseStartDate: "2026-09-14",
  date: "2026-09-14",
  week: "M1W1",
  day: "D1",
  asOf: "18:00",
  status: "partial",
  totalUsers: 610,
  metrics: { participant: 91, positiveRead: 75, retention: 14.92, depth: 12.3, notFinished: 16 },
  capturedAt: "2026-09-14T18:19:24+08:00"
};

const second = {
  ...first,
  cohortId: "rline-2026-09-21-2",
  cohortName: "2期",
  courseStartDate: "2026-09-21",
  date: "2026-09-21",
  week: "M1W1",
  metrics: { participant: 38, positiveRead: 30, retention: 12.1, depth: 10.4, notFinished: 8 },
  capturedAt: "2026-09-21T18:00:00+08:00"
};

test("retains intraday observations by cohort and replaces only the same observation key", () => {
  let history = { daily: [] };
  history = retainDailyObservation(history, first);
  history = retainDailyObservation(history, { ...first, asOf: "14:00", metrics: { participant: 59 } });
  history = retainDailyObservation(history, { ...first, metrics: { ...first.metrics, participant: 95 } });

  assert.equal(history.daily.length, 2);
  assert.equal(history.daily.find((item) => item.asOf === "18:00").metrics.participant, 95);
  assert.deepEqual(history.daily.map((item) => item.asOf).sort(), ["14:00", "18:00"]);
});

test("latest daily view keeps one latest record per cohort without mixing cohorts", () => {
  const history = { daily: [first, { ...first, asOf: "14:00", capturedAt: "2026-09-14T14:00:00+08:00" }, second] };
  const latest = latestDailyByCohort(history);

  assert.equal(latest.length, 2);
  assert.equal(latest.find((item) => item.cohortId === first.cohortId).asOf, "18:00");
  assert.equal(selectCohortRecord(history, second.cohortId).cohortName, "2期");
  assert.equal(selectCohortRecord(history, "all"), null);
});

test("weekly rollups are grouped by cohort and only close from explicit day-end records", () => {
  const history = {
    daily: [
      { ...first, asOf: "18:00", status: "partial" },
      { ...first, asOf: "日终", status: "closed", capturedAt: "2026-09-14T23:30:00+08:00" },
      { ...second, asOf: "18:00", status: "partial" }
    ],
    weekly: [{ cohortId: first.cohortId, cohortName: "1期", week: "M1W1", retention: 62, depth: 58, completion: 70, status: "closed" }]
  };
  const rollups = deriveWeeklyRollups(history);

  assert.equal(rollups.length, 2);
  assert.deepEqual(rollups.find((item) => item.cohortId === first.cohortId).summary, { retention: 62, depth: 58, completion: 70 });
  assert.equal(rollups.find((item) => item.cohortId === second.cohortId).status, "in-progress");
  assert.equal(rollups.find((item) => item.cohortId === second.cohortId).summary.retention, null);
});

test("history summary exposes retention counts for the workbench header", () => {
  const summary = summarizeHistory({ daily: [first, second], weekly: [] });
  assert.deepEqual(summary, { cohortCount: 2, dailyCount: 2, weeklyCount: 0, latestAsOf: "18:00" });
});

test("selected cohort projects its stored weekly result into the existing weekly view", () => {
  const snapshot = {
    current: { date: first.date, stage: first.stage, asOf: first.asOf, cohort: first.cohortName, totalUsers: first.totalUsers, split: [], points: [], pending: [] },
    weekly: {
      currentWeek: "M1W1",
      fields: [{ label: "周留存", value: null }, { label: "周深度", value: null }, { label: "周完课", value: null }],
      comparison: [{ label: "周留存", actual: null }, { label: "周深度", actual: null }, { label: "周完课", actual: null }]
    },
    history: {
      daily: [first],
      weekly: [{ cohortId: first.cohortId, cohortName: "1期", week: "M1W1", retention: 62, depth: 58, completion: 70, status: "closed" }]
    }
  };
  const selected = selectCohortRecord(snapshot.history, first.cohortId);
  const projected = selectSnapshotForCohort(snapshot, first.cohortId);

  assert.equal(selected.cohortName, "1期");
  assert.equal(projected.weekly.fields[0].value, 62);
  assert.equal(projected.weekly.comparison[2].actual, 70);
});

test("history dates are sorted newest first and previous day is resolved per cohort", () => {
  const history = {
    daily: [
      first,
      { ...first, asOf: "24:00", status: "closed", isDayEnd: true, capturedAt: "2026-09-14T23:59:00+08:00" },
      { ...first, date: "2026-09-15", day: "D2", stage: "M1W1D2", asOf: "18:00", metrics: { participant: 84 }, capturedAt: "2026-09-15T18:00:00+08:00" },
      { ...second, date: "2026-09-21", day: "D1", stage: "M1W1D1", asOf: "18:00" }
    ]
  };
  assert.deepEqual(historyDates(history, first.cohortId).map((item) => item.date), ["2026-09-15", "2026-09-14"]);
  assert.equal(previousDailyRecord(history, first.cohortId, "2026-09-15").date, "2026-09-14");
  assert.equal(previousDailyRecord(history, second.cohortId, "2026-09-21"), null);
});

test("previous day review waits for a complete 24:00 snapshot", () => {
  const history = {
    daily: [
      first,
      { ...first, date: "2026-09-15", day: "D2", stage: "M1W1D2", asOf: "12:00" }
    ]
  };
  assert.equal(previousDailyRecord(history, first.cohortId, "2026-09-15"), null);
});

test("latest daily record prefers the newer calendar date over an older day-end time", () => {
  const history = {
    daily: [
      { ...first, asOf: "24:00", status: "closed", date: "2026-09-14", capturedAt: "2026-09-14T23:59:00+08:00" },
      { ...first, asOf: "12:00", status: "partial", date: "2026-09-15", capturedAt: "2026-09-15T09:31:00+08:00" }
    ]
  };
  assert.equal(latestDailyByCohort(history)[0].date, "2026-09-15");
  assert.equal(selectCohortRecord(history, first.cohortId).asOf, "12:00");
});

test("all-cohort historical snapshots aggregate disjoint cohort denominators", () => {
  const history = {
    daily: [
      { ...first, asOf: "18:00" },
      { ...second, date: first.date, courseStartDate: first.date, asOf: "18:00", metrics: { participant: 38, positiveRead: 30, retention: 12.1, depth: 10.4, notFinished: 8 } }
    ]
  };
  const snapshot = {
    current: { date: "2026-09-15", stage: "M1W1D2", asOf: "18:00", cohort: "全部班期", totalUsers: 1, split: [], points: [], pending: [] },
    weekly: { currentWeek: "M1W1", keyTrends: { labels: [], datasets: [] }, fields: [], comparison: [] },
    history
  };
  const historical = selectSnapshotForCohort(snapshot, "all", first.date);
  assert.equal(historical.current.totalUsers, 1220);
  assert.equal(historical.current.points.at(-1).participant, 129);
  assert.equal(Number(historical.current.points.at(-1).retention.toFixed(2)), 10.57);
});

test("daily history keeps every intraday point and promotes 24:00 to the day-end record", () => {
  const points = [
    ["12:00", 51, 42, 8.36, 6.89, 559, 9],
    ["14:00", 59, 49, 9.67, 8.03, 551, 10],
    ["18:00", 91, 75, 14.92, 12.3, 519, 16],
    ["24:00", 363, 345, 59.51, 56.56, 247, 18]
  ];
  const history = {
    daily: points.map(([asOf, participant, positiveRead, retention, depth, absent, notFinished]) => ({
      ...first,
      asOf,
      status: asOf === "24:00" ? "closed" : "partial",
      metrics: { participant, positiveRead, retention, depth, absent, notFinished },
      capturedAt: `2026-09-14T${asOf === "24:00" ? "23:59" : asOf}:00+08:00`
    }))
  };
  const day = dailyRecordForDate(history, "all", "2026-09-14");

  assert.equal(day.asOf, "24:00");
  assert.equal(day.status, "closed");
  assert.deepEqual(day.points.map((point) => point.time), ["12:00", "14:00", "18:00", "24:00"]);
  assert.equal(day.points.at(-1).participant, 363);
  assert.equal(day.metrics.positiveRead, 345);
  assert.equal(day.metrics.absent, 247);
  assert.equal(day.metrics.notFinished, 18);
});

test("day-end trend records only include complete 24:00 observations", () => {
  const history = {
    daily: [
      { ...first, asOf: "24:00", status: "closed", isDayEnd: true, metrics: { participant: 363, positiveRead: 345, retention: 59.51, depth: 56.56 }, capturedAt: "2026-09-14T23:59:00+08:00" },
      { ...first, date: "2026-09-15", day: "D2", stage: "M1W1D2", asOf: "18:00", status: "partial", metrics: { participant: 61, positiveRead: 51, retention: 10, depth: 8.36 }, capturedAt: "2026-09-15T18:00:00+08:00" },
      { ...first, date: "2026-09-15", day: "D2", stage: "M1W1D2", asOf: "24:00", status: "closed", isDayEnd: true, metrics: { participant: 280, positiveRead: 266, retention: 45.9, depth: 43.61 }, capturedAt: "2026-09-15T23:59:00+08:00" }
    ]
  };
  assert.deepEqual(dayEndRecords(history, first.cohortId).map((record) => record.day), ["D1", "D2"]);
  assert.deepEqual(dayEndRecords(history, first.cohortId).map((record) => record.metrics.retention), [59.51, 45.9]);
});

test("all-cohort day-end records can derive completion rate from completed users", () => {
  const history = {
    daily: [
      { ...first, asOf: "24:00", status: "closed", isDayEnd: true, totalUsers: 400, metrics: { participant: 300, positiveRead: 280, completed: 240, retention: 75, depth: 70 }, capturedAt: "2026-09-14T23:59:00+08:00" },
      { ...second, cohortId: "rline-2026-09-14-2", date: first.date, day: first.day, totalUsers: 200, asOf: "24:00", status: "closed", isDayEnd: true, metrics: { participant: 140, positiveRead: 120, completed: 100, retention: 70, depth: 60 }, capturedAt: "2026-09-14T23:59:00+08:00" }
    ]
  };
  const record = dayEndRecords(history).at(0);
  assert.equal(record.metrics.completion, 56.67);
});
