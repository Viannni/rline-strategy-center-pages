import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { FLOW_STAGES, NAV_ITEMS, viewModules } from "../app.js";
import { SEED_STATE } from "../data/seed-data.js";
const FRONTLINE_FORBIDDEN_TERMS = [
  "child-",
  "当前主责",
  "团队队列",
  "角色任务台",
  "转派",
  "提交反馈",
  "进线队列",
  "派单",
  "创建任务",
  "外呼",
  "SLA",
  "任务台",
  "二销任务",
  "任务准入"
];

function renderRoute(view) {
  const container = {
    innerHTML: "",
    querySelectorAll() {
      return [];
    }
  };
  view.render(container, { state: SEED_STATE, role: "strategy", navigate() {} });
  return container.innerHTML;
}

test("flow rail no longer describes frontline dispatch flow", () => {
  assert.deepEqual(FLOW_STAGES.map((stage) => stage.label), ["策略配置", "人群圈选", "下发追踪", "数据回写", "效果复盘"]);
});

test("static shell copy names English strategy center", async () => {
  const [app, index] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  assert.match(app, /英语业务策略经营中台/);
  assert.doesNotMatch(app, /Agent协同/);
  assert.doesNotMatch(app, /角色任务台/);
  assert.match(index, /<title>英语全线策略中台<\/title>/);
  assert.match(index, /aria-label="英语全线策略中台导航"/);
  assert.doesNotMatch(index, /R线策略中台/);
});

test("navigation ids are stable for GitHub Pages hashes", () => {
  assert.deepEqual(NAV_ITEMS.map((item) => item.id), [
    "dashboard",
    "business-lines",
    "strategy-assets",
    "content",
    "applications",
    "execution",
    "models",
    "insights",
    "audiences",
    "dispatch",
    "effectiveness",
    "inbound-review",
    "data-foundation"
  ]);
});

test("strategy routes are wired to renderable modules", () => {
  assert.deepEqual([...viewModules.keys()], NAV_ITEMS.map((item) => item.id));
  assert.ok([...viewModules.values()].every((module) => typeof module.render === "function"));
});

test("every strategy navigation route renders without frontline records or operations", () => {
  for (const item of NAV_ITEMS) {
    const view = viewModules.get(item.id);
    const html = renderRoute(view).replaceAll("非派单", "NON_DISPATCH");

    assert.match(html, new RegExp(item.label), `${item.id} should identify its strategy view`);
    for (const forbidden of FRONTLINE_FORBIDDEN_TERMS) {
      assert.doesNotMatch(html, new RegExp(forbidden), `${item.id} must not render ${forbidden}`);
    }
  }
});
