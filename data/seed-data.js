const baseUser = {
  productType: "monthly",
  stageCode: "T18",
  issueType: "stage-planning",
  learning: { completionRate: 82, activeDays7: 5, consecutiveMissedDays: 0, negativeFeedback: false, observedAt: "2026-07-20" },
  courseEvaluation: { score: 4.6, sourceScale: 5, normalizedScore: 92, validResponses: 2, window: "最近课程节点", source: "course-evaluation" },
  assessment: { status: "completed", score: 82, challengeEligible: true, observedAt: "2026-07-18" },
  report: { status: "opened", opened: true, dwellMinutes: 6, shared: false, generatedAt: "2026-07-18" },
  activity: { source: "IN_APP", activityId: "ACT-RLINE-CHALLENGE-07", type: "challenge", participated: true, response: "completed", observedAt: "2026-07-19" },
  parent: { reachable: true, replyStatus: "replied", replyRate30d: 0.72, preferredChannel: "text" },
  touch: { status: "eligible", reason: "近7日全局触达未超限", parentId: "parent-default", total7d: 1, channels: { text7d: 1, phone7d: 0 }, p0ExemptionReason: null },
  marketing: { exposureEligible: false, cohortId: null, events: [], renewalQuestion: false, couponClick: false },
  transaction: { status: "none", unpaid: false, couponUnused: false, paymentFailed: false, observedAt: null },
  risk: { fuse: false, type: null, deduction: 0, salesFrozen: false, resolved: false },
  taskFeedback: { contacted: false, replyStatus: "not-started", learningConclusion: null, marketingIntent: null, objectionType: null, riskChange: null, nextAction: "待生成任务", nextFollowUpAt: null, finalResult: null }
};

function normalizedCourseEvaluation(overrides) {
  if (overrides === null) return null;

  const evaluation = { ...baseUser.courseEvaluation, ...overrides };
  return {
    ...evaluation,
    normalizedScore: Math.round((evaluation.score / evaluation.sourceScale) * 10000) / 100
  };
}

function createUser(id, childId, overrides = {}) {
  return {
    ...baseUser,
    id,
    childId,
    ...overrides,
    learning: { ...baseUser.learning, ...overrides.learning },
    courseEvaluation: normalizedCourseEvaluation(overrides.courseEvaluation),
    assessment: { ...baseUser.assessment, ...overrides.assessment },
    report: { ...baseUser.report, ...overrides.report },
    activity: { ...baseUser.activity, ...overrides.activity },
    parent: { ...baseUser.parent, ...overrides.parent },
    touch: { ...baseUser.touch, ...overrides.touch, channels: { ...baseUser.touch.channels, ...overrides.touch?.channels } },
    marketing: { ...baseUser.marketing, ...overrides.marketing },
    transaction: { ...baseUser.transaction, ...overrides.transaction },
    risk: { ...baseUser.risk, ...overrides.risk },
    taskFeedback: { ...baseUser.taskFeedback, ...overrides.taskFeedback }
  };
}

