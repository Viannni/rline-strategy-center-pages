import test from "node:test";
import assert from "node:assert/strict";

import { SEED_STATE } from "../data/seed-data.js";
import * as contentView from "../views/content.js";
import * as applicationsView from "../views/applications.js";
import * as executionView from "../views/execution.js";
import * as modelsView from "../views/models.js";
import * as insightsView from "../views/insights.js";
import * as lifecycleView from "../views/lifecycle.js";

function htmlFor(view) {
  const root = { innerHTML: "" };
  view.render(root, { state: SEED_STATE, role: "strategy", components: {} });
  return root.innerHTML;
}

test("content strategy workspace manages content assets not marketing landing copy", () => {
  const html = htmlFor(contentView);
  assert.match(html, /内容策略工作区/);
  assert.match(html, /内容日历/);
  assert.match(html, /成长报告/);
  assert.match(html, /奖学金/);
});

test("application strategy workspace covers AI scene boundaries", () => {
  const html = htmlFor(applicationsView);
  assert.match(html, /应用策略工作区/);
  assert.match(html, /AI场景地图/);
  assert.match(html, /转人工率/);
});

test("execution strategy workspace covers centralized touch and conflicts", () => {
  const html = htmlFor(executionView);
  assert.match(html, /执行策略工作区/);
  assert.match(html, /中心化触达/);
  assert.match(html, /频控/);
});

test("model and insight workspaces support user's core role", () => {
  assert.match(htmlFor(modelsView), /高优续费识别/);
  assert.match(htmlFor(modelsView), /关单SOP/);
  assert.match(htmlFor(insightsView), /用户洞察工作区/);
  assert.match(htmlFor(insightsView), /权益\/奖学金规则/);
});

test("lifecycle view becomes multi-line strategy coverage map", () => {
  const html = htmlFor(lifecycleView);
  assert.match(html, /策略覆盖地图/);
  assert.match(html, /T0-T28/);
  assert.match(html, /M1-M12/);
  assert.match(html, /K线中心化SOP模板/);
});
