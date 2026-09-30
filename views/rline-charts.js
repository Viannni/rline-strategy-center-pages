import { escapeHtml } from "../ui/components.js";

const WIDTH = 640;
const HEIGHT = 270;
const PADDING = { top: 18, right: 18, bottom: 42, left: 48 };

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function displayNumber(value, decimals = 0, unit = "") {
  const result = numeric(value);
  if (result === null) return "-";
  return `${result.toFixed(decimals)}${unit}`;
}

function scale(value, min, max, start, end) {
  const range = max - min || 1;
  return start + ((value - min) / range) * (end - start);
}

function xPosition(index, count, start, end) {
  if (count <= 1) return (start + end) / 2;
  return start + (index / (count - 1)) * (end - start);
}

function chartBounds(values, yMin, yMax) {
  const usable = values.map(numeric).filter((value) => value !== null);
  const inferredMax = usable.length ? Math.max(...usable) : 1;
  const max = numeric(yMax) ?? (inferredMax <= 10 ? 10 : Math.ceil(inferredMax / 10) * 10);
  const min = numeric(yMin) ?? 0;
  return { min, max: max <= min ? min + 1 : max };
}

function renderGrid(labels, min, max, plotBottom, plotTop, plotLeft, plotRight, unit, decimals) {
  const rows = 4;
  const parts = [];
  for (let index = 0; index <= rows; index += 1) {
    const value = min + ((max - min) * index) / rows;
    const y = scale(value, min, max, plotBottom, plotTop);
    parts.push(`<line x1="${plotLeft}" y1="${y.toFixed(2)}" x2="${plotRight}" y2="${y.toFixed(2)}" class="rline-chart-gridline" />`);
    parts.push(`<text x="${plotLeft - 9}" y="${(y + 4).toFixed(2)}" text-anchor="end" class="rline-chart-axis">${escapeHtml(displayNumber(value, decimals, unit))}</text>`);
  }
  labels.forEach((label, index) => {
    const x = xPosition(index, labels.length, plotLeft, plotRight);
    parts.push(`<text x="${x.toFixed(2)}" y="${plotBottom + 24}" text-anchor="middle" class="rline-chart-axis">${escapeHtml(label)}</text>`);
  });
  return parts.join("");
}

function pathFor(data, labels, min, max, plotBottom, plotTop, plotLeft, plotRight) {
  let path = "";
  let segmentOpen = false;
  data.forEach((rawValue, index) => {
    const value = numeric(rawValue);
    if (value === null) {
      segmentOpen = false;
      return;
    }
    const x = xPosition(index, labels.length, plotLeft, plotRight);
    const y = scale(value, min, max, plotBottom, plotTop);
    path += `${segmentOpen ? " L" : " M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    segmentOpen = true;
  });
  return path;
}

function renderLegend(datasets) {
  return `<div class="rline-chart-legend">${datasets.map((dataset) => `<span><i class="${dataset.dashed ? "is-dashed" : ""}" style="--legend-color:${escapeHtml(dataset.color || "#16795a")}"></i>${escapeHtml(dataset.label)}</span>`).join("")}</div>`;
}

function chartCard(title, subtitle, content, datasets, emptyLabel = "") {
  return `<article class="rline-chart-card"><header><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div>${emptyLabel ? `<span class="rline-chart-status">${escapeHtml(emptyLabel)}</span>` : ""}</header>${content}${renderLegend(datasets)}</article>`;
}

export function renderLineChart({ title, subtitle, labels, datasets, yMin = 0, yMax, unit = "", decimals = 0, emptyLabel = "", showValues = false }) {
  const plotLeft = PADDING.left;
  const plotRight = WIDTH - PADDING.right;
  const plotTop = PADDING.top;
  const plotBottom = HEIGHT - PADDING.bottom;
  const values = datasets.flatMap((dataset) => dataset.data || []);
  const bounds = chartBounds(values, yMin, yMax);
  const grid = renderGrid(labels, bounds.min, bounds.max, plotBottom, plotTop, plotLeft, plotRight, unit, decimals);
  const lines = datasets.map((dataset) => {
    const path = pathFor(dataset.data || [], labels, bounds.min, bounds.max, plotBottom, plotTop, plotLeft, plotRight);
    const points = (dataset.data || []).map((rawValue, index) => {
      const value = numeric(rawValue);
      if (value === null) return "";
      const x = xPosition(index, labels.length, plotLeft, plotRight);
      const y = scale(value, bounds.min, bounds.max, plotBottom, plotTop);
      const valueLabel = showValues ? `<text x="${x.toFixed(2)}" y="${(y + (dataset.valueLabelOffset ?? (dataset.dashed ? -12 : 16))).toFixed(2)}" text-anchor="middle" class="rline-chart-value-label${dataset.dashed ? " is-target" : ""}">${escapeHtml(displayNumber(value, decimals, unit))}</text>` : "";
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.5" fill="${escapeHtml(dataset.color || "#16795a")}" class="rline-chart-point"><title>${escapeHtml(dataset.label)} · ${escapeHtml(labels[index])}: ${escapeHtml(displayNumber(value, decimals, unit))}</title></circle>${valueLabel}`;
    }).join("");
    return `${path ? `<path d="${path}" fill="none" stroke="${escapeHtml(dataset.color || "#16795a")}" class="rline-chart-line${dataset.dashed ? " is-dashed" : ""}" />` : ""}${points}`;
  }).join("");
  const svg = `<svg class="rline-chart-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeHtml(title)}"><g>${grid}</g><line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" class="rline-chart-axisline" />${lines}</svg>`;
  return chartCard(title, subtitle, svg, datasets, emptyLabel);
}