const users = [
  createUser("high-base", "child-1001", {
    stageCode: "T24", issueType: "renewal-consultation",
    learning: { completionRate: 96, activeDays7: 7 }, courseEvaluation: { score: 4.9 }, assessment: { score: 94 },
    report: { opened: true, dwellMinutes: 14, shared: true }, parent: { replyRate30d: 0.9 },
    touch: { parentId: "parent-1001" }, taskFeedback: { nextAction: "准备续费学情卡" }
  }),
  createUser("mid-base", "child-1002", {
    stageCode: "T16", issueType: "report-interpretation", learning: { completionRate: 72, activeDays7: 4 },
    courseEvaluation: { score: 4.1 }, assessment: { score: 68 }, report: { dwellMinutes: 3, shared: false },
    parent: { replyRate30d: 0.55 }, touch: { parentId: "parent-1002" }
  }),
  createUser("missing-f07", "child-1003", {
    stageCode: "T12", issueType: "course-experience", courseEvaluation: null,
    learning: { completionRate: 86, activeDays7: 6 }, assessment: { score: 80 }, touch: { parentId: "parent-1003" },
    taskFeedback: { nextAction: "等待有效课程评价，不显示0分" }
  }),
  createUser("high-score-risk", "child-1004", {
    stageCode: "T25", issueType: "refund", learning: { completionRate: 97, activeDays7: 7 }, courseEvaluation: { score: 5 },
    assessment: { score: 96 }, report: { dwellMinutes: 18, shared: true }, risk: { fuse: true, type: "退款", deduction: 30, salesFrozen: true },
    touch: { parentId: "parent-1004" }, taskFeedback: { nextAction: "售后优先处理，销售冻结" }
  }),
  createUser("touch-blocked", "child-1005", {
    stageCode: "T23", issueType: "renewal-consultation", touch: { status: "blocked", reason: "近7日全局触达达到上限", parentId: "parent-1005", total7d: 6, channels: { text7d: 5, phone7d: 1 } },
    taskFeedback: { nextAction: "触达阻断，等待频控窗口" }
  }),
  createUser("marketing-cohort-a-strong", "child-1006", {
    stageCode: "T22", issueType: "renewal-consultation", marketing: { exposureEligible: true, cohortId: "renewal-july-a", events: ["exposed", "coupon-click", "price-question", "appointment"], renewalQuestion: true, couponClick: true },
    touch: { parentId: "parent-1006" }
  }),
  createUser("marketing-cohort-a-light", "child-1007", {
    stageCode: "T22", issueType: "renewal-consultation", marketing: { exposureEligible: true, cohortId: "renewal-july-a", events: ["exposed", "coupon-click"], couponClick: true },
    touch: { parentId: "parent-1007" }
  }),
  createUser("marketing-not-comparable", "child-1008", {
    stageCode: "T22", issueType: "renewal-consultation", marketing: { exposureEligible: false, cohortId: null, events: ["price-question", "appointment"], renewalQuestion: true },
    touch: { parentId: "parent-1008" }, taskFeedback: { nextAction: "保留营销事件，不参与跨用户营销排名" }
  }),
  createUser("annual-renewal-p0", "child-1009", {
    productType: "annual", stageCode: "M9", issueType: "renewal-consultation", learning: { completionRate: 95, activeDays7: 6 },
    courseEvaluation: { score: 4.9 }, assessment: { score: 92 }, report: { dwellMinutes: 15, shared: true },
    transaction: { status: "unpaid", unpaid: true, observedAt: "2026-07-20T09:15:00+08:00" }, touch: { parentId: "parent-1009" },
    taskFeedback: { nextAction: "绑定二销，24小时内跟进" }
  }),
  createUser("p0-outside-renewal-window", "child-1010", {
    productType: "annual", stageCode: "M5", issueType: "stage-planning", transaction: { status: "payment-failed", paymentFailed: true, observedAt: "2026-07-20T08:20:00+08:00" },
    touch: { parentId: "parent-1010" }, taskFeedback: { nextAction: "记录P0事件，非续费窗口不自动派二销" }
  }),
  createUser("h3-uplift", "child-1011", {
    stageCode: "T14", issueType: "learning-decline", learning: { completionRate: 55, activeDays7: 2, consecutiveMissedDays: 2 },
    courseEvaluation: { score: 3.8 }, assessment: { score: 50, challengeEligible: true }, report: { opened: false, status: "generated", dwellMinutes: 0 },
    activity: { source: "IN_APP", activityId: "ACT-RLINE-REVIEW-07", type: "review", participated: true, response: "registered" },
    parent: { reachable: true, replyStatus: "replied", replyRate30d: 0.68 }, touch: { parentId: "parent-1011" },
    taskFeedback: { nextAction: "进入中心化提分池" }
  }),
  createUser("manual-live", "child-1012", {
    stageCode: "T15", issueType: "learning-decline", learning: { completionRate: 58, activeDays7: 2, consecutiveMissedDays: 3 },
    assessment: { score: 52 }, report: { opened: false, status: "generated", dwellMinutes: 0 },
    activity: { source: "MANUAL", activityId: "LIVE-EXTERNAL-202607", type: "external-live", participated: true, response: "attended" },
    touch: { parentId: "parent-1012" }, taskFeedback: { nextAction: "外部直播仅复盘，不混入端内活动自动分" }
  }),
  createUser("report-generated-only", "child-1013", {
    stageCode: "T17", issueType: "report-interpretation", report: { status: "generated", opened: false, dwellMinutes: 0, shared: false },
    touch: { parentId: "parent-1013" }, taskFeedback: { nextAction: "生成报告提醒，不增加成果分" }
  }),
  createUser("template-question", "child-1014", {
    stageCode: "T8", issueType: "template-question", learning: { completionRate: 78, activeDays7: 4 }, touch: { parentId: "parent-1014" },
    taskFeedback: { nextAction: "Agent模板答复，未绑定二销" }
  }),
  createUser("learning-repair", "child-1015", {
    stageCode: "T10", issueType: "learning-decline", learning: { completionRate: 38, activeDays7: 0, consecutiveMissedDays: 7, negativeFeedback: true },
    courseEvaluation: { score: 3.2 }, assessment: { score: 40 }, report: { status: "not-applicable", opened: false, dwellMinutes: 0 },
    parent: { reachable: false, replyStatus: "unreached", replyRate30d: 0.12 }, touch: { parentId: "parent-1015", channels: { text7d: 2, phone7d: 0 } },
    taskFeedback: { nextAction: "学情干预，建议电话说明" }
  }),
  createUser("annual-h2-outcomes", "child-1016", {
    productType: "annual", stageCode: "M7", issueType: "report-interpretation", learning: { completionRate: 69, activeDays7: 4 },
    courseEvaluation: { score: 4.2 }, assessment: { score: 88 }, report: { opened: true, dwellMinutes: 12, shared: true },
    parent: { replyRate30d: 0.64 }, touch: { parentId: "parent-1016" }, taskFeedback: { nextAction: "报告解读和阶段规划" }
  }),
  createUser("coupon-unused", "child-1017", {
    stageCode: "T26", issueType: "renewal-consultation", transaction: { status: "coupon-unused", couponUnused: true, observedAt: "2026-07-19T16:00:00+08:00" },
    marketing: { exposureEligible: true, cohortId: "renewal-july-b", events: ["exposed", "coupon-click"], couponClick: true }, touch: { parentId: "parent-1017" }
  }),
  createUser("difficulty-objection", "child-1018", {
    stageCode: "T13", issueType: "difficulty-objection", learning: { completionRate: 61, activeDays7: 2, consecutiveMissedDays: 4, negativeFeedback: true },
    courseEvaluation: { score: 3.4 }, parent: { replyStatus: "replied", replyRate30d: 0.7 }, touch: { parentId: "parent-1018" },
    taskFeedback: { contacted: true, replyStatus: "replied", learningConclusion: "课程难度不匹配", objectionType: "difficulty", riskChange: "escalated", nextAction: "学情规划电话", nextFollowUpAt: "2026-07-22T10:00:00+08:00" }
  }),
  createUser("annual-m12-h1", "child-1019", {
    productType: "annual", stageCode: "M12", issueType: "renewal-consultation", learning: { completionRate: 93, activeDays7: 7 },
    courseEvaluation: { score: 4.8 }, assessment: { score: 91 }, report: { dwellMinutes: 16, shared: true }, parent: { replyRate30d: 0.88 },
    touch: { parentId: "parent-1019" }, marketing: { exposureEligible: true, cohortId: "annual-m12", events: ["exposed", "appointment"], renewalQuestion: true },
    taskFeedback: { nextAction: "绑定二销续费跟进" }
  }),
  createUser("monthly-t0-onboarding", "child-1020", {
    stageCode: "T0", issueType: "onboarding", assessment: { status: "not-applicable", score: null, challengeEligible: false },
    report: { status: "not-applicable", opened: false, dwellMinutes: 0 }, activity: { source: "IN_APP", activityId: null, type: null, participated: false, response: "not-applicable" },
    touch: { parentId: "parent-1020" }, taskFeedback: { nextAction: "低频新手引导" }
  }),
  createUser("annual-m1-onboarding", "child-1021", {
    productType: "annual", stageCode: "M1", issueType: "onboarding", assessment: { status: "not-applicable", score: null, challengeEligible: false },
    report: { status: "not-applicable", opened: false, dwellMinutes: 0 }, activity: { source: "IN_APP", activityId: null, type: null, participated: false, response: "not-applicable" },
    touch: { parentId: "parent-1021" }, taskFeedback: { nextAction: "年课首月学习习惯引导" }
  }),
  createUser("touch-queued-p0-exemption", "child-1022", {
    stageCode: "T27", issueType: "renewal-consultation", touch: { status: "queued", reason: "近7日接近频控上限", parentId: "parent-1022", total7d: 5, channels: { text7d: 4, phone7d: 1 }, p0ExemptionReason: "支付失败需在付款窗口内确认" },
    transaction: { status: "payment-failed", paymentFailed: true, observedAt: "2026-07-20T11:00:00+08:00" }, taskFeedback: { nextAction: "主管可见P0豁免原因" }
  }),
  createUser("complaint-resolved", "child-1023", {
    productType: "annual", stageCode: "M6", issueType: "complaint-followup", learning: { completionRate: 74, activeDays7: 4 },
    risk: { fuse: false, type: "投诉已解决", deduction: 5, salesFrozen: false, resolved: true }, touch: { parentId: "parent-1023" },
    taskFeedback: { contacted: true, replyStatus: "replied", riskChange: "resolved", nextAction: "观察期低频维护", finalResult: "投诉已解决" }
  }),
  createUser("low-maintenance", "child-1024", {
    stageCode: "T6", issueType: "routine-care", learning: { completionRate: 30, activeDays7: 1, consecutiveMissedDays: 2 },
    courseEvaluation: { score: 3.7 }, assessment: { score: 34 }, report: { status: "not-applicable", opened: false, dwellMinutes: 0 },
    activity: { source: "IN_APP", activityId: null, type: null, participated: false, response: "not-started" }, parent: { reachable: false, replyStatus: "unreached", replyRate30d: 0.08 },
    touch: { parentId: "parent-1024" }, taskFeedback: { nextAction: "产品化低频维护" }
  })
];

