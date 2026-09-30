import { escapeAttribute, escapeHtml, renderBadge } from "../ui/components.js";
import { renderBarChart } from "./rline-charts.js?v=20260930-integrated";

const STORAGE_KEY = "rline-workbench-renewal-ledger-v1";
const CHANNELS = ["扩科/扩品", "用户召回", "APP部", "其他"];
const IPS = ["Kitty", "Taby", "未拆分"];
const LEVELS = ["R1", "R2"];
const COHORTS = ["1期", "2期", "3期"];

function readRows() {
  try {
    const rows = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}
function saveRows(rows) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch {}
}
function pct(value) { return Number(value || 0) > 0 ? `${Number(value).toFixed(1)}%` : "暂无数据"; }
function options(values, current) { return values.map((item) => `<option value="${escapeAttribute(item)}"${item === current ? " selected" : ""}>${escapeHtml(item)}</option>`).join(""); }
function rowRate(row, field) { const base = Number(row.baseUsers || 0); return base ? Number(row[field] || 0) / base * 100 : null; }
function aggregate(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.channel || "其他";
    const item = map.get(key) || { channel: key, base: 0, reached: 0, converted: 0, refunded: 0 };
    item.base += Number(row.baseUsers || 0); item.reached += Number(row.reached || 0); item.converted += Number(row.converted || 0); item.refunded += Number(row.refunded || 0); map.set(key, item);
  });
  return [...map.values()].map((item) => ({ ...item, reachRate: item.base ? item.reached / item.base * 100 : null, conversionRate: item.base ? item.converted / item.base * 100 : null, refundRate: item.converted ? item.refunded / item.converted * 100 : null }));
}
function field(label, name, value, type = "text", wide = false) { return `<label${wide ? " class=\"is-wide\"" : ""}><span>${label}</span><input name="${name}" type="${type}" value="${escapeAttribute(value ?? "")}"${type === "number" ? " min=\"0\" step=\"1\"" : ""}></label>`; }
function recordCard(row, index) {
  return `<article class="rline-renewal-record" data-renewal-id="${escapeAttribute(row.id)}"><header><div><b>${String(index + 1).padStart(2, "0")}</b><strong>${escapeHtml(row.cohort)} · ${escapeHtml(row.level)} · ${escapeHtml(row.channel)}</strong></div><button type="button" class="rline-text-button" data-renewal-delete>删除</button></header><div class="rline-renewal-record__meta"><span>IP：${escapeHtml(row.ip)}</span><span>基数：${Number(row.baseUsers || 0)}人</span><span>触达：${Number(row.reached || 0)}人</span><span>转化：${Number(row.converted || 0)}人</span><span>退款：${Number(row.refunded || 0)}人</span></div><div class="rline-renewal-record__edit">${field("班期", "cohort", row.cohort)}${field("级别", "level", row.level)}${field("渠道", "channel", row.channel)}${field("内容IP", "ip", row.ip)}${field("用户基数", "baseUsers", row.baseUsers, "number")}${field("触达人数", "reached", row.reached, "number")}${field("转化人数", "converted", row.converted, "number")}${field("退款人数", "refunded", row.refunded, "number")}${field("记录日期", "date", row.date, "date")}</div><div class="rline-renewal-record__result"><span>触达率<strong>${pct(rowRate(row, "reached"))}</strong></span><span>转化率<strong>${pct(rowRate(row, "converted"))}</strong></span><span>转化后退款率<strong>${Number(row.converted || 0) ? pct(rowRate(row, "refunded") * Number(row.baseUsers || 0) / Number(row.converted || 1)) : "暂无数据"}</strong></span></div><button type="button" class="rline-primary-button" data-renewal-save>保存记录</button></article>`;
}

