import { escapeAttribute, escapeHtml, renderBadge } from "../ui/components.js";

const STORAGE_KEY = "rline-workbench-sop-config-v1";
let activeProgram = "monthly";
let activePane = "framework";

const DEFAULT_CONFIG = {
  monthly: {
    label: "月课SOP",
    purpose: "围绕首周参与、连续学习、深度完课和月转年承接管理月课用户",
    nodes: [
      { id: "m-pre", phase: "承接期", node: "承接当天", goal: "让用户清楚何时学、怎么学", feeling: "被及时接住，知道下一步", actions: ["人工｜承接应答 + 私信", "人工｜APP引导 + 成长档案"], metric: "加V率 / 信息确认率 / 首课参与率", status: "已配置" },
      { id: "m-d1", phase: "行课W1", node: "D1", goal: "完成首课启动，建立学习预期", feeling: "有人陪着开始，不会错过", actions: ["人工｜首日学情反馈", "AI｜开班提醒 + 引导下载APP"], metric: "D1参与率 / 正读占比 / 24:00留存", status: "已配置" },
      { id: "m-d2", phase: "行课W1", node: "D2-D4", goal: "维持常规服务，召回未完成用户", feeling: "形成节奏，知道缺课可以补读", actions: ["AI｜补读提醒", "人工｜连续缺课首联"], metric: "日留存 / 补读回流率 / 深度", status: "验证中" },
      { id: "m-d5", phase: "行课W1", node: "D5", goal: "形成首周反馈，判断是否需要升级动作", feeling: "看到孩子完成了什么，愿意继续", actions: ["人工｜首周反馈", "AI｜完课激励"], metric: "W1留存 / W1深度 / W1完课", status: "验证中" },
      { id: "m-end", phase: "月末", node: "M1W4", goal: "用报告、月测和下一阶段建议承接续费", feeling: "知道孩子成长，也知道下一步买什么", actions: ["人工｜报告解读", "人工｜续费承接"], metric: "报告查看率 / 续费转化率 / 退款率", status: "待协同" }
    ]
  },
  yearly: {
    label: "年课SOP",
    purpose: "围绕月度复盘、成长报告和续费窗口完成长期价值承接",
    nodes: [
      { id: "y-pre", phase: "承接期", node: "承接当天", goal: "明确年课学习路径和服务边界", feeling: "知道长期学习如何被安排", actions: ["人工｜承接应答", "AI｜长期路径说明"], metric: "信息确认率 / 入群率", status: "已配置" },
      { id: "y-w1", phase: "月课W1", node: "首周", goal: "完成首周激活，建立稳定学习习惯", feeling: "前五天有人陪，遇到问题有入口", actions: ["AI｜每日督学", "人工｜首周反馈"], metric: "首周留存 / 首周深度 / 首周完课", status: "验证中" },
      { id: "y-mid", phase: "月课W2-W3", node: "期中", goal: "通过补课、活动和成长反馈降低中途流失", feeling: "看到阶段成果，愿意继续坚持", actions: ["AI｜未完成召回", "人工｜期中复盘"], metric: "连续学习率 / 补读率 / 活动参与率", status: "待协同" },
      { id: "y-end", phase: "月课W4", node: "月末", goal: "完成月度总结并承接下月或升级需求", feeling: "成果被看见，下一步有明确建议", actions: ["人工｜成长报告", "人工｜续费/升级承接"], metric: "报告查看率 / 月转年 / 退款率", status: "待协同" }
    ]
  }
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function readConfig() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (value?.monthly?.nodes && value?.yearly?.nodes) return value;
  } catch {}
  return clone(DEFAULT_CONFIG);
}
function saveConfig(config) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
}
function statusOptions(current) {
  return ["已配置", "验证中", "待协同", "已停用"].map((status) => `<option value="${escapeAttribute(status)}"${status === current ? " selected" : ""}>${escapeHtml(status)}</option>`).join("");
}
function modeLabel(program) { return program === "yearly" ? "年课" : "月课"; }
function actionChips(actions = []) {
  return actions.map((action) => {
    const [kind, text] = String(action).split("｜");
    return `<span class="rline-sop-action-chip"><b>${escapeHtml(kind || "动作")}</b>${escapeHtml(text || action)}</span>`;
  }).join("");
}
function paneNav() {
  return `<div class="rline-strategy-subnav" role="tablist" aria-label="策略设置模块">${[["framework", "流程框架设计"], ["complete", "完整流程设计"], ["sop", "SOP设计"], ["preview", "流程预览"]].map(([id, label]) => `<button type="button" class="rline-strategy-subtab${activePane === id ? " is-current" : ""}" data-sop-pane="${id}" role="tab" aria-selected="${activePane === id}">${label}</button>`).join("")}</div>`;
}
function programSwitch() {
  return `<div class="rline-sop-program-switch" role="tablist" aria-label="课程周期">${[["monthly", "月课SOP"], ["yearly", "年课SOP"]].map(([id, label]) => `<button type="button" class="rline-sop-program${activeProgram === id ? " is-current" : ""}" data-sop-program="${id}" role="tab" aria-selected="${activeProgram === id}">${label}</button>`).join("")}</div>`;
}
function renderFramework(program) {
  const config = readConfig()[program];
  return `<div class="rline-sop-framework"><div class="rline-sop-purpose"><span>当前策略目标</span><strong>${escapeHtml(config.purpose)}</strong></div><div class="rline-sop-flow">${config.nodes.map((node, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(node.phase)}</span><strong>${escapeHtml(node.node)}</strong><p>${escapeHtml(node.goal)}</p><small>${escapeHtml(node.metric)}</small></article>`).join("")}</div></div>`;
}
function renderComplete(program) {
  const config = readConfig()[program];
  return `<div class="rline-sop-matrix"><div class="rline-sop-matrix-row rline-sop-matrix-head"><span>阶段 / 节点</span><span>业务目的</span><span>用户感受</span><span>关键动作</span><span>关键指标</span></div>${config.nodes.map((node, index) => `<div class="rline-sop-matrix-row"><span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(node.phase)} · ${escapeHtml(node.node)}</span><span>${escapeHtml(node.goal)}</span><span>${escapeHtml(node.feeling)}</span><span>${actionChips(node.actions)}</span><span>${escapeHtml(node.metric)}</span></div>`).join("")}</div>`;
}
function sopCard(node, index) {
  return `<article class="rline-sop-card" data-sop-id="${escapeAttribute(node.id)}"><header><div><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(node.phase)} · ${escapeHtml(node.node)}</strong></div><select data-sop-field="status" aria-label="SOP状态">${statusOptions(node.status)}</select></header><div class="rline-sop-card__preview"><p><b>业务目的</b>${escapeHtml(node.goal)}</p><p><b>用户感受</b>${escapeHtml(node.feeling)}</p><div><b>关键动作</b><div class="rline-sop-actions">${actionChips(node.actions)}</div></div><p><b>关键指标</b>${escapeHtml(node.metric)}</p></div><div class="rline-sop-edit"><label><span>阶段</span><input data-sop-field="phase" value="${escapeAttribute(node.phase)}"></label><label><span>节点</span><input data-sop-field="node" value="${escapeAttribute(node.node)}"></label><label class="is-wide"><span>业务目的</span><textarea data-sop-field="goal">${escapeHtml(node.goal)}</textarea></label><label class="is-wide"><span>给用户的感受</span><textarea data-sop-field="feeling">${escapeHtml(node.feeling)}</textarea></label><label class="is-wide"><span>关键动作（一行一个，格式：人工｜动作或AI｜动作）</span><textarea data-sop-field="actions">${escapeHtml(node.actions.join("\n"))}</textarea></label><label class="is-wide"><span>关键指标</span><input data-sop-field="metric" value="${escapeAttribute(node.metric)}"></label></div><div class="rline-sop-card__actions"><button type="button" class="rline-primary-button" data-sop-save>保存节点</button><button type="button" class="rline-danger-button" data-sop-delete>删除节点</button><small data-sop-status>修改后保存，数据留在当前浏览器</small></div></article>`;
}
function renderSop(program) {
  const config = readConfig()[program];
  return `<div class="rline-sop-editor"><div class="rline-sop-grid">${config.nodes.map(sopCard).join("")}</div><form class="rline-sop-add" data-sop-add><strong>新增SOP节点</strong><div><input name="phase" placeholder="阶段，例如：行课W2" required><input name="node" placeholder="节点，例如：D8" required><input name="goal" placeholder="业务目的" required><input name="metric" placeholder="关键指标" required></div><textarea name="feeling" placeholder="给用户的感受"></textarea><textarea name="actions" placeholder="关键动作，一行一个，例如：AI｜连续缺课提醒"></textarea><button type="submit" class="rline-primary-button">新增到${modeLabel(program)}</button></form></div>`;
}
function renderPreview(program) {
  const config = readConfig()[program];
  return `<div class="rline-sop-preview"><div class="rline-sop-preview__rail"></div>${config.nodes.map((node, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><div><span>${escapeHtml(node.phase)} · ${escapeHtml(node.node)}</span><strong>${escapeHtml(node.goal)}</strong><p>用户感受：${escapeHtml(node.feeling)}</p><div>${actionChips(node.actions)}</div><small>验证指标：${escapeHtml(node.metric)}</small></div></article>`).join("")}</div>`;
}

export function renderStrategySettings() {
  const config = readConfig();
  const current = config[activeProgram];
  const body = activePane === "complete" ? renderComplete(activeProgram) : activePane === "sop" ? renderSop(activeProgram) : activePane === "preview" ? renderPreview(activeProgram) : renderFramework(activeProgram);
  return `<div class="rline-tab-content"><section class="rline-strategy-hero"><div><p class="section-kicker">R线策略工作台 · 策略设置</p><h1>策略设置</h1><p>${escapeHtml(current.purpose)}</p></div><div class="rline-strategy-hero__meta"><strong>${current.nodes.length}</strong><span>个${modeLabel(activeProgram)}节点</span>${renderBadge("info", "可编辑")}</div></section>${programSwitch()}${paneNav()}<section class="panel rline-section rline-strategy-panel"><header class="panel__header"><div><p class="section-kicker">${escapeHtml(current.label)}</p><h2>${escapeHtml(activePane === "framework" ? "流程框架" : activePane === "complete" ? "完整流程矩阵" : activePane === "sop" ? "SOP节点台账" : "流程预览")}</h2><p>${activePane === "sop" ? "每个节点都要同时写清业务目的、用户感受、关键动作和关键指标。" : "策略配置直接沉淀到后续周报、效果分析和项目推进。"}</p></div>${renderBadge("success", "领导视角")}</header>${body}</section></div>`;
}

export function bindStrategyActions(container, context, rerender) {
  container.querySelectorAll("[data-sop-program]").forEach((button) => button.addEventListener("click", () => { activeProgram = button.dataset.sopProgram; rerender(); }));
  container.querySelectorAll("[data-sop-pane]").forEach((button) => button.addEventListener("click", () => { activePane = button.dataset.sopPane; rerender(); }));
  container.querySelectorAll("[data-sop-save]").forEach((button) => button.addEventListener("click", () => {
    const card = button.closest("[data-sop-id]");
    const id = card?.dataset.sopId;
    const config = readConfig();
    const current = config[activeProgram].nodes.find((node) => node.id === id);
    if (!current) return;
    const readField = (field) => card.querySelector(`[data-sop-field="${field}"]`)?.value ?? current[field];
    current.phase = readField("phase");
    current.node = readField("node");
    current.goal = readField("goal");
    current.feeling = readField("feeling");
    current.actions = readField("actions").split("\n").map((item) => item.trim()).filter(Boolean);
    current.metric = readField("metric");
    current.status = readField("status");
    saveConfig(config);
    rerender();
  }));
  container.querySelectorAll("[data-sop-delete]").forEach((button) => button.addEventListener("click", () => {
    const id = button.closest("[data-sop-id]")?.dataset.sopId;
    if (!id || !window.confirm("确认删除这个SOP节点吗？删除后可重新新增，但不会自动恢复。")) return;
    const config = readConfig();
    config[activeProgram].nodes = config[activeProgram].nodes.filter((node) => node.id !== id);
    saveConfig(config);
    rerender();
  }));
  container.querySelector("[data-sop-add]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const config = readConfig();
    config[activeProgram].nodes.push({ id: `sop-${activeProgram}-${Date.now()}`, phase: String(data.get("phase") || ""), node: String(data.get("node") || ""), goal: String(data.get("goal") || ""), feeling: String(data.get("feeling") || ""), actions: String(data.get("actions") || "").split("\n").map((item) => item.trim()).filter(Boolean), metric: String(data.get("metric") || ""), status: "待协同" });
    saveConfig(config);
    rerender();
  });
}
