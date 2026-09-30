import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { RLINE_DAILY_SNAPSHOT } from "../data/rline-daily-data.js";
import { enrichRlineComparisonSnapshot } from "../data/rline-cohort-comparison.js";
import * as rlineDailyView from "../views/rline-daily.js";

test("R线工作台 is a standalone entry outside the strategy-center navigation", async () => {
  const [standalone, shell] = await Promise.all([
    readFile(new URL("../../rline-workbench/index.html", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  assert.match(standalone, /<title>R线运营策略工作台<\/title>/);
  assert.match(standalone, /\.\/app\.js/);
  assert.doesNotMatch(standalone, /策略有效性看板/);
  assert.doesNotMatch(shell, /R线工作台/);
});

test("R线工作台 exposes live refresh controls", async () => {
  const [standalone, app] = await Promise.all([
    readFile(new URL("../../rline-workbench/index.html", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/app.js", import.meta.url), "utf8")
  ]);
  assert.match(standalone, /id="rlineLiveStatus"/);
  assert.match(standalone, /id="rlineSyncPlan"/);
  assert.match(standalone, /id="rlineRefreshButton"/);
  assert.match(app, /setInterval\(\(\) => refreshSnapshot\(\{ silent: true \}\), LIVE_REFRESH_INTERVAL_MS\)/);
  assert.match(app, /cache: "no-store"/);
  assert.match(app, /12:30/);
  assert.match(app, /14:30/);
  assert.match(app, /18:30/);
  assert.match(app, /次日00:30/);
});

test("R线工作台 exposes historical date review and previous-day analysis", async () => {
  const view = await readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8");
  assert.match(view, /data-rline-date/);
  assert.match(view, /前一日24:00复盘/);
  assert.match(view, /基于24:00日终/);
  assert.match(view, /previousDailyRecord/);
  assert.match(view, /onDateChange/);
});

test("前一日24:00复盘 includes completion result and the BI completion distribution module", async () => {
  const view = await readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8");
  assert.match(view, /前一日完课/);
  assert.match(view, /完课用户渠道占比/);
  assert.match(view, /completionReviewText/);
});

test("前一日复盘的渠道完课口径使用BI课时完课率", async () => {
  const view = await readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8");
  assert.match(view, /各渠道课时完课率：\$\{channelRates\}/);
  assert.doesNotMatch(view, /const completionShares =/);
});

test("R线工作台版本化视图模块，避免复盘口径被浏览器缓存", async () => {
  const app = await readFile(new URL("../../rline-workbench/app.js", import.meta.url), "utf8");
  assert.match(app, /rline-daily\.js\?v=\d{8}-[a-z0-9-]+/);
});

test("R线工作台 exposes the complete intraday comparison and marks 24:00 as day end", async () => {
  const [view, source] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/data/rline-live-snapshot.json", import.meta.url), "utf8")
  ]);
  assert.match(view, /data-rline-intraday/);
  assert.match(view, /日内时点对比/);
  assert.match(view, /24:00.*日终/);
  assert.match(source, /"asOf": "24:00"/);
  assert.match(source, /"status": "closed"/);
});

test("R线工作台历史保留D2四个时点及24:00日终结果", async () => {
  const source = await readFile(new URL("../../rline-workbench/data/rline-live-snapshot.json", import.meta.url), "utf8");
  assert.match(source, /"date": "2026-09-15"[^\n]*"asOf": "12:00"/);
  assert.match(source, /"date": "2026-09-15"[^\n]*"asOf": "14:00"[^\n]*"participant": 55[^\n]*"positiveRead": 47/);
  assert.match(source, /"date": "2026-09-15"[^\n]*"asOf": "18:00"/);
  assert.match(source, /"date": "2026-09-15"[^\n]*"asOf": "24:00"[^\n]*"participant": 280[^\n]*"positiveRead": 266[^\n]*"retention": 45\.9[^\n]*"depth": 43\.61/);
});

test("R线工作台展示日终留存深度完课变化趋势并区分阶段完课口径", async () => {
  const [view, charts] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../views/rline-charts.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /日维度变化/);
  assert.match(view, /D1、D2、D3.*日终留存 \/ 深度 \/ 完课变化/);
  assert.match(view, /dayEndRecords/);
  assert.match(view, /不使用BI阶段完课率替代/);
  assert.match(charts, /dataset\.dashed/);
});

test("R线周度图表叠加首周日目标线和首月周目标线，并展示逐日差值", () => {
  const snapshot = enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT);
  const container = { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
  rlineDailyView.render(container, {
    state: { rlineDailyWorkbench: snapshot },
    routeParams: { tab: "weekly" },
    selectedCohortId: "all",
    selectedDate: "",
    selectedBiStage: "all",
    selectedBiCohortId: "all",
    reportDrafts: {}
  });
  assert.deepEqual(snapshot.weekly.targets.daily.retention, [72, 68, 65, 62, 55]);
  assert.deepEqual(snapshot.weekly.targets.daily.depth, [69, 66.5, 63.5, 60.5, 52.5]);
  assert.deepEqual(snapshot.weekly.targets.daily.completion, [69, 69.2, 69.2, 69, 66.5]);
  assert.deepEqual(snapshot.weekly.targets.monthly.retention, [64, 54, 48.5, 42]);
  assert.match(container.innerHTML, /首周W1每日趋势/);
  assert.match(container.innerHTML, /目标.*实际.*差值/);
  assert.match(container.innerHTML, /首周完课/);
  assert.match(container.innerHTML, /首周留存/);
  assert.match(container.innerHTML, /D2 14:00已排除/);
});

test("R线周度复盘展示D1-D5日终和官方周汇总", async () => {
  const view = await readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8");
  const [fallback, live] = await Promise.all([
    readFile(new URL("../data/rline-daily-data.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/data/rline-live-snapshot.json", import.meta.url), "utf8")
  ]);
  assert.match(view, /阶段周数据表/);
  assert.match(view, /rline-weekly-daily-row/);
  assert.match(view, /官方周度汇总/);
  assert.match(view, /rline-weekly-official-row/);
  assert.match(fallback, /M1W1 D1-D5日终及官方周度结果已回填/);
  assert.match(fallback, /value: 75\.08/);
  assert.match(live, /"daysCaptured": 5/);
  assert.match(live, /"latestDay": "D5"/);
  assert.match(live, /"summary": \{ "retention": 75\.08, "depth": 38\.03, "completion": 56\.33 \}/);
  assert.match(live, /"label": "R1-1期"[^\n]*"completedLessonHours": 1093/);
});

test("R线工作台 includes the source-defined D2 SOP actions", async () => {
  const source = await readFile(new URL("../data/rline-daily-data.js", import.meta.url), "utf8");
  assert.match(source, /id: "D2-0900"/);
  assert.match(source, /id: "D2-1200"/);
  assert.match(source, /id: "D2-1800-A"/);
  assert.match(source, /id: "D2-1800-B"/);
  assert.match(source, /id: "D2-2030"/);
  assert.match(source, /action: "补读提醒"/);
  assert.match(source, /validation: "补读人数、补读完成率"/);
});

test("R线工作台 exposes refreshed course BI results without replacing daily snapshots", async () => {
  const [view, source] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/data/rline-live-snapshot.json", import.meta.url), "utf8")
  ]);
  assert.match(view, /课程BI实时结果/);
  assert.match(view, /来源渠道/);
  assert.match(view, /完课 \/ 未完课用户渠道分布/);
  assert.match(view, /完课用户分布/);
  assert.match(view, /未完课用户分布/);
  assert.match(view, /BI口径估算/);
  assert.match(view, /24:00数据为准/);
  assert.match(view, /仅用于经营观察/);
  assert.match(source, /"bi":/);
  assert.match(source, /"capturedAt": "2026-09-22T00:30:00\+08:00"/);
  assert.match(source, /"cohortName": "R1-1期"/);
  assert.match(source, /"participation": 82\.9/);
  assert.match(source, /"participant": 32/);
  assert.match(source, /"positiveRead": 30/);
  assert.match(source, /"retention": 5\.25/);
});

test("R线工作台保留D3/D4并展示D5 24:00阶段周数据", async () => {
  const source = await readFile(new URL("../../rline-workbench/data/rline-live-snapshot.json", import.meta.url), "utf8");
  assert.match(source, /"stage": "M1W1D3"/);
  assert.match(source, /"date": "2026-09-16"[^\n]*"asOf": "24:00"[^\n]*"participant": 246[^\n]*"positiveRead": 241[^\n]*"retention": 40\.33[^\n]*"depth": 39\.51/);
  assert.match(source, /"stage": "M1W1D4"/);
  assert.match(source, /"date": "2026-09-17"[^\n]*"asOf": "24:00"/);
  assert.match(source, /"date": "2026-09-17"[^\n]*"asOf": "24:00"[^\n]*"participant": 240[^\n]*"positiveRead": 231[^\n]*"retention": 39\.34[^\n]*"depth": 37\.87/);
  assert.match(source, /"date": "2026-09-17"[^\n]*"status": "closed"[^\n]*"missing": \["notFinished"\]/);
  assert.match(source, /"stage": "M1W1D5"/);
  assert.match(source, /"date": "2026-09-18"[^\n]*"asOf": "24:00"[^\n]*"participant": 193[^\n]*"positiveRead": 183[^\n]*"retention": 31\.64[^\n]*"depth": 30/);
});

test("R线课程BI结果 supports stage and cohort filters", async () => {
  const [view, app] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/app.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /data-rline-bi-stage/);
  assert.match(view, /data-rline-bi-cohort/);
  assert.match(view, /当前查看/);
  assert.match(view, /filterBiCohorts/);
  assert.match(app, /selectedBiStage/);
  assert.match(app, /selectedBiCohortId/);
  assert.match(app, /biStage/);
  assert.match(app, /biCohort/);
  assert.match(app, /status === "行课中"/);
});

