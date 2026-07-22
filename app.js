import { SEED_STATE } from "./data/seed-data.js";
import { createStore } from "./core/store.js";
import * as dashboardView from "./views/dashboard.js";
import * as businessLinesView from "./views/business-lines.js";
import * as strategyAssetsView from "./views/strategy-assets.js";
import * as contentView from "./views/content.js";
import * as applicationsView from "./views/applications.js";
import * as executionView from "./views/execution.js";
import * as modelsView from "./views/models.js";
import * as insightsView from "./views/insights.js";
import * as audiencesView from "./views/users.js";
import * as dispatchView from "./views/dispatch.js";
import * as effectivenessView from "./views/review.js";
import * as inboundReviewView from "./views/inbound-review.js";
import * as dataFoundationView from "./views/data-foundation.js";
import {
  escapeAttribute,
  escapeHtml,
  downloadFile,
  iconButton,
  openDrawer,
  openModal,
  renderBadge,
  renderPlacementPanel,
  renderTable,
  toast
} from "./ui/components.js";
import { icon, refreshIcons } from "./ui/icons.js";

export const ROLES = Object.freeze([
  { id: "strategy", label: "策略团队", permission: "查看英语全线策略配置、下发、回写和复盘；不展示一线个人作业权限。" }
]);

export const NAV_ITEMS = Object.freeze([
  { id: "dashboard", label: "全线总控", icon: "layout-dashboard", stage: "strategy", description: "英语各业务线策略健康、覆盖、执行和风险总览" },
  { id: "business-lines", label: "业务线下钻", icon: "network", stage: "strategy", description: "R线、K线、E线、级别与班期策略明细" },
  { id: "strategy-assets", label: "策略资产库", icon: "folder-kanban", stage: "strategy", description: "策略、SOP、模型、内容、权益和版本统一管理" },
  { id: "content", label: "内容策略", icon: "calendar-range", stage: "strategy", description: "活动、讲座、PK、月测、报告和权益内容配置" },
  { id: "applications", label: "应用策略", icon: "bot", stage: "strategy", description: "AI场景、Agent知识库、解决率和兜底问题" },
  { id: "execution", label: "执行策略", icon: "send", stage: "strategy", description: "中心化触达、频控、冲突和动作包配置" },
  { id: "models", label: "模型策略", icon: "calculator", stage: "strategy", description: "高优识别、续费窗口、关单SOP和模型校准" },
  { id: "insights", label: "用户洞察", icon: "scan-search", stage: "strategy", description: "画像、评分、信号、权益和行为归因" },
  { id: "audiences", label: "人群圈选", icon: "users", stage: "audience", description: "按业务域、标签、分数、风险和行为生成人群包" },
  { id: "dispatch", label: "下发追踪", icon: "list-checks", stage: "dispatch", description: "策略包下发、执行状态、失败原因和回写完整度" },
  { id: "effectiveness", label: "有效性看板", icon: "chart-no-axes-combined", stage: "review", description: "策略覆盖、触达周期、SOP效果和实验校准" },
  { id: "inbound-review", label: "进线复盘", icon: "git-pull-request-arrow", stage: "review", description: "策略归因、进线质量、问题反哺和修正建议" },
  { id: "data-foundation", label: "数据底座", icon: "database", stage: "writeback", description: "业务域、事件、字段、刷新、产研提需和验收" }
]);

export const FLOW_STAGES = Object.freeze([
  { id: "strategy", label: "策略配置" },
  { id: "audience", label: "人群圈选" },
  { id: "dispatch", label: "下发追踪" },
  { id: "writeback", label: "数据回写" },
  { id: "review", label: "效果复盘" }
]);

export const viewModules = new Map([
  ["dashboard", dashboardView],
  ["business-lines", businessLinesView],
  ["strategy-assets", strategyAssetsView],
  ["content", contentView],
  ["applications", applicationsView],
  ["execution", executionView],
  ["models", modelsView],
  ["insights", insightsView],
  ["audiences", audiencesView],
  ["dispatch", dispatchView],
  ["effectiveness", effectivenessView],
  ["inbound-review", inboundReviewView],
  ["data-foundation", dataFoundationView]
]);
const components = Object.freeze({
  iconButton,
  openDrawer,
  openModal,
  renderBadge,
  renderPlacementPanel,
  renderTable,
  toast
});

let app = null;

function validRole(role) {
  return role === "strategy" ? "strategy" : "strategy";
}

export function visibleItems() {
  return NAV_ITEMS;
}

