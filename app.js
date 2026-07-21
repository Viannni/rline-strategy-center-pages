import { SEED_STATE } from "./data/seed-data.js";
import { createStore } from "./core/store.js";
import {
  escapeAttribute,
  escapeHtml,
  iconButton,
  openDrawer,
  openModal,
  renderBadge,
  renderPlacementPanel,
  renderTable,
  toast
} from "./ui/components.js";
import { icon, refreshIcons } from "./ui/icons.js";
import * as dashboardView from "./views/dashboard.js";
import * as scoringView from "./views/scoring.js";
import * as usersView from "./views/users.js";

export const ROLES = Object.freeze([
  { id: "strategy", label: "策略全景", permission: "可查看全部模块；规则变更仅在本地模拟生效" },
  { id: "agent", label: "Agent协同", permission: "仅展示当班队列与可转派任务" },
  { id: "learning", label: "学情服务", permission: "仅展示学情、规划与售后协作范围" },
  { id: "sales", label: "二销承接", permission: "仅展示续费窗口与绑定用户任务" }
]);

const ALL_ROLES = ROLES.map(({ id }) => id);

export const NAV_ITEMS = Object.freeze([
  { id: "dashboard", label: "总控台", icon: "layout-dashboard", roles: ALL_ROLES, stage: "behavior", description: "关键人群、任务与风险的经营总览" },
  { id: "users", label: "用户中心", icon: "users", roles: ALL_ROLES, stage: "behavior", description: "用户证据、分层和动作记录" },
  { id: "scoring", label: "评分中心", icon: "calculator", roles: ["strategy"], stage: "score", description: "计分规则、独立信号与试算" },
  { id: "intake", label: "进线中心", icon: "git-pull-request-arrow", roles: ALL_ROLES, stage: "gate", description: "触达准入、路由轨迹与异常进线" },
  { id: "tasks", label: "角色任务台", icon: "list-checks", roles: ALL_ROLES, stage: "dispatch", description: "按演示角色承接任务与结构化回写" },
  { id: "lifecycle", label: "生命周期", icon: "calendar-range", roles: ALL_ROLES, stage: "behavior", description: "月课与年课节点策略" },
  { id: "operations", label: "提分运营", icon: "trending-up", roles: ["strategy", "learning"], stage: "tier", description: "中心化提分活动与人群迁移" },
  { id: "data-foundation", label: "数据底座", icon: "database", roles: ["strategy"], stage: "score", description: "F01-F16字段口径与数据状态" },
  { id: "system-map", label: "系统落位", icon: "network", roles: ["strategy"], stage: "writeback", description: "现有系统的复用、改造与新增证据" },
  { id: "review", label: "效果复盘", icon: "chart-no-axes-combined", roles: ["strategy", "learning", "sales"], stage: "writeback", description: "分层迁移、任务、活动与转化复盘" },
  { id: "demands", label: "提需清单", icon: "clipboard-list", roles: ["strategy"], stage: "writeback", description: "跨部门依赖、验收与降级方案" }
]);

export const FLOW_STAGES = Object.freeze([
  { id: "behavior", label: "行为进入" },
  { id: "score", label: "计分" },
  { id: "tier", label: "分层" },
  { id: "gate", label: "准入" },
  { id: "dispatch", label: "派单" },
  { id: "writeback", label: "回写" }
]);

const ROLE_TASK_TEAMS = Object.freeze({
  strategy: null,
  agent: ["agent"],
  learning: ["learning", "learning-intervention", "learning-planning", "after-sales"],
  sales: ["sales"]
});

const viewModules = new Map([
  ["dashboard", dashboardView],
  ["users", usersView],
  ["scoring", scoringView]
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
  return ROLES.some((item) => item.id === role) ? role : "strategy";
}

export function visibleItems(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
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

function roleTaskCount(state, role) {
  const activeTasks = (state.tasks ?? []).filter((task) => !["done", "closed", "cancelled"].includes(task.status));
  const teams = ROLE_TASK_TEAMS[role];
  return teams === null ? activeTasks.length : activeTasks.filter((task) => teams.includes(task.assigneeTeam)).length;
}

function currentRole() {
  return validRole(app?.store.getState().ui?.role);
}

export function ensureVisibleView(viewId, role) {
  return visibleItems(role).some((item) => item.id === viewId) ? viewId : visibleItems(role)[0].id;
}

function renderSidebar() {
  const role = currentRole();
  const state = app.store.getState();
  const taskCount = roleTaskCount(state, role);
  const links = visibleItems(role).map((item) => {
    const isCurrent = item.id === app.currentView;
    const count = item.id === "tasks" && taskCount > 0
      ? `<span class="nav-count" aria-label="${taskCount}个待处理任务">${taskCount}</span>`
      : "";
    return `<a class="nav-item${isCurrent ? " is-current" : ""}" href="#${escapeAttribute(item.id)}"${isCurrent ? ' aria-current="page"' : ""}>${icon(item.icon, { className: "nav-item__icon" })}<span>${escapeHtml(item.label)}</span>${count}</a>`;
  }).join("");

  app.sidebar.innerHTML = `<div class="sidebar__header"><a class="brand" href="#dashboard" aria-label="R线策略中台总控台"><span class="brand__mark" aria-hidden="true">R</span><span class="brand__text"><strong>R线策略中台</strong><small>策略运营工作台</small></span></a>${iconButton({ icon: "x", label: "关闭导航", id: "navCloseButton", className: "sidebar__close" })}</div><nav class="nav-list" aria-label="工作台视图">${links}</nav><div class="sidebar__foot"><strong>演示视图</strong><span>${escapeHtml(ROLES.find((item) => item.id === role)?.label)}</span><small>仅切换信息范围，不代表真实安全权限。</small></div>`;
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
  const role = currentRole();
  const stage = itemFor(app.currentView).stage;
  const permission = ROLES.find((item) => item.id === role)?.permission || "仅用于模拟信息范围";
  const options = ROLES.map((item) => `<option value="${item.id}"${item.id === role ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("");

  app.topbar.innerHTML = `<div class="topbar__flow">${iconButton({ icon: "menu", label: "打开导航", id: "navMenuButton", className: "menu-button", controls: "appSidebar", expanded: document.body.classList.contains("nav-open") })}${renderFlowRail(stage)}</div><div class="topbar__tools">${iconButton({ icon: "undo-2", label: "撤销最近一次更改", id: "undoButton", disabled: (state.history?.length ?? 0) === 0 })}<label class="role-switch" for="roleSelect"><span>演示视图</span><select id="roleSelect" aria-describedby="roleHint">${options}</select></label><span id="roleHint" class="role-hint">${escapeHtml(permission)}</span></div>`;
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
    app.viewRoot.innerHTML = `<section class="page-header"><div><p class="section-kicker">视图异常</p><h1>${escapeHtml(item.label)}</h1><p>该视图暂时无法加载。</p></div>${renderBadge("danger", "加载失败")}</section>`;
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
      if (store.undo()) toast("已撤销最近一次数据变更。", "success");
      else toast("没有可撤销的数据变更。", "info");
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLSelectElement ? event.target : null;
    if (target?.id !== "roleSelect") return;
    const nextRole = validRole(target.value);
    const nextView = ensureVisibleView(app.currentView, nextRole);
    const viewChanged = nextView !== app.currentView;
    store.update((state) => ({ ...state, ui: { ...(state.ui ?? {}), role: nextRole } }));
    if (viewChanged) {
      toast("已切换到该演示角色可见的默认视图。", "info");
      navigate(nextView);
    } else {
      queueMicrotask(() => document.getElementById("roleSelect")?.focus());
    }
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