test("R线工作台纳入昨天的课程BI渠道快照", async () => {
  const source = JSON.parse(await readFile(new URL("../../rline-workbench/data/rline-live-snapshot.json", import.meta.url), "utf8"));
  assert.equal(source.bi.capturedAt, "2026-09-22T00:30:00+08:00");
  const r1Current = source.bi.cohorts.find((row) => row.cohortId === "111150");
  const r2Current = source.bi.cohorts.find((row) => row.cohortId === "111168");
  const r1Previous = source.bi.cohorts.find((row) => row.cohortId === "110963");
  const r2Previous = source.bi.cohorts.find((row) => row.cohortId === "111166");
  const r2Other = source.bi.cohorts.find((row) => row.cohortId === "111169");
  assert.equal(r1Current.status, "行课中");
  assert.equal(r1Current.sources.find((row) => row.name === "APP部").completion, 51.8);
  assert.equal(r2Current.sources.find((row) => row.name === "用户召回").completion, 52.9);
  assert.equal(r1Previous.sources.find((row) => row.name === "APP部").depth, 25.3);
  assert.equal(r2Previous.sources.find((row) => row.name === "扩品").supplementCompletion, 24.2);
  assert.equal(r2Other.status, "其他");
});

test("R线工作台 fallback snapshot keeps the completion distribution inputs", async () => {
  const [view, fallback] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../data/rline-daily-data.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /rline-bi-donut/);
  assert.match(view, /渠道结论/);
  assert.match(fallback, /bi:/);
  assert.match(fallback, /完课率-课时/);
});

