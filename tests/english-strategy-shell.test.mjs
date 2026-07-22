import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

import { FLOW_STAGES, NAV_ITEMS, viewModules } from "../app.js";
import { SEED_STATE } from "../data/seed-data.js";
const ROUTE_SAFETY_FORBIDDEN_TERMS = [
  "child-",
  "当前主责",
  "团队队列",
  "角色任务台",
  "派发",
  "分配",
  "路由",
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

function assertRouteIsStrategySafe(html, routeId) {
  const htmlWithoutExactNonDispatchLabel = html.replaceAll(">非派单<", "><");

  for (const forbidden of ROUTE_SAFETY_FORBIDDEN_TERMS) {
    assert.doesNotMatch(htmlWithoutExactNonDispatchLabel, new RegExp(forbidden), `${routeId} must not render ${forbidden}`);
  }
}

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
    "lifecycle",
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

test("lifecycle coverage map is reachable from the strategy shell", () => {
  const lifecycle = NAV_ITEMS.find((item) => item.id === "lifecycle");
  const html = renderRoute(viewModules.get("lifecycle"));

  assert.equal(lifecycle.label, "生命周期");
  assert.match(html, /策略覆盖地图/);
  assert.match(html, /R \/ K \/ E 策略密度/);
});

test("every strategy navigation route renders without frontline records or operations", () => {
  for (const item of NAV_ITEMS) {
    const view = viewModules.get(item.id);
    const html = renderRoute(view);

    assert.match(html, new RegExp(item.label), `${item.id} should identify its strategy view`);
    if (item.id === "inbound-review") {
      assert.match(html, />非派单</, "inbound-review should contain the exact 非派单 label");
    }
    assertRouteIsStrategySafe(html, item.id);
  }
});

test("styles include strategy dashboard responsive surfaces", async () => {
  const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.metric-strip/);
  assert.match(styles, /\.line-grid/);
  assert.match(styles, /\.strategy-card-grid/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)/);
});

test("public files do not expose internal source URLs", async () => {
  const forbiddenSourcePattern = new RegExp([
    "ali" + "docs",
    "ding" + "talk",
    "admin-" + "xjjj",
    "zt" + "na"
  ].join("|"), "i");
  const roots = [
    new URL("../README.md", import.meta.url),
    new URL("../index.html", import.meta.url),
    new URL("../app.js", import.meta.url),
    new URL("../styles.css", import.meta.url),
    new URL("../docs/superpowers/specs/", import.meta.url),
    new URL("../docs/superpowers/plans/", import.meta.url)
  ];
  const files = [];
  for (const root of roots) {
    if (root.pathname.endsWith("/")) {
      const entries = await readdir(root);
      files.push(...entries.filter((entry) => entry.endsWith(".md")).map((entry) => new URL(entry, root)));
    } else {
      files.push(root);
    }
  }

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, forbiddenSourcePattern, file.pathname);
  }
});