export function renderBarChart({ title, subtitle, labels, datasets, yMin = 0, yMax, unit = "", decimals = 0, emptyLabel = "", showValues = false }) {
  const plotLeft = PADDING.left;
  const plotRight = WIDTH - PADDING.right;
  const plotTop = PADDING.top;
  const plotBottom = HEIGHT - PADDING.bottom;
  const values = datasets.flatMap((dataset) => dataset.data || []);
  const bounds = chartBounds(values, yMin, yMax);
  const grid = renderGrid(labels, bounds.min, bounds.max, plotBottom, plotTop, plotLeft, plotRight, unit, decimals);
  const groupWidth = (plotRight - plotLeft) / Math.max(labels.length, 1);
  const totalBarWidth = Math.min(52, groupWidth * 0.72);
  const barWidth = totalBarWidth / Math.max(datasets.length, 1);
  const bars = datasets.map((dataset, datasetIndex) => (dataset.data || []).map((rawValue, index) => {
    const value = numeric(rawValue);
    if (value === null) return "";
    const x = plotLeft + index * groupWidth + (groupWidth - totalBarWidth) / 2 + datasetIndex * barWidth;
    const y = scale(value, bounds.min, bounds.max, plotBottom, plotTop);
    const height = Math.max(plotBottom - y, 1);
    const valueLabel = showValues ? `<text x="${(x + Math.max(barWidth - 3, 2) / 2).toFixed(2)}" y="${Math.max(plotTop + 11, y - 6).toFixed(2)}" text-anchor="middle" class="rline-chart-bar-value">${escapeHtml(displayNumber(value, decimals, unit))}</text>` : "";
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(barWidth - 3, 2).toFixed(2)}" height="${height.toFixed(2)}" rx="3" fill="${escapeHtml(dataset.color || "#16795a")}" class="rline-chart-bar"><title>${escapeHtml(dataset.label)} · ${escapeHtml(labels[index])}: ${escapeHtml(displayNumber(value, decimals, unit))}</title></rect>${valueLabel}`;
  }).join("")).join("");
  const svg = `<svg class="rline-chart-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeHtml(title)}"><g>${grid}</g><line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" class="rline-chart-axisline" />${bars}</svg>`;
  return chartCard(title, subtitle, svg, datasets, emptyLabel);
}
