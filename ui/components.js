import {
  CAPABILITY_STATUSES,
  FEATURE_PLACEMENTS,
  SYSTEM_CAPABILITIES
} from "../data/system-capabilities.js";
import { icon, iconButton, refreshIcons } from "./icons.js";

const STATUS_PRESENTATION = Object.freeze({
  "confirmed-reusable": { icon: "circle-check", tone: "success" },
  "entry-confirmed": { icon: "circle-help", tone: "info" },
  "needs-adaptation": { icon: "wrench", tone: "warning" },
  "must-add": { icon: "circle-plus", tone: "danger" },
  degradable: { icon: "shield-check", tone: "neutral" },
  success: { icon: "circle-check", tone: "success", label: "已完成" },
  warning: { icon: "triangle-alert", tone: "warning", label: "需关注" },
  danger: { icon: "circle-alert", tone: "danger", label: "异常" },
  info: { icon: "info", tone: "info", label: "提示" },
  neutral: { icon: "circle", tone: "neutral", label: "普通" }
});

const OWNER_BY_CAPABILITY = Object.freeze({
  marketing: "活动产品 / 数据",
  "crm-tags": "CRM产品 / 数据",
  "crm-segments": "CRM产品 / 权限管理员",
  "sales-ops": "销售产品 / 学服运营",
  "crm-workbench": "CRM产品 / 学服运营",
  education: "教务产品 / 数据",
  tickets: "售后产品 / 学服主管",
  "call-center": "外呼产品 / 销售运营",
  "front-card": "前台产品 / 运营",
  "ai-platform": "AI平台 / 产品",
  analytics: "数据产品 / 策略",
  "rules-engine": "数据平台 / 策略产品"
});

const ACCEPTANCE_BY_FEATURE = Object.freeze({
  "activity-uplift": "活动结果可按用户ID、活动ID和时间回写并触发重算",
  "simple-segmentation": "H层级与风险标签可检索、圈选并标明刷新时间",
  "complex-segmentation": "组合条件可复现且分群结果可追溯",
  "task-queue": "三类角色可见触发原因、SLA、动作和结构化回写",
  "touch-feedback": "F11/F16回写字段完整并可触发下一步动作",
  "learning-data": "F02-F09口径、时间窗和缺失状态可追溯",
  "risk-fuse": "风险命中后销售任务停止，解除有权限和操作记录",
  "phone-task": "电话派发、接通结果与全局频控可按用户关联",
  "front-entry": "曝光、点击、兑换事件可按用户和生命周期回传",
  "ai-assist": "输出包含置信度、解释和人工复核状态",
  "review-dashboard": "H迁移、任务、活动和支付可下钻到用户快照",
  "scoring-routing": "每次计分、分层、路由和快照可逐项解释",
  "routing-policy": "F12准入、角色派单、SLA与回写形成完整轨迹"
});

let layerSequence = 0;
let activeLayer = null;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function formatDisplayValue(value, fallback = "无") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function safeClass(value) {
  return String(value ?? "")
    .split(/\s+/)
    .filter((part) => /^[a-zA-Z0-9_-]+$/.test(part))
    .join(" ");
}

function valueAt(row, key) {
  if (typeof key === "function") return key(row);
  return String(key ?? "").split(".").reduce((value, part) => value?.[part], row);
}

export function renderBadge(status, label = "") {
  const metadata = CAPABILITY_STATUSES[status];
  const presentation = STATUS_PRESENTATION[status] ?? STATUS_PRESENTATION.neutral;
  const text = label || metadata?.label || presentation.label || status || "未标记";
  return `<span class="badge badge--${presentation.tone}">${icon(presentation.icon)}<span>${escapeHtml(text)}</span></span>`;
}

