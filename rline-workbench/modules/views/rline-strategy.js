import { escapeAttribute, escapeHtml, renderBadge } from "../ui/components.js";

const STORAGE_KEY = "rline-workbench-sop-config-v2";
const MONTHLY_SOP_SOURCE_URL = "https://alidocs.dingtalk.com/i/nodes/QG53mjyd80RMX42QtwNGDR0XV6zbX04v?utm_scene=team_space&iframeQuery=sheet_range%3Dst-95edbe21-33666_0_0_1_1";
const COMPLETION_SOP_SOURCE_URL = "https://alidocs.dingtalk.com/i/nodes/lyQod3RxJK3KbwD2ildPgRpwJkb4Mw9r?utm_scene=team_space&iframeQuery=sheet_range%3Dkgqie6hm_9_3_1_1";
let activeProgram = "monthly";
let activePane = "framework";

const DEFAULT_CONFIG = {
  monthly: {
    label: "月课SOP",
    purpose: "以日常学习节奏和首月完课活动双线协同：先激活、再维持、再召回，最终形成月度成长与续费承接。",
    nodes: [
      { id: "m-onboard", track: "operations", phase: "加人期", node: "添加微信后—开课前", goal: "完成服务承接、APP下载、课程理念和活动预热", feeling: "知道谁服务、何时开课、怎么开始", actions: ["私聊｜添加微信后欢迎与班班介绍", "朋友圈｜欢迎语、APP下载和功能介绍", "私聊｜26个字母导读与跟读引导", "朋友圈 / 私聊｜活动通知和开课前完课提醒"], metric: "加V率 / APP下载率 / 信息确认率 / 首课参与率", status: "已配置", source: "运营SOP·加人期" },
      { id: "m-w1-d1", track: "operations", phase: "W1", node: "D1｜08:00 / 09:30 / 12:00 / 18:00 / 20:00", goal: "完成首课启动，建立学习入口和首日督学节奏", feeling: "开课不慌，有明确入口和陪伴", actions: ["动态SOP｜R1、R2早签资料", "朋友圈｜APP下载、功能介绍与本月活动露出", "Quicker｜18:00督学", "动态SOP｜20:00当日未完成督学"], metric: "D1参与率 / 正读占比 / 24:00留存", status: "已配置", source: "运营SOP·WEEK1" },
      { id: "m-w1-d2d4", track: "operations", phase: "W1", node: "D2-D4｜08:00 / 12:00 / 16:00或18:00 / 20:00", goal: "把首日参与转为连续学习，尽早召回昨日未完成用户", feeling: "完成会被看见；缺课也有补读入口", actions: ["动态SOP｜R1、R2早签资料", "朋友圈｜昨日完成表彰、产品价值或功能介绍", "动态SOP｜18:00昨日未完成补读提醒", "动态SOP｜20:00当日未完成督学"], metric: "D2-D4留存 / 补读回流率 / 深度", status: "已配置", source: "运营SOP·WEEK1" },
      { id: "m-w1-d5d7", track: "operations", phase: "W1", node: "D5-D7｜D5日终督学；D6-D7周总结与补读", goal: "完成首周工作日收口与周末分层回访，推动未完成用户补齐", feeling: "被总结、被认可，缺课有清晰补读路径", actions: ["朋友圈 / Quicker｜昨日完成表彰、补读方式、课程价值", "动态SOP｜当日未完成督学及当周至少缺1节用户补读提醒", "动态SOP｜R1、R2当周总结资料", "动态SOP｜按本周完课/缺课标签发下周总结"], metric: "W1留存 / W1深度 / W1完课 / 周末补读回流", status: "验证中", source: "运营SOP·WEEK1" },
      { id: "m-w2-d1d5", track: "operations", phase: "W2", node: "D1-D5｜08:00 / 12:00 / 19:00 / 20:00", goal: "稳定第二周学习节奏，用表彰和分层督学防止连续缺课扩大", feeling: "每天有反馈、有节奏，不会被落下", actions: ["动态SOP / 朋友圈｜R1、R2早签", "朋友圈｜上周全勤或昨日完课表彰", "动态SOP｜19:00 R1/R2当日未完成督学 + 日总结", "动态SOP｜20:00当日未完成督学"], metric: "W2日留存 / 连续学习率 / 当日补读率", status: "已配置", source: "运营SOP·WEEK2" },
      { id: "m-w2-d6d7", track: "operations", phase: "W2", node: "D6-D7｜周总结、补读与下周预告", goal: "周末回看第二周完成情况，为下一周维持学习预期", feeling: "有阶段反馈，也有下周继续学习的理由", actions: ["朋友圈｜按标签发周总结与个性化日常", "动态SOP｜本周未全部完成用户补读提醒", "动态SOP｜R1、R2按本周完课/缺课标签发下周总结", "朋友圈｜催读相关内容"], metric: "W2留存 / 周末补读回流 / 连续学习率", status: "验证中", source: "运营SOP·WEEK2" },
      { id: "m-w3-d1d2", track: "operations", phase: "W3", node: "D1-D2｜08:00 / 10:00 / 14:00 / 18:00 / 20:00", goal: "用早期之星表彰与直播预告强化第三周参与动机", feeling: "完成被看见，活动值得期待", actions: ["朋友圈｜上周/昨日完课与早期之星表彰", "动态SOP / Quicker｜R1、R2私发当日学习资料", "朋友圈 / Quicker｜直播预告", "动态SOP｜20:00当日未完成催读"], metric: "W3留存 / 表彰触达后回流 / 直播预约率", status: "已配置", source: "运营SOP·WEEK3" },
      { id: "m-w3-d3d4", track: "operations", phase: "W3", node: "D3-D4｜直播预约与参与提醒", goal: "完成直播预约、到场提醒与学习节奏维持", feeling: "活动参与有明确提醒，学习不停档", actions: ["动态SOP / 朋友圈｜直播预约与预约海报", "朋友圈 / 动态SOP｜直播提醒与18:30参与提醒", "朋友圈｜昨日完课表彰", "Quicker / 动态SOP｜当日未完成催读"], metric: "直播预约率 / 到场率 / W3留存", status: "待协同", source: "运营SOP·WEEK3" },
      { id: "m-w3-d5d7", track: "operations", phase: "W3", node: "D5-D7｜月测、缺读提醒、周总结与下周预告", goal: "通过月测、缺读提醒和周总结形成可见的阶段成果", feeling: "看得见成长，有动力补齐进度", actions: ["动态SOP｜月测链接与R1/R2学习资料", "朋友圈｜月测提醒、昨日完课表彰", "Quicker｜当周至少缺1节用户缺读提醒", "动态SOP / 朋友圈｜周总结、补读提醒和下周预告"], metric: "月测点击率 / W3完课 / 周末补读率", status: "待协同", source: "运营SOP·WEEK3" },
      { id: "m-w4-d1d5", track: "operations", phase: "W4", node: "D1-D5｜08:00 / 12:00 / 16:00或18:00 / 20:00", goal: "保持月末工作日学习节奏，避免最后一周缺课扩大", feeling: "坚持到最后一周仍被持续陪伴和肯定", actions: ["动态SOP｜R1、R2早签资料与20:00督学", "朋友圈｜昨日/上周完成表彰、英语学习方法或学科理念", "Quicker｜昨日未完成补读提醒", "动态SOP｜当日未完成督学"], metric: "W4日留存 / 缺课增量 / 补读回流率", status: "已配置", source: "运营SOP·WEEK4" },
      { id: "m-w4-d6d7", track: "operations", phase: "W4", node: "D6-D7｜周总结、最后补读与下周预告", goal: "完成月末周总结、最后补读与后续承接收口", feeling: "月度成长被看见，下一步很清楚", actions: ["动态SOP｜R1、R2当周总结资料", "动态SOP｜当周至少缺1节用户补读提醒", "动态SOP｜按本周完课/缺课标签发下周总结", "朋友圈｜下周预告"], metric: "W4留存 / 月度完课 / 月末补读率 / 后续承接率", status: "待协同", source: "运营SOP·WEEK4" },
      { id: "a-w1", track: "completion", phase: "活动W1", node: "D1 12:00曝光 → D5 12:00催读", goal: "用首月魔法变装秀建立20节完课目标，并在首周末推动补齐", feeling: "完成一节就有收集感，首周末有明确冲刺理由", actions: ["动态SOP｜首月魔法变装秀曝光", "活动规则｜完课1/5/10/20节依次解锁鞋子、头饰、表情、衣服", "活动规则｜完成3/8/12/15节可获奖学金", "动态SOP｜D5面向本周至少1节未完成用户催读"], metric: "活动曝光率 / W1完课率 / D5补读回流率", status: "已配置", source: "首月完课活动·WEEK1" },
      { id: "a-w2", track: "completion", phase: "活动W2", node: "D1 12:00曝光 → D7 12:00催读", goal: "延续限定装扮挑战，强化完成当周内容的即时奖励", feeling: "离整套皮肤更近一步，值得补齐", actions: ["动态SOP｜限定装扮挑战第二周曝光", "活动规则｜完成本周全部内容解锁表情皮肤碎片与100元奖学金", "动态SOP｜D7面向未完成用户活动催读"], metric: "W2活动触达率 / W2完课率 / D7补读回流率", status: "已配置", source: "首月完课活动·WEEK2" },
      { id: "a-w3", track: "completion", phase: "活动W3", node: "D1 12:00曝光 → D7 12:00催读", goal: "用奖学金终极冲刺承接前三周奖励，放大第三周完课动机", feeling: "阶段成果可以累积，冲刺有实际回报", actions: ["动态SOP｜奖学金终极冲刺第三周曝光", "活动规则｜本周完成解锁100元；完成5节可得300元；前三周累计最高600元", "动态SOP｜D7面向未完成用户强调最后补齐窗口"], metric: "W3活动参与率 / W3完课率 / 奖励领取率", status: "已配置", source: "首月完课活动·WEEK3" },
      { id: "a-w4", track: "completion", phase: "活动W4", node: "D1 12:00曝光 → D7 12:00收口", goal: "完成终极闯关周最后收口，推动主题月20节全部完成", feeling: "距离全套奖励只差最后一步，完成有仪式感", actions: ["动态SOP｜终极闯关周活动曝光", "活动规则｜主题月完成全部20节内容解锁全套星光皮肤", "动态SOP｜D7最后一天面向未完成用户活动催读"], metric: "W4完课率 / 首月20节达成率 / 最后一日补读回流率", status: "已配置", source: "首月完课活动·WEEK4" }
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
function trackLabel(node) {
  return node.track === "completion" ? "首月完课活动" : (node.track === "operations" || (!node.track && activeProgram === "monthly")) ? "月课日常运营" : "年课运营主线";
}
function nodesForTrack(config, track) {
  return (config.nodes || []).filter((node) => (node.track || "operations") === track);
}
function renderMonthlySources() {
  return `<div class="rline-sop-source-board"><article><strong>月课日常运营</strong><p>加人期 + W1-W4：私聊、动态SOP、朋友圈、Quicker和分层督学。</p><a href="${escapeAttribute(MONTHLY_SOP_SOURCE_URL)}" target="_blank" rel="noreferrer">查看运营SOP来源表 ↗</a></article><article><strong>首月完课活动</strong><p>W1-W4：20节完课目标、限定装扮与奖学金阶段激励、未完课催读。</p><a href="${escapeAttribute(COMPLETION_SOP_SOURCE_URL)}" target="_blank" rel="noreferrer">查看首月完课活动来源表 ↗</a></article></div>`;
}
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
  const tracks = program === "monthly"
    ? [["operations", "月课日常运营"], ["completion", "首月完课活动"]]
    : [["yearly", "年课运营主线"]];
  return `<div class="rline-sop-framework"><div class="rline-sop-purpose"><span>当前策略目标</span><strong>${escapeHtml(config.purpose)}</strong></div>${program === "monthly" ? renderMonthlySources() : ""}<div class="rline-sop-track-list">${tracks.map(([track, label]) => { const nodes = nodesForTrack(config, track); return `<section class="rline-sop-track"><header><strong>${label}</strong><span>${nodes.length}个节点</span></header><div class="rline-sop-flow">${nodes.map((node, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(node.phase)}</span><strong>${escapeHtml(node.node)}</strong><p>${escapeHtml(node.goal)}</p><small>${escapeHtml(node.metric)}</small></article>`).join("") || "<p class=\"rline-sop-empty\">暂无节点，可在SOP设计中新增。</p>"}</div></section>`; }).join("")}</div></div>`;
}
function renderComplete(program) {
  const config = readConfig()[program];
  return `${program === "monthly" ? renderMonthlySources() : ""}<div class="rline-sop-matrix"><div class="rline-sop-matrix-row rline-sop-matrix-head"><span>运营轨道 / 阶段</span><span>业务目的</span><span>用户感受</span><span>关键动作</span><span>关键指标</span></div>${config.nodes.map((node, index) => `<div class="rline-sop-matrix-row"><span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(trackLabel(node))}<br>${escapeHtml(node.phase)} · ${escapeHtml(node.node)}</span><span>${escapeHtml(node.goal)}</span><span>${escapeHtml(node.feeling)}</span><span>${actionChips(node.actions)}</span><span>${escapeHtml(node.metric)}</span></div>`).join("")}</div>`;
}
function sopCard(node, index) {
  return `<article class="rline-sop-card" data-sop-id="${escapeAttribute(node.id)}"><header><div><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(trackLabel(node))} · ${escapeHtml(node.phase)} · ${escapeHtml(node.node)}</strong></div><select data-sop-field="status" aria-label="SOP状态">${statusOptions(node.status)}</select></header><div class="rline-sop-card__preview"><p><b>业务目的</b>${escapeHtml(node.goal)}</p><p><b>用户感受</b>${escapeHtml(node.feeling)}</p><div><b>关键动作</b><div class="rline-sop-actions">${actionChips(node.actions)}</div></div><p><b>关键指标</b>${escapeHtml(node.metric)}</p><p><b>来源</b>${escapeHtml(node.source || "手动新增")}</p></div><div class="rline-sop-edit"><label><span>阶段</span><input data-sop-field="phase" value="${escapeAttribute(node.phase)}"></label><label><span>节点</span><input data-sop-field="node" value="${escapeAttribute(node.node)}"></label><label class="is-wide"><span>业务目的</span><textarea data-sop-field="goal">${escapeHtml(node.goal)}</textarea></label><label class="is-wide"><span>给用户的感受</span><textarea data-sop-field="feeling">${escapeHtml(node.feeling)}</textarea></label><label class="is-wide"><span>关键动作（一行一个，格式：人工｜动作或AI｜动作）</span><textarea data-sop-field="actions">${escapeHtml(node.actions.join("\n"))}</textarea></label><label class="is-wide"><span>关键指标</span><input data-sop-field="metric" value="${escapeAttribute(node.metric)}"></label></div><div class="rline-sop-card__actions"><button type="button" class="rline-primary-button" data-sop-save>保存节点</button><button type="button" class="rline-danger-button" data-sop-delete>删除节点</button><small data-sop-status>修改后保存，数据留在当前浏览器</small></div></article>`;
}
function renderSop(program) {
  const config = readConfig()[program];
  return `<div class="rline-sop-editor">${program === "monthly" ? renderMonthlySources() : ""}<div class="rline-sop-grid">${config.nodes.map(sopCard).join("")}</div><form class="rline-sop-add" data-sop-add><strong>新增SOP节点</strong><p>每个节点可保存、修改和删除；来源节点会同步保留在台账中。</p><div><input name="phase" placeholder="阶段，例如：W2" required><input name="node" placeholder="节点，例如：D6-D7" required><input name="goal" placeholder="业务目的" required><input name="metric" placeholder="关键指标" required></div><textarea name="feeling" placeholder="给用户的感受"></textarea><textarea name="actions" placeholder="关键动作，一行一个，例如：动态SOP｜连续缺课提醒"></textarea><button type="submit" class="rline-primary-button">新增到${modeLabel(program)}</button></form></div>`;
}
function renderPreview(program) {
  const config = readConfig()[program];
  return `${program === "monthly" ? renderMonthlySources() : ""}<div class="rline-sop-preview"><div class="rline-sop-preview__rail"></div>${config.nodes.map((node, index) => `<article><b>${String(index + 1).padStart(2, "0")}</b><div><span>${escapeHtml(trackLabel(node))} · ${escapeHtml(node.phase)} · ${escapeHtml(node.node)}</span><strong>${escapeHtml(node.goal)}</strong><p>用户感受：${escapeHtml(node.feeling)}</p><div>${actionChips(node.actions)}</div><small>验证指标：${escapeHtml(node.metric)}</small></div></article>`).join("")}</div>`;
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