export const SEED_STATE = {
  version: "seed-2026-07-20",
  generatedAt: "2026-07-20T10:00:00+08:00",
  users,
  tasks: [
    { id: "task-1004", userId: "high-score-risk", category: "repair", subtype: "退款投诉", priority: "P0", status: "open", assigneeTeam: "after-sales", channel: "phone" },
    { id: "task-1009", userId: "annual-renewal-p0", category: "conversion", subtype: "F14待付款/支付失败", priority: "P0", status: "open", assigneeTeam: "sales", channel: "text" },
    { id: "task-1011", userId: "h3-uplift", category: "outcome", subtype: "H3提分活动", priority: "P1", status: "open", assigneeTeam: "operations", channel: "text" },
    { id: "task-1015", userId: "learning-repair", category: "repair", subtype: "连续漏学", priority: "P1", status: "open", assigneeTeam: "learning-intervention", channel: "phone" },
    { id: "task-1016", userId: "annual-h2-outcomes", category: "outcome", subtype: "报告解读", priority: "P1", status: "open", assigneeTeam: "learning-planning", channel: "text" },
    { id: "task-1018", userId: "difficulty-objection", category: "repair", subtype: "难度/时间问题", priority: "P1", status: "in-progress", assigneeTeam: "learning-planning", channel: "phone" },
    { id: "task-1022", userId: "touch-queued-p0-exemption", category: "conversion", subtype: "F14待付款/支付失败", priority: "P0", status: "queued", assigneeTeam: "sales", channel: "text" }
  ],
  activities: [
    { id: "ACT-RLINE-CHALLENGE-07", source: "IN_APP", type: "challenge", status: "active" },
    { id: "ACT-RLINE-REVIEW-07", source: "IN_APP", type: "review", status: "active" },
    { id: "LIVE-EXTERNAL-202607", source: "MANUAL", type: "external-live", status: "review-only" }
  ],
  demands: []
};

export function scenarioUser(id) {
  const user = SEED_STATE.users.find((item) => item.id === id);
  return user ? structuredClone(user) : undefined;
}