export function renderTable(columnsOrConfig, rowsArgument = [], optionsArgument = {}) {
  const config = Array.isArray(columnsOrConfig)
    ? { columns: columnsOrConfig, rows: rowsArgument, ...optionsArgument }
    : (columnsOrConfig ?? {});
  const columns = Array.isArray(config.columns) ? config.columns : [];
  const rows = Array.isArray(config.rows) ? config.rows : [];
  const caption = config.caption ? `<caption>${escapeHtml(config.caption)}</caption>` : "";
  const emptyText = config.emptyText || "暂无数据";
  const headers = columns.map((column) => (
    `<th scope="col" class="${safeClass(column.className)}">${escapeHtml(column.label ?? column.key)}</th>`
  )).join("");

  const body = rows.length
    ? rows.map((row, rowIndex) => {
      const rowId = row?.id ?? rowIndex;
      const cells = columns.map((column) => {
        const raw = valueAt(row, column.key);
        const formatted = typeof column.format === "function" ? column.format(raw, row) : raw;
        const content = typeof column.trustedHtml === "function"
          ? String(column.trustedHtml(formatted, row) ?? "")
          : column.type === "badge"
            ? renderBadge(formatted?.status ?? formatted, formatted?.label ?? "")
            : escapeHtml(formatted ?? column.empty ?? "-");
        return `<td data-label="${escapeAttribute(column.label ?? column.key)}" class="${safeClass(column.className)}">${content}</td>`;
      }).join("");
      return `<tr data-row-id="${escapeAttribute(rowId)}">${cells}</tr>`;
    }).join("")
    : `<tr><td class="table-empty" colspan="${Math.max(columns.length, 1)}">${escapeHtml(emptyText)}</td></tr>`;

  return `<div class="table-scroll"><table class="data-table">${caption}<thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function downloadFile({ content, filename, type = "application/octet-stream" } = {}) {
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof Blob === "undefined") return false;
  const blob = new Blob([content ?? ""], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = String(filename || "rline-export");
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export function dialogContract() {
  return Object.freeze({
    initialFocus: "title",
    trapTab: true,
    closeOnEscape: true,
    closeOnOverlay: true,
    restoreTrigger: true
  });
}

function renderEvidenceList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="evidence-empty">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function evidenceField(label, content, className = "") {
  return `<div class="placement-field ${safeClass(className)}"><dt>${escapeHtml(label)}</dt><dd>${content}</dd></div>`;
}

export function renderPlacementPanel(featureId) {
  const placement = FEATURE_PLACEMENTS.find((item) => item.id === featureId);
  if (!placement) {
    return `<section class="placement-panel placement-panel--empty" aria-label="产研落位"><h2>产研落位</h2><p>未找到“${escapeHtml(featureId)}”的落位证据。</p></section>`;
  }

  const capability = SYSTEM_CAPABILITIES.find((item) => item.id === placement.capabilityId);
  const status = CAPABILITY_STATUSES[placement.status];
  const owner = OWNER_BY_CAPABILITY[placement.capabilityId] || "产品 / 数据负责人待确认";
  const acceptance = ACCEPTANCE_BY_FEATURE[placement.id] || "入口、字段、状态与结果均可按用户追溯";
  const additions = [
    ...(placement.status === "must-add" ? [placement.feature] : []),
    ...(Array.isArray(placement.additions) ? placement.additions : []),
    ...(Array.isArray(capability?.additions) ? capability.additions : [])
  ];

  const fields = [
    evidenceField("现有系统", escapeHtml(capability?.name || "待确认")),
    evidenceField("路径", `<code>${escapeHtml(capability?.path || "待确认")}</code>`),
    evidenceField("状态", renderBadge(placement.status, status?.label || placement.status)),
    evidenceField("已有能力", renderEvidenceList(capability?.existing, "尚无已确认字段"), "placement-field--wide"),
    evidenceField("可复用", renderEvidenceList(capability?.reuse, "暂无直接复用项"), "placement-field--wide"),
    evidenceField("需要改造", renderEvidenceList(capability?.changes, "无需额外改造"), "placement-field--wide"),
    evidenceField("待核对/能力缺口", renderEvidenceList(capability?.gaps, "无待核对能力缺口"), "placement-field--wide"),
    evidenceField("必须新增", renderEvidenceList(additions, "无已确认必须新增项"), "placement-field--wide"),
    evidenceField("依赖", escapeHtml(placement.dependency || "无")),
    evidenceField("负责人", escapeHtml(owner)),
    evidenceField("验收", escapeHtml(acceptance), "placement-field--wide"),
    evidenceField("降级", escapeHtml(placement.fallback || capability?.fallback || "无"), "placement-field--wide")
  ].join("");

  return `<section class="placement-panel" aria-labelledby="placement-${escapeAttribute(placement.id)}"><header class="placement-panel__header"><div><p class="section-kicker">产研落位</p><h2 id="placement-${escapeAttribute(placement.id)}">${escapeHtml(placement.feature)}</h2></div>${renderBadge(placement.status, status?.label || placement.status)}</header><dl class="placement-grid">${fields}</dl></section>`;
}

function focusableElements(container) {
  return [...container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

function openLayer(kind, options = {}) {
  if (typeof document === "undefined") return () => {};
  const root = document.getElementById(kind === "drawer" ? "drawerRoot" : "modalRoot");
  if (!root) return () => {};

  const previousFocus = activeLayer?.restoreTarget ?? document.activeElement;
  activeLayer?.close({ restoreFocus: false });
  const sequence = ++layerSequence;
  const titleId = `${kind}-title-${sequence}`;
  // Structured component markup must opt into this explicit trust boundary.
  const body = options.trustedHtml != null
    ? String(options.trustedHtml)
    : `<p>${escapeHtml(options.content || "")}</p>`;
  const closeLabel = kind === "drawer" ? "关闭抽屉" : "关闭弹窗";
  const widthClass = options.size ? ` overlay-panel--${safeClass(options.size)}` : "";

  root.innerHTML = `<div class="overlay-layer overlay-layer--${kind}" data-layer="${kind}"><div class="overlay-layer__backdrop" data-overlay-close></div><section class="overlay-panel${widthClass}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1"><header class="overlay-panel__header"><h2 id="${titleId}" tabindex="-1">${escapeHtml(options.title || "详情")}</h2>${iconButton({ icon: "x", label: closeLabel, className: "overlay-close" })}</header><div class="overlay-panel__body">${body}</div></section></div>`;

  const layer = root.firstElementChild;
  const panel = layer.querySelector(".overlay-panel");
  const closeButton = layer.querySelector(".overlay-close");
  const shell = document.querySelector(".app-shell");
  const shellWasInert = Boolean(shell?.inert);
  const shellAriaHidden = shell?.getAttribute("aria-hidden");
  let closed = false;

  const close = ({ restoreFocus = true } = {}) => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown);
    root.replaceChildren();
    document.body.classList.remove("layer-open");
    if (shell) {
      shell.inert = shellWasInert;
      if (shellAriaHidden === null) shell.removeAttribute("aria-hidden");
      else shell.setAttribute("aria-hidden", shellAriaHidden);
    }
    if (activeLayer?.sequence === sequence) activeLayer = null;
    if (restoreFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    options.onClose?.();
  };

  const onKeydown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = focusableElements(panel);
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!panel.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  layer.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-overlay-close], .overlay-close")) close();
  });
  document.addEventListener("keydown", onKeydown);
  document.body.classList.add("layer-open");
  if (shell) {
    shell.inert = true;
    shell.setAttribute("aria-hidden", "true");
  }
  activeLayer = { close, restoreTarget: previousFocus, sequence };
  refreshIcons();
  queueMicrotask(() => (panel.querySelector("[autofocus]") || panel.querySelector("h2") || closeButton || panel).focus());
  return close;
}

export function openDrawer(options) {
  return openLayer("drawer", options);
}

export function openModal(options) {
  return openLayer("modal", options);
}

export function toast(message, tone = "info", timeout = 3200) {
  if (typeof document === "undefined") return null;
  const root = document.getElementById("toastRoot");
  if (!root) return null;

  const presentation = STATUS_PRESENTATION[tone] ?? STATUS_PRESENTATION.info;
  const item = document.createElement("div");
  item.className = `toast toast--${presentation.tone}`;
  item.setAttribute("role", tone === "danger" ? "alert" : "status");
  const mark = document.createElement("span");
  mark.className = "toast__mark";
  mark.innerHTML = icon(presentation.icon);
  const text = document.createElement("span");
  text.textContent = String(message ?? "");
  item.append(mark, text);
  root.append(item);
  refreshIcons();

  const remove = () => item.remove();
  window.setTimeout(remove, Math.max(1000, Number(timeout) || 3200));
  return remove;
}

export function renderMetricStrip(items = []) {
  return `<dl class="metric-strip">${items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd><small>${escapeHtml(item.hint || "")}</small></div>`).join("")}</dl>`;
}

export function renderStrategyCard(asset = {}) {
  const target = asset.target || {};
  const lines = Array.isArray(target.businessLines) ? target.businessLines.join(" / ") : "全线";
  const scopeLabel = asset.reusable ? "全线复用" : "单线配置";
  const lifecycleNodes = Array.isArray(target.lifecycleNodes) && target.lifecycleNodes.length
    ? target.lifecycleNodes.join(" / ")
    : "-";
  const dataDependencies = Array.isArray(asset.dataDependencies) && asset.dataDependencies.length
    ? asset.dataDependencies.join(" / ")
    : "-";
  const statusLabel = asset.status === "online" ? "已上线" : asset.status || "未标记";
  const statusTone = asset.status === "online" ? "success" : asset.status === "offline" ? "danger" : "neutral";
  return `<article class="strategy-card" data-strategy-id="${escapeAttribute(asset.id)}"><header><p class="section-kicker">${escapeHtml(asset.id || "")}</p><h3>${escapeHtml(asset.name || "未命名策略")}</h3><div>${renderBadge("info", scopeLabel)}${renderBadge(statusTone, statusLabel)}</div></header><dl><div><dt>业务线</dt><dd>${escapeHtml(lines)}</dd></div><div><dt>生命周期节点</dt><dd>${escapeHtml(lifecycleNodes)}</dd></div><div><dt>负责人</dt><dd>${escapeHtml(asset.ownerRole || "-")}</dd></div><div><dt>动作</dt><dd>${escapeHtml(asset.action || "-")}</dd></div><div><dt>数据依赖</dt><dd>${escapeHtml(dataDependencies)}</dd></div><div><dt>观察窗口</dt><dd>${escapeHtml(asset.observationWindow || "-")}</dd></div></dl></article>`;
}

export { iconButton } from "./icons.js";
