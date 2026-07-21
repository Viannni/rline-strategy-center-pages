import { TASK_RULES } from "../data/rules.js";
import { FEATURE_PLACEMENTS } from "../data/system-capabilities.js";

const hasText = (value, pattern) => pattern.test(String(value ?? ""));

function isRenewalWindow(user) {
  return TASK_RULES.renewalWindows[user.productType]?.includes(user.stageCode) ?? false;
}

function isAfterSalesIssue(user) {
  return hasText(user.risk?.type, /退款|投诉/) || hasText(user.issueType, /refund|complaint/);
}

function isLearningInterventionIssue(user) {
  return (user.learning?.consecutiveMissedDays ?? 0) > 0 || hasText(user.issueType, /learning-decline/);
}

function isPlanningIssue(user) {
  return hasText(user.issueType, /report-interpretation|difficulty|time/);
}

function isTemplateIssue(user) {
  return hasText(user.issueType, /template-question/);
}

function taskDetails(user, scoreResult, renewal) {
  const isRisk = scoreResult.hLevel === "H4";
  const transactionPriority = scoreResult.transactionSignal?.priority ?? "P2";
  const couponUnused = user.transaction?.couponUnused === true || user.transaction?.status === "coupon-unused";

  if (isRisk && isAfterSalesIssue(user)) {
    return { taskCategory: "repair", taskSubtype: "退款投诉", priority: scoreResult.risk?.fused ? "P0" : "P1", repairSubteam: "after-sales", isRisk: true };
  }
  if (isRisk && isPlanningIssue(user)) {
    return { taskCategory: "repair", taskSubtype: "难度/时间问题", priority: "P1", repairSubteam: "learning-planning", isRisk: true };
  }
  if (isRisk || isLearningInterventionIssue(user)) {
    return { taskCategory: "repair", taskSubtype: "连续漏学", priority: "P1", repairSubteam: "learning-intervention", isRisk };
  }
  if (renewal && transactionPriority === "P0") {
    return { taskCategory: "conversion", taskSubtype: "F14待付款/支付失败", priority: "P0", repairSubteam: null, isRisk: false };
  }
  if (renewal && transactionPriority === "P1" && couponUnused) {
    return { taskCategory: "conversion", taskSubtype: "领券未用", priority: "P1", repairSubteam: null, isRisk: false };
  }
  if (isTemplateIssue(user)) {
    return { taskCategory: "outcome", taskSubtype: "模板答疑", priority: "P2", repairSubteam: null, isRisk: false };
  }
  if (isPlanningIssue(user)) {
    return { taskCategory: "outcome", taskSubtype: "报告解读", priority: "P1", repairSubteam: null, isRisk: false };
  }
  if (scoreResult.hLevel === "H1") {
    return { taskCategory: "conversion", taskSubtype: "H1高优转化", priority: "P1", repairSubteam: null, isRisk: false };
  }
  if (scoreResult.hLevel === "H3") {
    return { taskCategory: "outcome", taskSubtype: "H3提分活动", priority: "P1", repairSubteam: null, isRisk: false };
  }
  return { taskCategory: "outcome", taskSubtype: "H2证据补强", priority: "P2", repairSubteam: null, isRisk: false };
}

function chooseChannel(user, detail) {
  const feedback = user.taskFeedback ?? {};
  const phoneRequested = user.parent?.preferredChannel === "phone" || user.marketing?.events?.includes("appointment");
  const unresolvedText = feedback.replyStatus === "unresolved";
  const highDensityExplanation = hasText(feedback.nextAction, /电话|高密度|复杂/);
  const complexLearning = detail.repairSubteam === "learning-planning";

  if (detail.isRisk || complexLearning || unresolvedText || phoneRequested || highDensityExplanation) return "phone";
  return TASK_RULES.defaultChannel;
}