test("R线今日策略页 exposes currently available data boundaries", async () => {
  const view = await readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8");
  assert.match(view, /当前数据能力/);
  assert.match(view, /现在能验证什么/);
  assert.match(view, /渠道参与率与完课率/);
  assert.match(view, /完课用户渠道占比/);
  assert.match(view, /参与质量对比/);
  assert.match(view, /问题信号/);
  assert.match(view, /首联服务有效性/);
  assert.match(view, /BI聚合可用/);
});

test("R线日报结论 supports editable local drafts", async () => {
  const [view, app, styles] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/app.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/styles.css", import.meta.url), "utf8")
  ]);
  assert.match(view, /data-rline-report-editor/);
  assert.match(view, /data-rline-report-row/);
  assert.match(view, /恢复自动结论/);
  assert.match(view, /onReportSave/);
  assert.match(app, /rline-workbench-report-drafts-v1/);
  assert.match(app, /localStorage/);
  assert.match(styles, /rline-report-field textarea/);
});

test("R线日报草稿在输入后会立即保留，刷新重绘不会丢失", async () => {
  const [view, app] = await Promise.all([
    readFile(new URL("../views/rline-daily.js", import.meta.url), "utf8"),
    readFile(new URL("../../rline-workbench/app.js", import.meta.url), "utf8")
  ]);
  assert.match(view, /addEventListener\("input"/);
  assert.match(view, /onReportDraftChange/);
  assert.match(app, /onReportDraftChange/);
});

test("R线工作台纳入第二期W1D1并展示一期/二期日变化对比", () => {
  const snapshot = enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT);
  const secondD1 = snapshot.history.daily.find((record) => record.cohortName === "2期" && record.stage === "M1W1D1");
  assert.equal(secondD1.totalUsers, 1328);
  assert.equal(secondD1.metrics.participant, 775);
  assert.equal(secondD1.metrics.retention, 58.36);
  assert.equal(secondD1.metrics.depth, 55.72);
  assert.equal(snapshot.current.stage, "M2W1D3");

  const container = { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
  rlineDailyView.render(container, {
    state: { rlineDailyWorkbench: snapshot },
    routeParams: { tab: "weekly" },
    selectedCohortId: "all",
    selectedDate: "",
    selectedBiStage: "all",
    selectedBiCohortId: "all",
    reportDrafts: {}
  });
  assert.match(container.innerHTML, /IP分析：Kitty/);
  assert.match(container.innerHTML, /渠道分析：扩科/);
  assert.match(container.innerHTML, /内容IP，不是用户来源渠道/);
  assert.match(container.innerHTML, /D2 14:00已排除/);
});

test("R线工作台纳入一期和二期昨天的D2日终数据并按行课日对齐", () => {
  const snapshot = enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT);
  const firstD2 = snapshot.history.daily.find((record) => record.cohortName === "1期" && record.stage === "M2W1D2");
  const secondD2 = snapshot.history.daily.find((record) => record.cohortName === "2期" && record.stage === "M1W1D2");
  assert.equal(firstD2.metrics.participant, 189);
  assert.equal(firstD2.metrics.retention, 30.98);
  assert.equal(firstD2.metrics.depth, 30.16);
  assert.equal(secondD2.totalUsers, 1327);
  assert.equal(secondD2.metrics.participant, 643);
  assert.equal(secondD2.metrics.retention, 48.46);
  assert.equal(secondD2.metrics.depth, 46.57);
  assert.equal(snapshot.current.stage, "M2W1D3");

  const container = { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
  rlineDailyView.render(container, {
    state: { rlineDailyWorkbench: snapshot },
    routeParams: { tab: "weekly" },
    selectedCohortId: "all",
    selectedDate: "",
    selectedBiStage: "all",
    selectedBiCohortId: "all",
    reportDrafts: {}
  });
  assert.match(container.innerHTML, /首周W1每日趋势/);
  assert.match(container.innerHTML, /30\.98%/);
  assert.match(container.innerHTML, /D2 14:00已排除/);
});

test("最新日终数据进入次日策略日报，并驱动前一日复盘结论", () => {
  const snapshot = enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT);
  assert.equal(snapshot.current.date, "2026-09-23");
  assert.equal(snapshot.current.stage, "M2W1D3");
  assert.deepEqual(snapshot.current.pending, ["12:00", "14:00", "18:00", "24:00"]);

  const container = { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
  rlineDailyView.render(container, {
    state: { rlineDailyWorkbench: snapshot },
    routeParams: { tab: "daily" },
    selectedCohortId: "all",
    selectedDate: "",
    selectedBiStage: "all",
    selectedBiCohortId: "all",
    reportDrafts: {}
  });
  assert.match(container.innerHTML, /2026-09-22 24:00日终：参与832人、正读802人/);
  assert.match(container.innerHTML, /留存42\.95%/);
  assert.match(container.innerHTML, /深度41\.40%/);
  assert.match(container.innerHTML, /D2 24:00日终/);
  assert.doesNotMatch(container.innerHTML, /依据2026-09-21 24:00日终：参与984人、正读940人/);
  assert.doesNotMatch(container.innerHTML, /D5 24:00日终：总参与193人、正读183人/);
});

test("日报结论基于全量数据生成问题定位、优先动作和验证指标", () => {
  const snapshot = enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT);
  const container = { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
  rlineDailyView.render(container, {
    state: { rlineDailyWorkbench: snapshot },
    routeParams: { tab: "daily" },
    selectedCohortId: "all",
    selectedDate: "",
    selectedBiStage: "all",
    selectedBiCohortId: "all",
    reportDrafts: {}
  });
  assert.match(container.innerHTML, /数据分析与优化建议/);
  assert.match(container.innerHTML, /D1→D2/);
  assert.match(container.innerHTML, /留存42\.95%（下降7\.82pp）/);
  assert.match(container.innerHTML, /首周D1→D5/);
  assert.match(container.innerHTML, /APP部/);
  assert.match(container.innerHTML, /382人/);
  assert.match(container.innerHTML, /用户召回/);
  assert.match(container.innerHTML, /负责人/);
  assert.match(container.innerHTML, /验证指标/);
  assert.match(container.innerHTML, /D3\/D4/);
  assert.match(container.innerHTML, /现象→判断→动作→验证/);
});
