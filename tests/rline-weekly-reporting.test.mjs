import test from "node:test";
import assert from "node:assert/strict";
import { buildWeeklyReport, progressOverview, reportingTargets } from "../reporting.js";

const history = {
  daily: [
    { cohortId: "r1-1", cohortName: "1期", week: "M1W1", day: "D1", date: "2026-09-14", asOf: "24:00", status: "closed", totalUsers: 100, metrics: { participant: 72, positiveRead: 69, retention: 72, depth: 69, completion: null } },
    { cohortId: "r1-1", cohortName: "1期", week: "M1W1", day: "D2", date: "2026-09-15", asOf: "14:00", status: "partial", totalUsers: 100, metrics: { participant: 10, positiveRead: 9, retention: 10, depth: 9 } },
    { cohortId: "r1-1", cohortName: "1期", week: "M1W1", day: "D2", date: "2026-09-15", asOf: "24:00", status: "closed", totalUsers: 100, metrics: { participant: 60, positiveRead: 57, retention: 60, depth: 57, completion: null } }
  ],
  weekly: []
};

test("weekly reporting uses only 24:00 records and preserves missing completion", () => {
  const report = buildWeeklyReport({ history, cohortId: "r1-1", week: "M1W1" });

  assert.deepEqual(report.days.map((item) => item.day), ["D1", "D2"]);
  assert.equal(report.days[1].actual.retention, 60);
  assert.equal(report.days[1].actual.completion, null);
  assert.equal(report.days[1].gap.retention, -8);
  assert.equal(report.days[1].gap.completion, null);
  assert.equal(reportingTargets.daily.retention[1], 68);
});

test("weekly reporting builds a target-gap-action narrative and keeps IP separate from channels", () => {
  const report = buildWeeklyReport({
    history,
    cohortId: "r1-1",
    week: "M1W1",
    ipSnapshots: [{ ip: "Kitty", cohortId: "r1-1", week: "M1W1", day: "D2", metrics: { retention: 58, depth: 55 } }],
    channelSnapshots: [{ sourceChannel: "APP部", cohortId: "r1-1", week: "M1W1", day: "D2", metrics: { retention: 56, depth: 52 } }]
  });

  assert.match(report.conclusion, /目标/);
  assert.match(report.conclusion, /实际/);
  assert.match(report.conclusion, /差值/);
  assert.equal(report.ipSnapshots[0].ip, "Kitty");
  assert.equal(report.channelSnapshots[0].sourceChannel, "APP部");
});


test("weekly reporting exposes separate weekly comparison, daily target gaps, and QA decisions", () => {
  const historyWithWeekly = {
    ...history,
    weekly: [{
      cohortId: "r1-1",
      cohortName: "1期",
      week: "M1W1",
      status: "closed",
      daysCaptured: 2,
      summary: { retention: 60, depth: 57, completion: null }
    }]
  };
  const report = buildWeeklyReport({ history: historyWithWeekly, cohortId: "r1-1", week: "M1W1" });

  assert.deepEqual(report.weeklyComparison.map((item) => item.metric), ["retention", "depth", "completion"]);
  assert.deepEqual(report.weeklyComparison.map((item) => item.gap), [-4, -4, null]);
  assert.equal(report.dailyComparison[1].target.retention, 68);
  assert.equal(report.dailyComparison[1].status, "已回填");
  assert.equal(report.dataQuality.expectedDays, 5);
  assert.equal(report.dataQuality.capturedDays, 2);
  assert.ok(report.narrative.sections.some((section) => section.id === "user-qa"));
  assert.ok(report.narrative.sections.some((section) => section.id === "course-qa"));
  assert.ok(report.narrative.sections.some((section) => section.id === "strategy"));
});

test("project overview reports status distribution and closure rate", () => {
  const overview = progressOverview([
    { id: "sop", status: "已验收" },
    { id: "push", status: "验证中" },
    { id: "bi", status: "待协同" }
  ]);

  assert.equal(overview.total, 3);
  assert.equal(overview.closed, 1);
  assert.equal(overview.closureRate, 33.3);
  assert.equal(overview.byStatus["验证中"], 1);
  assert.equal(overview.open, 2);
  assert.equal(overview.blocked, 1);
});