function repairSupport(detail) {
  if (!detail.repairSubteam) return { supportTeam: null, supportSubteam: null };
  return { supportTeam: "learning", supportSubteam: detail.repairSubteam };
}

export function evaluateTouchGate(user, taskType) {
  const touch = user.touch ?? {};
  const exceptionReason = typeof touch.exceptionReason === "string" ? touch.exceptionReason.trim() : "";
  const exceptionApplied = taskType === "P0" && touch.p0Exception === true && exceptionReason.length > 0;
  if (exceptionApplied) {
    return { status: "eligible", reason: exceptionReason, exceptionApplied: true, supervisorVisible: true };
  }

  if (touch.channelLimit === true || touch.channelHardLimit === true) {
    return { status: "blocked", reason: "渠道硬上限", exceptionApplied: false, supervisorVisible: false };
  }

  const globalLimit = touch.globalLimit7d ?? TASK_RULES.touchGate.parentGlobalLimit7d;
  if (touch.status === "blocked" || (Number.isFinite(touch.total7d) && touch.total7d >= globalLimit)) {
    return { status: "blocked", reason: touch.reason ?? "家长全局频控", exceptionApplied: false, supervisorVisible: false };
  }
  if (touch.status === "queued") {
    return { status: "queued", reason: touch.reason ?? "家长全局频控等待窗口", exceptionApplied: false, supervisorVisible: false };
  }
  return { status: "eligible", reason: touch.reason ?? "未命中触达限制", exceptionApplied: false, supervisorVisible: false };
}

export function getPlacement(featureId) {
  const placement = FEATURE_PLACEMENTS.find((item) => item.id === featureId);
  return placement ? structuredClone(placement) : null;
}

export function routeUser(user, scoreResult) {
  const renewal = isRenewalWindow(user);
  const detail = taskDetails(user, scoreResult, renewal);
  const touchGate = evaluateTouchGate(user, detail.priority);
  const channel = chooseChannel(user, detail);
  const support = repairSupport(detail);
  const team = renewal ? "sales" : isTemplateIssue(user) && !detail.isRisk ? "agent" : "learning";
  const subteam = renewal ? "renewal" : team === "agent" ? "guidance" : detail.repairSubteam ?? "learning-planning";
  const bindingMode = TASK_RULES.routing.teams[team].bindingMode;
  const placementId = TASK_RULES.routing.placements[channel];
  const slaHours = TASK_RULES.routing.slaHours[detail.priority];
  const lifecycle = `${user.productType ?? "unknown"}:${user.stageCode ?? "unknown"}`;

  return {
    team,
    subteam,
    bindingMode,
    ...support,
    channel,
    taskCategory: detail.taskCategory,
    taskSubtype: detail.taskSubtype,
    priority: detail.priority,
    slaHours,
    hLevel: scoreResult.hLevel,
    touchGate,
    placementId,
    trace: [
      { label: "风险", value: scoreResult.hLevel === "H4" ? scoreResult.risk?.fused ? "风险熔断" : "风险修复" : "无风险熔断", decision: detail.isRisk ? "优先进入修复判断" : "继续生命周期判断" },
      { label: "生命周期", value: lifecycle, decision: renewal ? "续费窗口由绑定二销承接前台沟通" : "非续费窗口进入无绑定队列判断" },
      { label: "H层级/F14", value: `${scoreResult.hLevel}/${scoreResult.transactionSignal?.priority ?? "P2"}`, decision: `${detail.priority} ${detail.taskCategory}` },
      { label: "问题类型", value: user.issueType ?? "未标注", decision: detail.taskSubtype },
      { label: "F12触达准入", value: touchGate.status, decision: touchGate.reason },
      { label: "渠道", value: channel, decision: channel === "phone" ? "命中电话条件" : "默认文字" },
      { label: "团队/SLA", value: `${team}/${subteam}/${slaHours}h`, decision: touchGate.status === "blocked" ? "保留路由并阻断触达" : "进入任务队列" }
    ]
  };
}
