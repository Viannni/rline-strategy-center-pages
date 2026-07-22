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
  formatDisplayValue,
  renderPlacementPanel,
  renderTable
} from "../ui/components.js";
import { icon, iconButton } from "../ui/icons.js";

test("shell exposes the English strategy center navigation", () => {
  assert.deepEqual(ROLES.map(({ id }) => id), ["strategy"]);
  assert.deepEqual(NAV_ITEMS.map(({ label }) => label), [
    "全线总控",
    "业务线下钻",
    "生命周期",
    "策略资产库",
    "内容策略",
    "应用策略",
    "执行策略",
    "模型策略",
    "用户洞察",
    "人群圈选",
    "下发追踪",
    "有效性看板",
    "进线复盘",
    "数据底座"
  ]);
  assert.ok(NAV_ITEMS.every((item) => ["strategy", "audience", "dispatch", "writeback", "review"].includes(item.stage)));
});

test("hash routing restores strategy views without frontline role filtering", () => {
  assert.equal(routeFromHash("#audiences"), "audiences");
  assert.equal(routeFromHash("#view=dispatch"), "dispatch");
  assert.equal(routeFromHash("#%E0%A4%A"), "dashboard");
  assert.deepEqual(visibleItems("strategy").map(({ id }) => id), NAV_ITEMS.map(({ id }) => id));
  assert.equal(ensureVisibleView("models", "strategy"), "models");
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

test("nullable signals use an explicit fallback in preview surfaces", () => {
  assert.equal(formatDisplayValue(null), "无");
  assert.equal(formatDisplayValue(undefined), "无");
  assert.equal(formatDisplayValue("P2"), "P2");
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
  assert.doesNotMatch(styles, /var\(--text(?:-muted)?\)/);
  assert.match(ignore, /(?:^|\n)\.playwright-cli\/(?:\n|$)/);
});
