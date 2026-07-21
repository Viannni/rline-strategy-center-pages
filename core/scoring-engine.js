import { H_LEVEL_RULES, SCORING_RULES } from "../data/rules.js";

export function normalize(earned, cap) {
  return cap > 0 ? Math.round((earned / cap) * 100) : null;
}

function bounded(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function item(rule, actual, matched, status = matched ? "matched" : "not-met") {
  return {
    ruleId: rule.id,
    label: rule.label,
    points: matched ? rule.points : 0,
    actual,
    window: rule.window,
    fieldIds: rule.fieldIds,
    status
  };
}

function unavailableItem(rule, actual = null) {
  return item(rule, actual, false, "not-applicable");
}

function trace(ruleId, label, points, actual, window, fieldIds, status) {
  return { ruleId, label, points, actual, window, fieldIds, status };
}

function finalizeDimension(label, earned, cap, items, participates = true) {
  if (!participates) {
    return { label, earned: null, cap: 0, normalized: null, status: "not-participating", items };
  }

  const boundedEarned = bounded(earned, 0, cap);
  return {
    label,
    earned: boundedEarned,
    cap,
    normalized: normalize(boundedEarned, cap),
    status: "scored",
    items
  };
}

function scoreLearningHealth(user, rules, cap) {
  const learning = user.learning ?? {};
  const pointRules = rules.pointRules.learningHealth;
  const completionRate = learning.completionRate;
  const activeDays = learning.activeDays7;
  const missedDays = learning.consecutiveMissedDays;
  const trend = learning.trend7d;
  const items = [
    learning.firstLessonCompleted == null && completionRate == null
      ? unavailableItem(pointRules.firstLesson)
      : item(
        pointRules.firstLesson,
        learning.firstLessonCompleted ?? `completion-rate:${completionRate}`,
        learning.firstLessonCompleted === true || (learning.firstLessonCompleted == null && completionRate >= pointRules.firstLesson.inferredCompletionMinimum)
      ),
    completionRate == null
      ? unavailableItem(pointRules.completionHigh)
      : item(pointRules.completionHigh, completionRate, completionRate >= pointRules.completionHigh.minimum),
    completionRate == null || completionRate >= pointRules.completionHigh.minimum
      ? unavailableItem(pointRules.completionMedium, completionRate)
      : item(pointRules.completionMedium, completionRate, completionRate >= pointRules.completionMedium.minimum),
    activeDays == null
      ? unavailableItem(pointRules.activeSeven)
      : item(pointRules.activeSeven, activeDays, activeDays >= pointRules.activeSeven.minimum),
    activeDays == null || activeDays >= pointRules.activeSeven.minimum
      ? unavailableItem(pointRules.activeThree, activeDays)
      : item(pointRules.activeThree, activeDays, activeDays >= pointRules.activeThree.minimum),
    missedDays == null
      ? unavailableItem(pointRules.missedAtMostOne)
      : item(pointRules.missedAtMostOne, missedDays, missedDays <= pointRules.missedAtMostOne.maximum),
    learning.onTrack == null && completionRate == null
      ? unavailableItem(pointRules.onTrack)
      : item(
        pointRules.onTrack,
        learning.onTrack ?? `completion-rate:${completionRate}`,
        learning.onTrack === true || (learning.onTrack == null && completionRate >= pointRules.onTrack.proxyMinimum)
      ),
    trend == null && activeDays == null
      ? unavailableItem(pointRules.stableTrend)
      : item(
        pointRules.stableTrend,
        trend ?? `active-days:${activeDays}`,
        trend === "stable" || trend === "up" || (trend == null && activeDays >= pointRules.stableTrend.inferredActiveDaysMinimum)
      )
  ];

  return finalizeDimension("学习健康", items.reduce((total, entry) => total + entry.points, 0), cap, items);
}

function scoreCourseExperience(user, rules, cap) {
  const evaluation = user.courseEvaluation;
  const pointRules = rules.pointRules.courseExperience;

  if (evaluation?.normalizedScore == null) {
    return finalizeDimension(
      "课程体验",
      0,
      cap,
      Object.values(pointRules).map((rule) => unavailableItem(rule)),
      false
    );
  }

  const score = evaluation.normalizedScore;
  const matchedRule = Object.values(pointRules).find((rule) => score >= rule.minimum);
  const items = Object.values(pointRules).map((rule) => (
    rule === matchedRule ? item(rule, score, true) : unavailableItem(rule, score)
  ));
  return finalizeDimension("课程体验", matchedRule?.points ?? 0, cap, items);
}

function scoreOutcomes(user, rules, cap) {
  const assessment = user.assessment ?? {};
  const report = user.report ?? {};
  const pointRules = rules.pointRules.outcomes;
  const noAssessment = assessment.status === "not-applicable" || assessment.status == null;
  const noReport = report.status === "not-applicable" || report.status == null;

  if (noAssessment && noReport) {
    return finalizeDimension(
      "成果外化",
      0,
      cap,
      Object.values(pointRules).map((rule) => unavailableItem(rule)),
      false
    );
  }

  const reportGeneratedOnly = report.status === "generated" && !report.opened && !report.shared && !(report.dwellMinutes > 0);
  const items = [
    noAssessment
      ? unavailableItem(pointRules.assessmentCompleted)
      : item(pointRules.assessmentCompleted, assessment.status, assessment.status === "completed"),
    noAssessment || assessment.score == null
      ? unavailableItem(pointRules.assessmentStrong)
      : item(pointRules.assessmentStrong, assessment.score, assessment.score >= pointRules.assessmentStrong.minimum),
    report.status === "generated"
      ? item(pointRules.reportGenerated, "generated", false, "not-scored")
      : unavailableItem(pointRules.reportGenerated, report.status ?? null),
    noReport
      ? unavailableItem(pointRules.reportOpened)
      : item(pointRules.reportOpened, report.opened === true, report.opened === true),
    noReport
      ? unavailableItem(pointRules.reportEngaged)
      : item(
        pointRules.reportEngaged,
        { dwellMinutes: report.dwellMinutes ?? 0, shared: report.shared === true },
        report.opened === true && ((report.dwellMinutes ?? 0) >= pointRules.reportEngaged.minimumDwellMinutes || report.shared === true),
        reportGeneratedOnly ? "not-met" : undefined
      )
  ];

  return finalizeDimension("成果外化", items.reduce((total, entry) => total + entry.points, 0), cap, items);
}

function scoreParentEngagement(user, rules, cap) {
  const parent = user.parent ?? {};
  const feedback = user.taskFeedback ?? {};
  const pointRules = rules.pointRules.parentEngagement;
  const hasParentData = parent.reachable != null || parent.replyStatus != null || parent.replyRate30d != null;
  const submittedFeedback = feedback.contacted === true && feedback.replyStatus === "replied";
  const items = [
    hasParentData
      ? item(pointRules.replied, parent.replyStatus ?? "unknown", parent.replyStatus === "replied")
      : unavailableItem(pointRules.replied),
    hasParentData
      ? item(pointRules.positiveOrNeutral, parent.replyRate30d ?? null, (parent.replyRate30d ?? 0) >= pointRules.positiveOrNeutral.minimumReplyRate)
      : unavailableItem(pointRules.positiveOrNeutral),
    hasParentData
      ? item(
        pointRules.messageOpened,
        parent.messageOpened ?? `reply-rate:${parent.replyRate30d ?? 0}`,
        parent.messageOpened === true || (parent.messageOpened == null && (parent.replyRate30d ?? 0) >= pointRules.messageOpened.inferredReplyRate)
      )
      : unavailableItem(pointRules.messageOpened),
    submittedFeedback
      ? item(pointRules.feedback, feedback.replyStatus, true)
      : item(pointRules.feedback, feedback.replyStatus ?? "not-started", false)
  ];

  return finalizeDimension("家长互动", items.reduce((total, entry) => total + entry.points, 0), cap, items, hasParentData);
}

function scoreFit(user, rules, cap) {
  const pointRules = rules.pointRules.fit;
  const feedback = user.taskFeedback ?? {};
  const fitScore = user.courseFit?.normalizedScore ?? user.courseFit ?? rules.missingScoreDefaults.F03;
  const strongObjection = isStrongObjection(feedback.objectionType);
  const items = [
    item(pointRules.courseFit, fitScore, fitScore >= pointRules.courseFit.defaultScore, fitScore === rules.missingScoreDefaults.F03 ? "defaulted" : undefined),
    item(pointRules.ageGradeFit, fitScore, fitScore >= pointRules.ageGradeFit.minimum),
    item(pointRules.noDifficultyFeedback, feedback.objectionType ?? null, !strongObjection)
  ];

  return finalizeDimension("用户适配", items.reduce((total, entry) => total + entry.points, 0), cap, items);
}

function isStrongObjection(objectionType) {
  return ["difficulty", "time", "price"].includes(objectionType);
}

function calculateRisk(user, rules) {
  const sourceRisk = user.risk ?? {};
  const learning = user.learning ?? {};
  const feedback = user.taskFeedback ?? {};
  const riskRules = rules.pointRules.risk;
  const reasons = [];
  let deduction = sourceRisk.resolved ? 0 : Number(sourceRisk.deduction ?? 0);
  const fused = sourceRisk.fuse === true;

  if (fused) {
    reasons.push({ ruleId: "F15-fuse", label: "风险熔断", points: 0, actual: sourceRisk.type ?? "fuse", window: "实时", fieldIds: ["F15"], status: "matched" });
  }
  if (deduction > 0) {
    reasons.push({ ruleId: "F15-existing-deduction", label: "既有风险扣分", points: -deduction, actual: deduction, window: "实时", fieldIds: ["F15"], status: "matched" });
  }

  if (isStrongObjection(feedback.objectionType)) {
    deduction += riskRules.objectionDeduction;
    reasons.push({
      ruleId: `F16-${feedback.objectionType}-objection`,
      label: "F16强异议转风险扣分",
      points: -riskRules.objectionDeduction,
      actual: feedback.objectionType,
      window: "最近任务",
      fieldIds: ["F16", "F15"],
      status: "matched"
    });
  }

  if (sourceRisk.unresolvedService === true) {
    deduction += riskRules.unresolvedServiceDeduction;
    reasons.push({ ruleId: "F15-unresolved-service", label: "未解决售后问题", points: -riskRules.unresolvedServiceDeduction, actual: true, window: "实时", fieldIds: ["F15"], status: "matched" });
  }

  if (feedback.contacted === true && (user.touch?.total7d ?? 0) >= 5 && feedback.replyStatus !== "replied") {
    deduction += riskRules.noResponseSaturationDeduction;
    reasons.push({ ruleId: "F12-F16-saturated-no-response", label: "已触达且饱和仍无响应", points: -riskRules.noResponseSaturationDeduction, actual: user.touch.total7d, window: "近7天", fieldIds: ["F12", "F16"], status: "matched" });
  }

  if ((learning.consecutiveMissedDays ?? 0) >= 7) {
    deduction += riskRules.missedSevenDaysDeduction;
    reasons.push({ ruleId: "F06-missed-7", label: "连续漏学7天及以上", points: -riskRules.missedSevenDaysDeduction, actual: learning.consecutiveMissedDays, window: "当前", fieldIds: ["F06"], status: "matched" });
  }

  return {
    fused,
    deduction: bounded(deduction, 0, riskRules.maximumDeduction),
    salesFrozen: fused || sourceRisk.salesFrozen === true,
    reasons
  };
}

function marketingSignal(user) {
  const marketing = user.marketing ?? {};
  const events = new Set(marketing.events ?? []);
  let strength = 0;
  const reasons = [];
  const traces = [];
  const add = (condition, points, label, ruleId, actual) => {
    if (condition) {
      strength += points;
      reasons.push(label);
      traces.push(trace(ruleId, label, 0, actual, "实时", ["F13"], "matched"));
    }
  };

  add(events.has("appointment"), 3, "预约规划", "F13-appointment", "appointment");
  add(marketing.renewalQuestion === true || events.has("price-question"), 2, "主动问价/续费", "F13-renewal-question", "renewal-question");
  add(marketing.couponClick === true || events.has("coupon-click"), 1, "点击优惠券", "F13-coupon-click", "coupon-click");
  add(events.has("exposed"), 0, "已曝光", "F13-exposed", "exposed");
  const level = strength >= 5 ? "L3" : strength >= 2 ? "L2" : strength >= 1 ? "L1" : "L0";
  const eligible = marketing.exposureEligible === true && Boolean(marketing.cohortId);

  if (!eligible && reasons.length > 0) {
    reasons.push("缺少同曝光组，不参与横向排名");
    traces.push(trace("F13-not-comparable", "缺少同曝光组，不参与横向排名", 0, marketing.cohortId ?? null, "实时", ["F13"], "not-applicable"));
  }
  return { level, comparable: false, cohortId: eligible ? marketing.cohortId : null, rank: null, strength, reasons, traces };
}

function transactionSignal(user) {
  const transaction = user.transaction ?? {};
  const reasons = [];
  const traces = [];
  let priority = "P2";
  if (transaction.unpaid === true || transaction.paymentFailed === true || ["unpaid", "payment-failed", "pending-payment"].includes(transaction.status)) {
    priority = "P0";
    const label = transaction.paymentFailed ? "支付失败" : "待付款/下单未付";
    reasons.push(label);
    traces.push(trace(transaction.paymentFailed ? "F14-payment-failed" : "F14-unpaid", label, 0, transaction.status ?? null, "实时", ["F14"], "matched"));
  } else if (transaction.couponUnused === true || transaction.status === "coupon-unused") {
    priority = "P1";
    reasons.push("领券未用");
    traces.push(trace("F14-coupon-unused", "领券未用", 0, transaction.status ?? null, "实时", ["F14"], "matched"));
  } else if (transaction.status === "coupon-received") {
    reasons.push("已领券提醒");
    traces.push(trace("F14-coupon-received", "已领券提醒", 0, transaction.status, "实时", ["F14"], "not-scored"));
  } else {
    reasons.push("无交易优先级事件");
    traces.push(trace("F14-no-priority-event", "无交易优先级事件", 0, transaction.status ?? null, "实时", ["F14"], "not-met"));
  }
  return { priority, reasons, traces };
}

function activityResponse(user) {
  const activity = user.activity ?? {};
  if (activity.source !== "IN_APP") return 0;
  if (activity.response === "completed" || activity.response === "attended") return 100;
  if (activity.response === "registered") return 60;
  return 0;
}

function upliftScore(user, dimensions, risk, rules) {
  if (risk.fused || risk.deduction > 0) return 0;
  const upliftRules = rules.pointRules.uplift;
  const learningRepair = 100 - (dimensions.learningHealth.normalized ?? 0);
  const outcomesGap = 100 - (dimensions.outcomes.normalized ?? 0);
  const parentReachability = user.parent?.reachable === true ? Math.round((user.parent.replyRate30d ?? 0) * 100) : 0;
  const score =
    learningRepair * upliftRules.learningRepairWeight +
    outcomesGap * upliftRules.outcomesGapWeight +
    parentReachability * upliftRules.parentReachabilityWeight +
    activityResponse(user) * upliftRules.activityResponseWeight;
  return Math.round(bounded(score, 0, 100));
}

function matchesHCriteria(criteria, metrics) {
  if (criteria.default === true) return true;
  const groups = criteria.anyOf ?? [criteria];
  return groups.some(({ allOf }) => allOf.every(({ metric, operator, value }) => {
    const actual = metrics[metric];
    if (operator === "eq") return actual === value;
    if (operator === "gte") return actual >= value;
    if (operator === "lte") return actual <= value;
    if (operator === "lt") return actual < value;
    return false;
  }));
}

function classifyHLevel({ baseScore, learningHealthNormalized, outcomeNormalized, upliftScore: uplift, risk }, hLevelRules) {
  const metrics = {
    baseScore,
    learningHealthNormalized,
    outcomeNormalized,
    upliftScore: uplift,
    riskFused: risk.fused,
    riskDeduction: risk.deduction,
    negativeFeedback: risk.negativeFeedback
  };
  return hLevelRules.find((rule) => matchesHCriteria(rule.criteria, metrics))?.id ?? hLevelRules.at(-1)?.id ?? "L";
}

function dimensionCap(rules, id) {
  return rules.baseDimensions.find((dimension) => dimension.id === id).cap;
}

export function scoreUser(user, rules = SCORING_RULES, hLevelRules = H_LEVEL_RULES) {
  const dimensions = {
    learningHealth: scoreLearningHealth(user, rules, dimensionCap(rules, "learningHealth")),
    courseExperience: scoreCourseExperience(user, rules, dimensionCap(rules, "courseExperience")),
    outcomes: scoreOutcomes(user, rules, dimensionCap(rules, "outcomes")),
    parentEngagement: scoreParentEngagement(user, rules, dimensionCap(rules, "parentEngagement")),
    fit: scoreFit(user, rules, dimensionCap(rules, "fit"))
  };
  const risk = calculateRisk(user, rules);
  const earned = Object.values(dimensions).reduce((total, dimension) => total + (dimension.earned ?? 0), 0);
  const cap = Object.values(dimensions).reduce((total, dimension) => total + dimension.cap, 0);
  const rawBaseScore = cap === 0 ? 0 : Math.round((earned / cap) * 100);
  const baseScore = bounded(rawBaseScore - risk.deduction, 0, 100);
  const uplift = upliftScore(user, dimensions, risk, rules);
  const hLevel = classifyHLevel({
    baseScore,
    learningHealthNormalized: dimensions.learningHealth.normalized ?? 0,
    outcomeNormalized: dimensions.outcomes.normalized ?? 0,
    upliftScore: uplift,
    risk: { ...risk, negativeFeedback: user.learning?.negativeFeedback === true }
  }, hLevelRules);
  const finalizedRisk = { ...risk, salesFrozen: risk.salesFrozen || hLevel === "H4" };
  const marketing = marketingSignal(user);
  const transaction = transactionSignal(user);
  const reasons = [
    ...Object.values(dimensions).flatMap((dimension) => dimension.items.filter((entry) => entry.status === "matched" || entry.status === "not-scored")),
    ...risk.reasons,
    ...marketing.traces.filter((entry) => entry.status === "matched" || entry.status === "not-scored"),
    ...transaction.traces.filter((entry) => entry.status === "matched" || entry.status === "not-scored"),
    ...(user.activity?.source === "MANUAL" ? [{ ruleId: "F10-manual-review-only", label: "MANUAL活动仅复盘", points: 0, actual: user.activity.activityId ?? null, window: "活动回写", fieldIds: ["F10"], status: "not-scored" }] : []),
    { ruleId: `H-${hLevel}`, label: `分层结果 ${hLevel}`, points: 0, actual: hLevel, window: "当前计算", fieldIds: ["F15"], status: "matched" }
  ];

  return {
    userId: user.id ?? null,
    rawBaseScore,
    baseScore,
    dimensions,
    upliftScore: uplift,
    hLevel,
    marketingSignal: marketing,
    transactionSignal: transaction,
    risk: finalizedRisk,
    reasons
  };
}

export function scoreUsers(users, rules = SCORING_RULES) {
  const scored = users.map((user) => scoreUser(user, rules));
  const cohorts = new Map();
  for (const result of scored) {
    const cohortId = result.marketingSignal.cohortId;
    if (!cohortId) continue;
    const members = cohorts.get(cohortId) ?? [];
    members.push(result);
    cohorts.set(cohortId, members);
  }

  for (const members of cohorts.values()) {
    if (members.length < 2) continue;
    members.sort((left, right) => right.marketingSignal.strength - left.marketingSignal.strength || String(left.userId).localeCompare(String(right.userId)));
    members.forEach((result, index) => {
      result.marketingSignal.comparable = true;
      result.marketingSignal.rank = index + 1;
    });
  }
  return scored;
}
