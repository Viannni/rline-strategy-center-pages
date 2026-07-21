import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  NAV_ITEMS,
  ROLES,
  ensureVisibleView,
  routeFromHash,
  visibleItems
} from "../app.js";
import {
  escapeAttribute,
  escapeHtml,
  renderPlacementPanel,
  renderTable
} from "../ui/components.js";
import { icon, iconButton } from "../ui/icons.js";

test("shell exposes the approved roles and complete navigation", () => {
  assert.deepEqual(ROLES.map(({ id }) => id), ["strategy", "agent", "learning", "sales"]);
  assert.deepEqual(NAV_ITEMS.map(({ label }) => label), [
    "总控台",
    "用户中心",
    "评分中心",
    "进线中心",
    "角色任务台",
    "生命周期",
    "提分运营",
    "数据底座",
    "系统落位",
    "效果复盘",
    "提需清单"
  ]);
  assert.ok(ROLES.every(({ permission }) => typeof permission === "string" && permission.length > 0));
});

test("role and hash routing restore only views visible to the active role", () => {
  assert.equal(routeFromHash("#users"), "users");
  assert.equal(routeFromHash("#view=tasks"), "tasks");
  assert.equal(routeFromHash("#%E0%A4%A"), "dashboard");
  assert.deepEqual(visibleItems("agent").map(({ id }) => id), [
    "dashboard",
    "users",
    "intake",
    "tasks",
    "lifecycle"
  ]);
  assert.equal(ensureVisibleView("scoring", "sales"), "dashboard");
});

test("HTML and attribute escaping protects component output", () => {
  assert.equal(escapeHtml('<img src=x onerror="boom">'), "&lt;img src=x onerror=&quot;boom&quot;&gt;");
  assert.equal(escapeAttribute('x" autofocus onfocus="boom'), "x&quot; autofocus onfocus=&quot;boom");

  const html = renderTable({
    caption: "用户表",
    columns: [{ key: "name", label: "姓名" }],
    rows: [{ id: 'row" onclick="boom', name: "<script>boom</script>" }]
  });
  assert.match(html, /row&quot; onclick=&quot;boom/);
  assert.match(html, /&lt;script&gt;boom&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("placement panel keeps gaps separate from explicit must-add evidence", () => {
  const html = renderPlacementPanel("activity-uplift");

  for (const label of [
    "现有系统",
    "路径",
    "状态",
    "已有能力",
    "可复用",
    "需要改造",
    "待核对/能力缺口",
    "必须新增",
    "依赖",
    "负责人",
    "验收",
    "降级"
  ]) assert.match(html, new RegExp(label));

  assert.match(html, /需要改造/);
  assert.match(html, /data-lucide="wrench"/);
  assert.match(html, /报名、到场、完赛、分享、领奖和支付是否可按用户回写待核对/);
  assert.match(html, /无已确认必须新增项/);

  const explicitMustAdd = renderPlacementPanel("scoring-routing");
  assert.match(explicitMustAdd, /必须新增/);
  assert.match(explicitMustAdd, /统一计分、路由与快照/);
});

test("icon helpers retain compact glyph and accessible label fallbacks", () => {
  assert.equal(icon('menu" onclick="boom'), "");
  const html = iconButton({
    icon: "menu",
    label: "打开导航",
    controls: "appSidebar",
    expanded: false
  });
  assert.match(html, /aria-label="打开导航"/);
  assert.match(html, /title="打开导航"/);
  assert.match(html, /aria-controls="appSidebar"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="icon-button__fallback" aria-hidden="true">≡<\/span>/);
  assert.match(html, /class="sr-only">打开导航<\/span>/);
  assert.match(html, /data-lucide="menu"/);
});

test("icon fallback, focus, and pinned CDN integrity keep static shell resilient", async () => {
  const [index, styles, ignore] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8")
  ]);

  assert.match(index, /href="\.\/styles\.css"/);
  assert.match(index, /src="\.\/app\.js"/);
  assert.match(index, /src="https:\/\/unpkg\.com\/lucide@0\.468\.0\/dist\/umd\/lucide\.min\.js"/);
  assert.match(index, /integrity="sha384-uTYyvsSSUZeaPhb5RbKlQa0zY\/WpX\/QHfvg2mczXyBQOpkWPEDy9lczyp\+w7SKXu"/);
  assert.match(index, /crossorigin="anonymous"/);
  assert.match(styles, /\.icon-button\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.icon-button__fallback\s*\{[^}]*white-space:\s*nowrap;/s);
  assert.match(styles, /outline:\s*3px solid var\(--focus\)/);
  assert.match(styles, /#viewRoot:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus\)/s);
  assert.doesNotMatch(styles, /#viewRoot\s*\{[^}]*outline:\s*none/s);
  assert.match(ignore, /(?:^|\n)\.playwright-cli\/(?:\n|$)/);
});
