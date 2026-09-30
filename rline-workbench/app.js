import * as rlineDailyView from "./modules/views/rline-daily.js?v=20260930-month-sop";
import { RLINE_DAILY_SNAPSHOT } from "./modules/data/rline-daily-data.js?v=20260923-full-analysis";
import { enrichRlineComparisonSnapshot } from "./modules/data/rline-cohort-comparison.js?v=20260923-full-analysis";
import { mergeLiveSnapshot, validateLivePayload } from "./modules/live-data.js";
import { loadArchiveEntries, loadQAEntries, saveArchiveEntries, saveQAEntries } from "./modules/rline-input-store.js?v=20260929-input-qa";

const LIVE_SNAPSHOT_URL = "./data/rline-live-snapshot.json";
const LIVE_REFRESH_INTERVAL_MS = 60_000;
const REPORT_DRAFT_STORAGE_KEY = "rline-workbench-report-drafts-v1";
const PROJECT_STORAGE_KEY = "rline-workbench-projects-v1";
const SOURCE_FETCH_WINDOWS = [
  { sourceTime: "12:00", fetchTime: "12:30", minute: 12 * 60 + 30 },
  { sourceTime: "14:00", fetchTime: "14:30", minute: 14 * 60 + 30 },
  { sourceTime: "18:00", fetchTime: "18:30", minute: 18 * 60 + 30 },
  { sourceTime: "24:00", fetchTime: "次日00:30", minute: 24 * 60 + 30 }
];

const root = document.getElementById("rlineRoot");
const liveStatus = document.getElementById("rlineLiveStatus");
const syncPlan = document.getElementById("rlineSyncPlan");
const refreshButton = document.getElementById("rlineRefreshButton");

const initialParams = new URLSearchParams(window.location.search);
const hasExplicitBiFilters = initialParams.has("biStage") || initialParams.has("biCohort");
let activeTab = initialParams.get("tab") || "daily";
let selectedCohortId = initialParams.get("cohort") || "all";
let selectedDate = initialParams.get("date") || "";
let selectedBiStage = initialParams.get("biStage") || "all";
let selectedBiCohortId = initialParams.get("biCohort") || "all";
let selectedTrendLevels = initialParams.get("trendLevels")?.split(",").filter(Boolean) || [];
let selectedTrendCohorts = initialParams.get("trendCohorts")?.split(",").filter(Boolean) || [];
let snapshot = enrichRlineComparisonSnapshot(RLINE_DAILY_SNAPSHOT);
let isRefreshing = false;

function loadReportDrafts() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(REPORT_DRAFT_STORAGE_KEY) || "{}");
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

let reportDrafts = loadReportDrafts();

function loadProjectItems() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) || "null");
    return Array.isArray(stored) && stored.length ? stored : [...(rlineDailyView.DEFAULT_PROJECTS || [])];
  } catch {
    return [...(rlineDailyView.DEFAULT_PROJECTS || [])];
  }
}

let projectItems = loadProjectItems();
let inputArchives = loadArchiveEntries();
let qaEntries = loadQAEntries();

function persistProjectItems(items) {
  projectItems = Array.isArray(items) ? items : projectItems;
  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectItems));
  } catch {
    // The project ledger stays usable even when browser storage is unavailable.
  }
}

function persistInputArchives(entries) {
  inputArchives = Array.isArray(entries) ? entries : inputArchives;
  saveArchiveEntries(inputArchives);
}

function persistQAEntries(entries) {
  qaEntries = Array.isArray(entries) ? entries : qaEntries;
  saveQAEntries(qaEntries);
}

function persistReportDrafts() {
  try {
    window.localStorage.setItem(REPORT_DRAFT_STORAGE_KEY, JSON.stringify(reportDrafts));
  } catch {
    // Editing should remain usable when browser storage is unavailable.
  }
}

function applyDefaultBiFilter(payload) {
  if (hasExplicitBiFilters) return;
  const cohort = payload.bi?.cohorts?.find((item) => item.status === "行课中") || payload.bi?.cohorts?.[0];
  if (!cohort) return;
  selectedBiStage = cohort.level || "all";
  selectedBiCohortId = cohort.cohortId || "all";
}

function formatTime(value) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function setLiveStatus(label, state = "pending", detail = "") {
  if (!liveStatus) return;
  liveStatus.textContent = label;
  liveStatus.dataset.state = state;
  liveStatus.title = detail || label;
}

function nextSourceFetchLabel(now = new Date()) {
  const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const next = SOURCE_FETCH_WINDOWS.find((window) => minute < window.minute);
  if (!next) return "12:30";
  if (next.fetchTime === "次日00:30") return next.fetchTime;
  if (next.fetchTime === "12:30" && minute >= 24 * 60) return "12:30";
  return next.fetchTime;
}

function updateSyncPlan(payload) {
  if (!syncPlan) return;
  const sourceSync = payload?.sourceSync || {};
  const planned = sourceSync.plannedFetchTimes?.join(" / ") || "12:30 / 14:30 / 18:30 / 次日00:30";
  const next = nextSourceFetchLabel();
  const blocked = sourceSync.status === "source-automation-blocked";
  syncPlan.textContent = `源表节点后30分钟：${planned} · 下次${next} · 本地快照每60秒检查`;
  syncPlan.dataset.state = blocked ? "blocked" : "ready";
  const refreshHint = blocked
    ? `${sourceSync.message || "钉钉源表自动读取尚未接通"} 当前页面只会每60秒检查本地快照文件，不会直接抓取钉钉源表或BI页面。`
    : "源表按关键节点结束后30分钟抓取，工作台每60秒检查本地快照文件。";
  syncPlan.title = refreshHint;
  if (refreshButton) refreshButton.title = refreshHint;
}