function itemFor(viewId) {
  return NAV_ITEMS.find((item) => item.id === viewId) ?? NAV_ITEMS[0];
}

export function routeFromHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return NAV_ITEMS[0].id;
  const value = raw.includes("=") ? new URLSearchParams(raw).get("view") : raw.split("?")[0];
  try {
    return decodeURIComponent(value || "");
  } catch {
    return NAV_ITEMS[0].id;
  }
}

function roleTaskCount() {
  return 0;
}

function currentRole() {
  return validRole(app?.store.getState().ui?.role);
}

export function ensureVisibleView(viewId, role) {
  return visibleItems(role).some((item) => item.id === viewId) ? viewId : visibleItems(role)[0].id;
}

function renderSidebar() {
  const links = visibleItems().map((item) => {
    const isCurrent = item.id === app.currentView;
    return `<a class="nav-item${isCurrent ? " is-current" : ""}" href="#${escapeAttribute(item.id)}"${isCurrent ? ' aria-current="page"' : ""}>${icon(item.icon, { className: "nav-item__icon" })}<span>${escapeHtml(item.label)}</span></a>`;
  }).join("");

  app.sidebar.innerHTML = `<div class="sidebar__header"><a class="brand" href="#dashboard" aria-label="英语业务策略经营中台"><span class="brand__mark" aria-hidden="true">英</span><span class="brand__text"><strong>英语策略中台</strong><small>R线首发样板</small></span></a>${iconButton({ icon: "x", label: "关闭导航", id: "navCloseButton", className: "sidebar__close" })}</div><nav class="nav-list" aria-label="策略中台视图">${links}</nav><div class="sidebar__foot"><strong>策略团队</strong><span>全线经营视角</span><small>仅展示策略配置、下发、回写和复盘，不是一线作业台。</small></div>`;
}

function renderFlowRail(stageId) {
  return `<ol class="flow-rail" aria-label="R线策略流程">${FLOW_STAGES.map((stage, index) => {
    const current = stage.id === stageId;
    const arrow = index < FLOW_STAGES.length - 1 ? '<span class="flow-rail__arrow" aria-hidden="true">-&gt;</span>' : "";
    return `<li class="flow-rail__stage${current ? " is-current" : ""}"${current ? ' aria-current="step"' : ""}><span>${escapeHtml(stage.label)}</span>${arrow}</li>`;
  }).join("")}</ol>`;
}

function renderTopbar() {
  const state = app.store.getState();
  const stage = itemFor(app.currentView).stage;
  const storageNotice = state.storage?.notice;
  const storageTools = storageNotice
    ? `<span class="storage-notice" role="status">本地存储异常，当前仍在内存中运行。</span>${iconButton({ icon: "download", label: "导出当前快照", id: "exportSnapshotButton" })}${iconButton({ icon: "rotate-ccw", label: "恢复种子数据", id: "recoverStorageButton" })}`
    : "";

  app.topbar.innerHTML = `<div class="topbar__flow">${iconButton({ icon: "menu", label: "打开导航", id: "navMenuButton", className: "menu-button", controls: "appSidebar", expanded: document.body.classList.contains("nav-open") })}${renderFlowRail(stage)}</div><div class="topbar__tools">${storageTools}${iconButton({ icon: "undo-2", label: "撤销最近一次更改", id: "undoButton", disabled: (state.history?.length ?? 0) === 0 })}${iconButton({ icon: "rotate-ccw", label: "重置本地演示数据", id: "resetButton" })}<span class="role-hint">英语全线策略视角 · R线首发样板</span></div>`;
}

function exportSnapshot(store) {
  downloadFile({ content: `${JSON.stringify(store.getState(), null, 2)}\n`, filename: "rline-local-demo-snapshot.json", type: "application/json;charset=utf-8" });
  toast("已导出当前本地快照。", "success");
}

function confirmReset(store) {
  const close = openModal({
    title: "重置本地演示数据",
    trustedHtml: `<p>此操作会清除本地演示修改，并恢复 SEED_STATE 种子数据。当前修改可先导出快照留存。</p><div class="form-actions"><button id="resetCancelButton" type="button" class="secondary-button">取消</button><button id="confirmResetButton" type="button" class="danger-button">清除并恢复</button></div>`
  });
  document.getElementById("resetCancelButton")?.addEventListener("click", () => close());
  document.getElementById("confirmResetButton")?.addEventListener("click", () => {
    store.reset();
    close({ restoreFocus: false });
    toast("已清除本地演示修改并恢复种子数据。", "success");
  });
}

