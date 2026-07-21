import { escapeAttribute, escapeHtml, openDrawer, renderBadge, renderPlacementPanel } from "../ui/components.js";

export const SCHOLARSHIP_POLICY = Object.freeze({
  countsTowardBaseScore: false,
  annualRedemptionCap: 200,
  perRedemptionCap: 50,
  expiredCouponReturn: "scholarship-account",
  scholarshipBalanceExpires: false,
  policyStatus: "可配置讨论值，非正式政策"
});

export function buildOperationAssets() {
  return [
    { id: "monthly-challenge", scope: "月课 T0-T21", source: "IN_APP", name: "连续学习挑战", rhythm: "T0-T21 分段触发", scoreField: "F10", clickField: "-", resultField: "F10", action: "有效参与和完成事件自动入分", placementId: "activity-uplift" },
    { id: "monthly-external", scope: "月课阶段", source: "MANUAL", name: "外部直播/人工活动", rhythm: "按运营排期", scoreField: "复盘，不进F10", clickField: "-", resultField: "复盘明细", action: "保留活动效果，不进入自动评分", placementId: "activity-uplift" },
    { id: "annual-dense", scope: "年课 M1-M8", source: "IN_APP", name: "持续学习价值活动", rhythm: "密集 earning", scoreField: "F10", clickField: "-", resultField: "F10", action: "学习挑战、测评和亲子共看里程碑产生端内结果", placementId: "activity-uplift" },
    { id: "annual-makeup", scope: "年课 M8-M12", source: "IN_APP", name: "补学与虚拟装扮活动", rhythm: "稀疏补做", scoreField: "F10", clickField: "-", resultField: "F10", action: "面向后段补学和虚拟装扮，不挤占续费提示节点", placementId: "front-entry" },
    { id: "scholarship", scope: "年课 M1-M12", source: "独立资产", name: "奖学金账户", rhythm: "M1-M8 密集获得；M8-M12 稀疏补做", scoreField: "不进入基础分", clickField: "F13", resultField: "F14", action: "兑换点击形成营销意向；券、订单和支付结果进入交易状态", placementId: "front-entry" }
  ];
}

const renewalPrompts = ["月课 T22", "月课 T24", "月课 T27", "年课 M8", "年课 M9", "年课 M12"];

function openAsset(asset) {
  const scholarship = asset.id === "scholarship";
  const policy = scholarship ? `<section class="drawer-section"><header><h3>奖学金规则</h3><span>${escapeHtml(SCHOLARSHIP_POLICY.policyStatus)}</span></header><dl class="field-detail"><div><dt>年度可兑上限</dt><dd>最多 ${SCHOLARSHIP_POLICY.annualRedemptionCap} 单位 / ¥${SCHOLARSHIP_POLICY.annualRedemptionCap}</dd></div><div><dt>单次兑换上限</dt><dd>最多 ${SCHOLARSHIP_POLICY.perRedemptionCap} 单位 / ¥${SCHOLARSHIP_POLICY.perRedemptionCap}</dd></div><div><dt>券状态</dt><dd>未使用或过期券返回奖学金账户；账户余额本身不失效</dd></div><div><dt>共同里程碑</dt><dd>家长与孩子共同查看学习报告、测评和兑换成果</dd></div></dl></section>` : "";
  openDrawer({ title: `${asset.name} 运营落位`, size: "wide", trustedHtml: `<section class="field-detail"><div><dt>适用范围</dt><dd>${escapeHtml(asset.scope)}</dd></div><div><dt>执行方式</dt><dd>${renderBadge(asset.source === "IN_APP" ? "success" : asset.source === "MANUAL" ? "warning" : "info", asset.source)}</dd></div><div><dt>自动计分</dt><dd>${escapeHtml(asset.scoreField)}</dd></div><div><dt>点击 / 结果</dt><dd>${escapeHtml(`${asset.clickField} / ${asset.resultField}`)}</dd></div><div><dt>规则</dt><dd>${escapeHtml(asset.action)}</dd></div><div><dt>节奏</dt><dd>${escapeHtml(asset.rhythm)}</dd></div></section>${policy}${renderPlacementPanel(asset.placementId)}` });
}

function renderAssets(assets, scope) {
  return `<section class="operation-band"><header><div><h2>${scope}</h2><p>IN_APP 与 MANUAL 严格分流；仅端内结果可进入 F10 自动评分。</p></div></header><div class="operation-grid">${assets.map((asset) => `<button type="button" class="operation-item" data-operation-asset="${escapeAttribute(asset.id)}"><span>${renderBadge(asset.source === "IN_APP" ? "success" : asset.source === "MANUAL" ? "warning" : "info", asset.source)}</span><strong>${escapeHtml(asset.name)}</strong><small>${escapeHtml(asset.scope)}</small><em>${escapeHtml(asset.scoreField)}</em></button>`).join("")}</div></section>`;
}

export function render(container) {
  const assets = buildOperationAssets();
  container.innerHTML = `<section class="page-header"><div><p class="section-kicker">运营提分与独立资产</p><h1>提分运营</h1><p>端内活动为 F10 自动评分输入；奖学金是可见的持续学习资产，单独记录营销与交易信号。</p></div>${renderBadge("warning", SCHOLARSHIP_POLICY.policyStatus)}</section><section class="reference-notice"><strong>固定续费提示</strong><span>${escapeHtml(renewalPrompts.join(" / "))}。金额、额度和规则均为可配置讨论值，不代表线上政策。</span></section>${renderAssets(assets.filter((asset) => asset.scope.startsWith("月课")), "月课运营规则")}${renderAssets(assets.filter((asset) => asset.scope.startsWith("年课")), "年课运营规则")}`;
  container.querySelectorAll("[data-operation-asset]").forEach((button) => button.addEventListener("click", () => {
    const asset = assets.find((item) => item.id === button.dataset.operationAsset);
    if (asset) openAsset(asset);
  }));
}