function storeReportDraft({ cohortId, date, rows }) {
  const key = `${cohortId || "all"}::${date || snapshot.current.date}`;
  const entries = Object.entries(rows || {}).filter(([label, text]) => typeof label === "string" && typeof text === "string");
  if (entries.length === 0) delete reportDrafts[key];
  else reportDrafts[key] = { rows: Object.fromEntries(entries), updatedAt: new Date().toISOString() };
  persistReportDrafts();
}

function renderWorkbench() {
  if (!root) return;
  rlineDailyView.render(root, {
    state: { rlineDailyWorkbench: snapshot },
    routeParams: { tab: activeTab },
    onTabChange: (nextTab) => {
      activeTab = nextTab;
      const params = new URLSearchParams(window.location.search);
      params.set("tab", nextTab);
      params.set("cohort", selectedCohortId);
      if (selectedDate) params.set("date", selectedDate);
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    },
    selectedCohortId,
    selectedDate,
    selectedBiStage,
    selectedBiCohortId,
    selectedTrendLevels,
    selectedTrendCohorts,
    reportDrafts,
    projects: projectItems,
    inputArchives,
    qaEntries,
    onArchivesChange: (entries) => {
      persistInputArchives(entries);
      renderWorkbench();
    },
    onQAChange: (entries) => {
      persistQAEntries(entries);
      renderWorkbench();
    },
    onProjectsChange: (items) => {
      persistProjectItems(items);
      renderWorkbench();
    },
    onCohortChange: (nextCohortId) => {
      selectedCohortId = nextCohortId;
      selectedDate = "";
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);
      params.set("cohort", selectedCohortId);
      params.delete("date");
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    },
    onDateChange: (nextDate) => {
      selectedDate = nextDate;
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);
      params.set("cohort", selectedCohortId);
      params.set("date", selectedDate);
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    },
    onBiFilterChange: ({ stage, cohortId }) => {
      selectedBiStage = stage;
      selectedBiCohortId = cohortId;
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);
      params.set("cohort", selectedCohortId);
      if (selectedDate) params.set("date", selectedDate);
      params.set("biStage", selectedBiStage);
      params.set("biCohort", selectedBiCohortId);
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    },
    onTrendFilterChange: ({ levels, cohorts }) => {
      selectedTrendLevels = Array.isArray(levels) ? levels : [];
      selectedTrendCohorts = Array.isArray(cohorts) ? cohorts : [];
      const params = new URLSearchParams(window.location.search);
      params.set("tab", activeTab);
      params.set("cohort", selectedCohortId);
      if (selectedDate) params.set("date", selectedDate);
      if (selectedTrendLevels.length) params.set("trendLevels", selectedTrendLevels.join(","));
      else params.delete("trendLevels");
      if (selectedTrendCohorts.length) params.set("trendCohorts", selectedTrendCohorts.join(","));
      else params.delete("trendCohorts");
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    },
    onReportDraftChange: (draft) => storeReportDraft(draft),
    onReportSave: (draft) => storeReportDraft(draft),
    onReportReset: ({ cohortId, date }) => {
      delete reportDrafts[`${cohortId || "all"}::${date || snapshot.current.date}`];
      persistReportDrafts();
    }
  });
}

async function refreshSnapshot({ silent = false } = {}) {
  if (isRefreshing) return;
  isRefreshing = true;
  if (refreshButton) refreshButton.disabled = true;
  if (!silent) setLiveStatus("正在刷新", "pending");
  try {
    const previousCapturedAt = snapshot.snapshotCapturedAt || snapshot.generatedAt;
    const response = await fetch(`${LIVE_SNAPSHOT_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`数据源返回 ${response.status}`);
    const payload = await response.json();
    if (!validateLivePayload(payload)) throw new Error("实时快照格式不完整");
    applyDefaultBiFilter(payload);
    snapshot = enrichRlineComparisonSnapshot(mergeLiveSnapshot(RLINE_DAILY_SNAPSHOT, payload));
    renderWorkbench();
    updateSyncPlan(payload);
    const capturedAt = payload.snapshotCapturedAt || payload.generatedAt;
    const sourceSync = payload.sourceSync || {};
    const sourceState = sourceSync.status === "source-automation-blocked" ? "源表自动抓取未接通" : "源表已接入";
    const snapshotState = capturedAt !== previousCapturedAt ? "快照已更新" : "快照未更新";
    setLiveStatus(`${snapshotState} · ${formatTime(capturedAt)}`, sourceSync.status === "source-automation-blocked" ? "pending" : "live", `${sourceState}；${sourceSync.message || "工作台每60秒检查本地快照"}`);
  } catch (error) {
    setLiveStatus("使用上次数据", "error", error instanceof Error ? error.message : String(error));
  } finally {
    isRefreshing = false;
    if (refreshButton) refreshButton.disabled = false;
  }
}

if (root) {
  renderWorkbench();
  refreshButton?.addEventListener("click", () => refreshSnapshot());
  refreshSnapshot();
  window.setInterval(() => refreshSnapshot({ silent: true }), LIVE_REFRESH_INTERVAL_MS);
}