function confirmUndo(store) {
  const close = openModal({
    title: "撤销最近一次本地演示变更",
    trustedHtml: `<p>此操作会撤销最新一次本地演示变更，且不会自动连续撤销两次。取消不会更改当前状态。</p><div class="form-actions"><button id="undoCancelButton" type="button" class="secondary-button">取消</button><button id="confirmUndoButton" type="button" class="danger-button">确认撤销</button></div>`
  });
  document.getElementById("undoCancelButton")?.addEventListener("click", () => close());
  document.getElementById("confirmUndoButton")?.addEventListener("click", () => {
    if (store.undo()) toast("已撤销最近一次数据变更。", "success");
    else toast("没有可撤销的数据变更。", "info");
    close({ restoreFocus: false });
  });
}

function renderPlaceholder(container, item, role, state) {
  const roleLabel = ROLES.find((candidate) => candidate.id === role)?.label || role;
  const taskCount = roleTaskCount(state, role);
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">${escapeHtml(roleLabel)}</p><h1>${escapeHtml(item.label)}</h1><p>${escapeHtml(item.description)}</p></div>${renderBadge("info", "演示数据")}</section><section class="placeholder-band" aria-label="视图状态"><div class="placeholder-band__message">${icon(item.icon)}<div><h2>暂无可展示数据</h2><p>当前演示视图尚未加载业务内容。</p></div></div><dl class="shell-facts"><div><dt>模拟用户</dt><dd>${state.users?.length ?? 0}</dd></div><div><dt>待处理任务</dt><dd>${taskCount}</dd></div><div><dt>当前环节</dt><dd>${escapeHtml(FLOW_STAGES.find((stage) => stage.id === item.stage)?.label)}</dd></div></dl></section>`;
}

function contextFor(role, state, stage, routeParams = {}) {
  return {
    store: app.store,
    state,
    role,
    stage,
    routeParams,
    navigate,
    components
  };
}

function renderCurrentView({ focus = false } = {}) {
  const role = currentRole();
  const state = app.store.getState();
  const item = itemFor(app.currentView);
  const module = viewModules.get(app.currentView);
  const routeParams = app.routeParams;
  app.routeParams = {};

  app.viewRoot.setAttribute("aria-label", item.label);
  try {
    if (module && typeof module.render === "function") {
      app.viewRoot.replaceChildren();
      module.render(app.viewRoot, contextFor(role, state, item.stage, routeParams));
    } else {
      renderPlaceholder(app.viewRoot, item, role, state);
    }
  } catch (error) {
    app.viewRoot.innerHTML = `<section class="page-header"><div><p class="section-kicker">视图异常</p><h1>${escapeHtml(item.label)}</h1><p>该视图暂时无法加载。</p></div>${renderBadge("danger", "加载失败")}</section><section class="empty-state"><div>${icon("rotate-cw")}</div><h2>暂时无法加载此视图</h2><p>当前数据没有被清除，可以重试或恢复种子数据。</p><div class="form-actions"><button id="retryViewButton" type="button" class="secondary-button">重试</button><button id="recoverViewButton" type="button" class="danger-button">恢复种子数据</button></div></section>`;
    console.error(error);
    toast("视图加载失败，请检查控制台。", "danger");
  }
  refreshIcons();
  if (focus) app.viewRoot.focus({ preventScroll: true });
}

function renderShell(options = {}) {
  renderSidebar();
  renderTopbar();
  renderCurrentView(options);
  refreshIcons();
}

function closeMobileNav({ restoreFocus = true } = {}) {
  if (!app) return;
  document.body.classList.remove("nav-open");
  app.sidebar.classList.remove("is-open");
  app.workspace.inert = false;
  document.getElementById("navMenuButton")?.setAttribute("aria-expanded", "false");
  if (window.matchMedia("(min-width: 901px)").matches) {
    app.sidebar.removeAttribute("aria-hidden");
    return;
  }
  app.sidebar.setAttribute("aria-hidden", "true");
  if (restoreFocus && app.menuTrigger?.isConnected) app.menuTrigger.focus();
}

function openMobileNav() {
  if (window.matchMedia("(min-width: 901px)").matches) return;
  app.menuTrigger = document.getElementById("navMenuButton");
  document.body.classList.add("nav-open");
  app.sidebar.classList.add("is-open");
  app.sidebar.removeAttribute("aria-hidden");
  app.workspace.inert = true;
  app.menuTrigger?.setAttribute("aria-expanded", "true");
  window.setTimeout(() => document.getElementById("navCloseButton")?.focus(), 180);
}