export function renderRenewal() {
  const rows = readRows();
  const aggregates = aggregate(rows);
  const labels = aggregates.length ? aggregates.map((row) => row.channel) : ["暂无数据"];
  const conversionChart = renderBarChart({ title: "各渠道续费转化率", subtitle: "渠道字段与Kitty/Taby内容IP分开记录", labels, datasets: [{ label: "转化率", data: aggregates.length ? aggregates.map((row) => row.conversionRate) : [null], color: "#238a73" }], yMax: 100, unit: "%", decimals: 1, showValues: true, emptyLabel: rows.length ? "" : "等待录入" });
  const scaleChart = renderBarChart({ title: "渠道规模与触达", subtitle: "先看基数，再看触达和转化，避免只看比例", labels, datasets: [{ label: "用户基数", data: aggregates.length ? aggregates.map((row) => row.base) : [null], color: "#4c78c8" }, { label: "触达人数", data: aggregates.length ? aggregates.map((row) => row.reached) : [null], color: "#d59627" }, { label: "转化人数", data: aggregates.length ? aggregates.map((row) => row.converted) : [null], color: "#238a73" }], yMax: Math.max(10, ...aggregates.map((row) => row.base)), unit: "人", decimals: 0, showValues: true, emptyLabel: rows.length ? "" : "等待录入" });
  const summary = aggregates.map((row) => `<article><strong>${escapeHtml(row.channel)}</strong><span>基数 ${row.base}人 · 触达 ${row.reached}人</span><small>转化 ${row.converted}人（${pct(row.conversionRate)}） · 退款 ${row.refunded}人</small></article>`).join("");
  return `<div class="rline-tab-content"><section class="rline-strategy-hero"><div><p class="section-kicker">R线策略工作台 · 续费转化</p><h1>续费转化</h1><p>按班期、级别、渠道和内容IP保存转化证据，为后续月转年和续费策略复盘提供数据底座。</p></div>${renderBadge(rows.length ? "success" : "warning", rows.length ? `${rows.length}条记录` : "待录入")}</section><section class="rline-kpi-grid"><article class="rline-kpi rline-kpi--blue"><span>记录数</span><strong>${rows.length}</strong><small>按日期留存</small></article><article class="rline-kpi rline-kpi--teal"><span>用户基数</span><strong>${rows.reduce((sum, row) => sum + Number(row.baseUsers || 0), 0)}</strong><small>已录入用户</small></article><article class="rline-kpi rline-kpi--green"><span>转化人数</span><strong>${rows.reduce((sum, row) => sum + Number(row.converted || 0), 0)}</strong><small>需和销售口径核对</small></article><article class="rline-kpi rline-kpi--coral"><span>退款人数</span><strong>${rows.reduce((sum, row) => sum + Number(row.refunded || 0), 0)}</strong><small>用于转化质量判断</small></article></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">转化数据分析</p><h2>渠道规模、触达与转化</h2></div>${renderBadge("info", "渠道维度")}</header><div class="rline-chart-grid rline-report-chart-grid">${scaleChart}${conversionChart}</div><div class="rline-renewal-summary">${summary || "<p>录入转化数据后，按渠道自动汇总。</p>"}</div></section><section class="panel rline-section"><header class="panel__header"><div><p class="section-kicker">转化数据台账</p><h2>新增、修改、删除续费记录</h2><p>Kitty/Taby只作为内容IP字段；渠道请填写扩科/扩品、用户召回、APP部等来源。</p></div></header><form class="rline-renewal-add" data-renewal-add><div>${field("班期", "cohort", "1期")}${field("级别", "level", "R1")}${field("渠道", "channel", "扩科/扩品")}${field("内容IP", "ip", "未拆分")}${field("用户基数", "baseUsers", "", "number")}${field("触达人数", "reached", "", "number")}${field("转化人数", "converted", "", "number")}${field("退款人数", "refunded", "", "number")}${field("记录日期", "date", new Date().toISOString().slice(0, 10), "date")}</div><button type="submit" class="rline-primary-button">新增转化记录</button></form><div class="rline-renewal-list">${rows.length ? rows.map(recordCard).join("") : `<div class="rline-empty-workflow"><strong>当前还没有续费转化数据</strong><p>先录入一条按班期、级别、渠道、IP拆分的数据，系统才会生成转化图表。</p></div>`}</div></section></div>`;
}

export function bindRenewalActions(container, context, rerender) {
  container.querySelector("[data-renewal-add]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const row = { id: `renewal-${Date.now()}`, cohort: String(data.get("cohort") || "1期"), level: String(data.get("level") || "R1"), channel: String(data.get("channel") || "其他"), ip: String(data.get("ip") || "未拆分"), baseUsers: Number(data.get("baseUsers") || 0), reached: Number(data.get("reached") || 0), converted: Number(data.get("converted") || 0), refunded: Number(data.get("refunded") || 0), date: String(data.get("date") || "") };
    saveRows([row, ...readRows()]); rerender();
  });
  container.querySelectorAll("[data-renewal-delete]").forEach((button) => button.addEventListener("click", () => {
    const id = button.closest("[data-renewal-id]")?.dataset.renewalId;
    if (!id || !window.confirm("确认删除这条续费转化记录吗？")) return;
    saveRows(readRows().filter((row) => row.id !== id)); rerender();
  }));
  container.querySelectorAll("[data-renewal-save]").forEach((button) => button.addEventListener("click", () => {
    const card = button.closest("[data-renewal-id]");
    const id = card?.dataset.renewalId;
    if (!id) return;
    const rows = readRows();
    const current = rows.find((row) => row.id === id);
    if (!current) return;
    const next = { ...current };
    card.querySelectorAll("input[name]").forEach((input) => { next[input.name] = ["baseUsers", "reached", "converted", "refunded"].includes(input.name) ? Number(input.value || 0) : input.value; });
    saveRows(rows.map((row) => row.id === id ? next : row)); rerender();
  }));
}

export { CHANNELS, IPS, LEVELS, COHORTS, STORAGE_KEY };
