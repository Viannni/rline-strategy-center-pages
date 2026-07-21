const SAFE_ICON = /^[a-z0-9-]+$/;
const SAFE_CLASS = /^[a-zA-Z0-9_ -]*$/;

function escape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function icon(name, { className = "", label = "" } = {}) {
  if (!SAFE_ICON.test(String(name))) return "";
  const safeClass = SAFE_CLASS.test(className) ? className.trim() : "";
  const accessibility = label
    ? `role="img" aria-label="${escape(label)}"`
    : 'aria-hidden="true"';
  return `<i data-lucide="${name}"${safeClass ? ` class="${safeClass}"` : ""} ${accessibility}></i>`;
}

export function iconButton({
  icon: iconName,
  label,
  text = "",
  id = "",
  className = "",
  type = "button",
  disabled = false,
  pressed = null,
  controls = "",
  expanded = null
} = {}) {
  const safeLabel = escape(label || text || "操作");
  const safeClass = SAFE_CLASS.test(className) ? className.trim() : "";
  const safeType = ["button", "submit", "reset"].includes(type) ? type : "button";
  const safeId = id ? ` id="${escape(id)}"` : "";
  const pressedAttribute = typeof pressed === "boolean" ? ` aria-pressed="${pressed}"` : "";
  const controlsAttribute = controls ? ` aria-controls="${escape(controls)}"` : "";
  const expandedAttribute = typeof expanded === "boolean" ? ` aria-expanded="${expanded}"` : "";
  const disabledAttribute = disabled ? " disabled" : "";
  const visibleText = text
    ? `<span class="icon-button__text">${escape(text)}</span>`
    : `<span class="icon-button__fallback">${safeLabel}</span>`;

  return `<button${safeId} class="icon-button${safeClass ? ` ${safeClass}` : ""}" type="${safeType}" aria-label="${safeLabel}" title="${safeLabel}"${pressedAttribute}${controlsAttribute}${expandedAttribute}${disabledAttribute}>${icon(iconName)}${visibleText}</button>`;
}

export function refreshIcons() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof window.lucide?.createIcons !== "function") return false;

  try {
    window.lucide.createIcons();
    document.documentElement.classList.add("icons-ready");
    return true;
  } catch {
    document.documentElement.classList.remove("icons-ready");
    return false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", refreshIcons, { once: true });
}