function focusableElements(container) {
  return [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

function trapMobileNavFocus(event) {
  if (event.key !== "Tab" || !document.body.classList.contains("nav-open")) return;
  const focusable = focusableElements(app.sidebar);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!app.sidebar.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function syncResponsiveNavigation() {
  if (window.matchMedia("(min-width: 901px)").matches) {
    closeMobileNav({ restoreFocus: false });
  } else if (!document.body.classList.contains("nav-open")) {
    app.sidebar.setAttribute("aria-hidden", "true");
    app.workspace.inert = false;
  }
}

function handleRouteChange({ focus = true } = {}) {
  const role = currentRole();
  const requested = routeFromHash(window.location.hash);
  const nextView = ensureVisibleView(requested, role);
  const pending = app.pendingRoute?.viewId === nextView ? app.pendingRoute : null;
  app.currentView = nextView;
  app.routeParams = pending?.params ?? {};
  app.pendingRoute = null;
  if (nextView !== requested) window.history.replaceState(null, "", `#${nextView}`);
  closeMobileNav({ restoreFocus: false });
  renderShell({ focus });
}

export function navigate(viewId, params = {}) {
  if (!app) return;
  const nextView = ensureVisibleView(viewId, currentRole());
  const routeParams = params && typeof params === "object" && !Array.isArray(params) ? structuredClone(params) : {};
  if (window.location.hash === `#${nextView}`) {
    app.currentView = nextView;
    app.routeParams = routeParams;
    renderShell({ focus: true });
  } else {
    app.pendingRoute = { viewId: nextView, params: routeParams };
    window.location.hash = nextView;
  }
}

export function registerView(viewId, module) {
  if (!NAV_ITEMS.some((item) => item.id === viewId)) throw new Error(`Unknown view: ${viewId}`);
  if (typeof module?.render !== "function") throw new TypeError("A view module must expose render(container, context)");
  viewModules.set(viewId, module);
  if (app?.currentView === viewId) renderCurrentView();
}

function boot() {
  const sidebar = document.querySelector(".sidebar");
  const topbar = document.querySelector(".topbar");
  const workspace = document.querySelector(".workspace");
  const viewRoot = document.getElementById("viewRoot");
  const navOverlay = document.getElementById("navOverlay");
  if (!sidebar || !topbar || !workspace || !viewRoot || !navOverlay) return;

  const store = createStore(SEED_STATE);
  const role = validRole(store.getState().ui?.role);
  let currentView = ensureVisibleView(routeFromHash(window.location.hash), role);
  if (window.location.hash !== `#${currentView}`) window.history.replaceState(null, "", `#${currentView}`);

  app = { store, sidebar, topbar, workspace, viewRoot, navOverlay, currentView, menuTrigger: null, routeParams: {}, pendingRoute: null };
  if (window.matchMedia("(max-width: 900px)").matches) sidebar.setAttribute("aria-hidden", "true");

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("#navMenuButton")) openMobileNav();
    if (target.closest("#navCloseButton, #navOverlay")) closeMobileNav();
    if (target.closest(".nav-item, .brand")) closeMobileNav({ restoreFocus: false });
    if (target.closest("#undoButton")) {
      confirmUndo(store);
    }
    if (target.closest("#resetButton")) confirmReset(store);
    if (target.closest("#exportSnapshotButton")) exportSnapshot(store);
    if (target.closest("#recoverStorageButton, #recoverViewButton")) confirmReset(store);
    if (target.closest("#retryViewButton")) renderCurrentView({ focus: true });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("nav-open")) closeMobileNav();
    else trapMobileNavFocus(event);
  });
  window.addEventListener("hashchange", () => handleRouteChange());
  window.addEventListener("resize", syncResponsiveNavigation);
  store.subscribe(() => {
    const allowedView = ensureVisibleView(app.currentView, currentRole());
    if (allowedView !== app.currentView) {
      app.currentView = allowedView;
      window.history.replaceState(null, "", `#${allowedView}`);
    }
    renderShell();
  });

  renderShell();
  const storageNotice = store.getState().storage?.notice;
  if (storageNotice) toast("本地演示数据已恢复为可用状态。", "warning", 4800);

  window.rlineStrategyCenter = Object.freeze({
    get store() { return store; },
    navigate,
    registerView
  });
}

if (typeof document !== "undefined") boot();
