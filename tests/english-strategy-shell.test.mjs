import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { FLOW_STAGES, NAV_ITEMS, viewModules } from "../app.js";

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
