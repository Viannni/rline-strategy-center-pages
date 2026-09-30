import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../rline-workbench/", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("weekly report is leadership-oriented and keeps weekly/daily dimensions separate", async () => {
  const reporting = await read("modules/views/rline-reporting.js");
  const index = await read("index.html");

  assert.match(reporting, /<h1>\$\{escapeHtml\(reportDate\)\} 周报<\/h1>/);
  assert.match(reporting, /当月 W1-W4 周度整体：实际 vs 周目标/);
  assert.match(reporting, /首周每日趋势：按期次和级别查看/);
  assert.match(reporting, /D2 14:00不进入分析/);
  assert.doesNotMatch(reporting, /可直接用于周会播报/);
  assert.doesNotMatch(reporting, /已归档周次的日终覆盖/);
  assert.match(index, /app\.js\?v=20260930-integrated/);
});

test("workbench exposes editable strategy, effectiveness and renewal modules", async () => {
  const daily = await read("modules/views/rline-daily.js");
  const strategy = await read("modules/views/rline-strategy.js");
  const effectiveness = await read("modules/views/rline-effectiveness.js");
  const renewal = await read("modules/views/rline-renewal.js");

  for (const label of ["策略设置", "效果分析", "续费转化", "数据留存", "项目推进"]) assert.match(daily, new RegExp(label));
  for (const label of ["月课SOP", "年课SOP", "流程框架设计", "完整流程设计", "SOP设计", "流程预览"]) assert.match(strategy, new RegExp(label));
  assert.match(effectiveness, /策略动作按顺序追踪/);
  assert.match(renewal, /新增、修改、删除续费记录/);
  assert.match(renewal, /内容IP/);
  assert.match(renewal, /渠道/);
});

test("project ledger seeds defaults and supports destructive cleanup", async () => {
  const app = await read("app.js");
  const daily = await read("modules/views/rline-daily.js");
  const reporting = await read("modules/views/rline-reporting.js");

  assert.match(daily, /export \{ DEFAULT_PROJECTS \}/);
  assert.match(app, /rlineDailyView\.DEFAULT_PROJECTS/);
  assert.match(reporting, /data-project-delete/);
  assert.match(reporting, /onProjectsChange\?\.\(\(context\.projects \|\| \[\]\)\.filter/);
});
