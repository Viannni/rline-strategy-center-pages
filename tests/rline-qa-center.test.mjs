import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderQACenter } from "../views/rline-reporting.js";

test("QA center presents text, charts, source, and department solution fields", () => {
  const html = renderQACenter({}, [{
    id: "qa-1",
    type: "用户QA",
    category: "家长认知",
    issue: "没有开口环节",
    evidence: "家长反馈：没有开口跟读",
    impact: "影响课程价值感",
    department: "教研+产品",
    solution: "补充跟读和纠音入口",
    owner: "课程产品",
    dueDate: "2026-10-02",
    status: "待协同",
    verification: "观察开口完成率",
    source: "OA课程QA",
    sourceUrl: "https://example.com/qa"
  }], {});

  assert.match(html, /用户QA \/ 课程QA：从证据到解决方案闭环/);
  assert.match(html, /QA问题分类/);
  assert.match(html, /责任部门分布/);
  assert.match(html, /其他部门解决方案/);
  assert.match(html, /补充跟读和纠音入口/);
  assert.match(html, /data-qa-save/);
  assert.match(html, /class="rline-chart-bar-value/);
  assert.match(html, /example\.com\/qa/);
});

test("workbench routes data archive and QA as separate tabs", async () => {
  const [view, app] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/app.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /\["qa", "QA中心"\]/);
  assert.match(view, /renderDataArchive\(baseSnapshot, selectedCohortId, context\)/);
  assert.match(view, /renderQACenter\(baseSnapshot, context\.qaEntries, context\)/);
  assert.match(app, /loadArchiveEntries/);
  assert.match(app, /loadQAEntries/);
  assert.match(app, /onArchivesChange/);
  assert.match(app, /onQAChange/);
});


test("weekly report separates first-week daily and monthly weekly scopes", async () => {
  const [{ RLINE_DAILY_SNAPSHOT }, { enrichRlineComparisonSnapshot }, { renderWeeklyReport }] = await Promise.all([
    import("../data/rline-daily-data.js"),
    import("../data/rline-cohort-comparison.js"),
    import("../views/rline-reporting.js")
  ]);
  const html = renderWeeklyReport(enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT));
  assert.match(html, /首周W1每日趋势/);
  assert.match(html, /当月 W1-W4 周度整体：实际 vs 周目标/);
  assert.match(html, /W1-W4周留存：实际 vs 目标/);
  assert.match(html, /W1-W4周深度：实际 vs 目标/);
  assert.match(html, /W1-W4周完课：实际 vs 目标/);
  assert.doesNotMatch(html, /rline-hero__mark/);
});
