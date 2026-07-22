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
  createUser("monthly-t24-p0", "child-1025", {
    stageCode: "T24", issueType: "renewal-consultation",
    learning: { completionRate: 89, activeDays7: 6 }, courseEvaluation: { score: 4.6 }, assessment: { score: 86 },
    report: { opened: true, dwellMinutes: 10, shared: true }, parent: { replyRate30d: 0.82 },
    transaction: { status: "unpaid", unpaid: true, observedAt: "2026-07-20T10:00:00+08:00" },
    touch: { parentId: "parent-1025" }, taskFeedback: { nextAction: "绑定二销处理待付款" }
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

const businessLines = [
  { id: "english-all", name: "英语全线", shortName: "全线", sampleDepth: "aggregate", levels: ["R1-R6", "K2", "E1"], status: "active" },
  { id: "r-line", name: "R线", shortName: "R", sampleDepth: "full", levels: ["R1", "R2", "R3", "R4", "R5", "R6"], status: "pilot" },
  { id: "k-line", name: "K线", shortName: "K", sampleDepth: "structure", levels: ["K1", "K2"], status: "supported" },
  { id: "e-line", name: "E线", shortName: "E", sampleDepth: "structure", levels: ["E1", "E2"], status: "supported" }
];

const lifecycleTemplates = [
  { id: "monthly-t", name: "月课T模板", nodes: ["T0", "T7", "T14", "T21", "T22", "T24", "T28"], renewalWindow: ["T22", "T28"] },
  { id: "annual-m", name: "年课M模板", nodes: ["M1", "M3", "M6", "M8", "M11", "M12"], renewalWindow: ["M8", "M12"] },
  { id: "custom-k", name: "K线中心化SOP模板", nodes: ["M0", "M3", "M6", "M8"], renewalWindow: ["M6", "M8"] }
];

const strategyAssets = [
  {
    id: "ES-OUTCOME-REPORT-001", name: "成长报告打开后价值认知强化", type: "outcome-content", ownerRole: "content-strategy", scope: "line-reusable", reusable: true,
    target: { businessLines: ["r-line", "k-line", "e-line"], productTypes: ["monthly", "annual"], lifecycleNodes: ["T21", "T24", "M8", "M11", "M12"] },
    exclusions: ["risk-fuse", "refund-open", "touch-frequency-blocked"], action: "报告打开后展示价值解释、下一步学习路径和对应权益入口", observationWindow: "3天",
    metrics: ["report_open_rate", "next_action_click_rate", "renewal_signal_lift"], dataDependencies: ["report_opened", "strategy_id", "audience_pack_id", "touch_writeback"], status: "online",
    differenceConfig: {
      "r-line": { valueHook: "阅读成长 + 奖学金提醒", benefit: "奖学金可兑换续费券" },
      "k-line": { valueHook: "K2能力成长路径 + 中心化SOP", benefit: "阶段规划权益" },
      "e-line": { valueHook: "升阶规划 + 长期学习目标", benefit: "升阶体验权益" }
    }
  },
  {
    id: "ES-EXEC-MISS-001", name: "连续漏学修复策略包", type: "centralized-touch", ownerRole: "execution-strategy", scope: "line-reusable", reusable: true,
    target: { businessLines: ["r-line", "k-line", "e-line"], productTypes: ["monthly", "annual"], lifecycleNodes: ["T7", "T14", "M3", "M6"] },
    exclusions: ["risk-fuse", "after-sales-unclosed"], action: "识别漏学后发送补读路径，并在7天观察回流", observationWindow: "7天",
    metrics: ["completion_rate_lift_7d", "active_days_lift_7d", "inbound_risk_rate"], dataDependencies: ["completion_rate", "missed_days", "touch_writeback", "activity_writeback"], status: "online",
    differenceConfig: {
      "r-line": { valueHook: "阅读补读 + 轻活动提分", benefit: "补读奖学金" },
      "k-line": { valueHook: "词汇/表达复习任务", benefit: "复习直播预约" },
      "e-line": { valueHook: "综合能力薄弱项复习", benefit: "升阶规划提醒" }
    }
  },
  {
    id: "ES-MODEL-HIGH-001", name: "高优续费识别与关单SOP", type: "renewal-model", ownerRole: "model-strategy", scope: "line-reusable", reusable: true,
    target: { businessLines: ["r-line", "k-line", "e-line"], productTypes: ["monthly", "annual"], lifecycleNodes: ["T22", "T24", "T28", "M8", "M11", "M12"] },
    exclusions: ["risk-fuse", "h4-low-maintenance"], action: "识别H1/H2高优、领券未付、支付失败和报告已开未转化用户，进入策略关单路径", observationWindow: "续费窗口内",
    metrics: ["h1_h2_renewal_rate", "coupon_to_pay_rate", "high_score_miss_rate"], dataDependencies: ["score_snapshot", "transaction_status", "marketing_events", "risk_status"], status: "online",
    differenceConfig: {
      "r-line": { valueHook: "月转年/年转年权益解释", benefit: "奖学金抵扣上限" },
      "k-line": { valueHook: "K2路径价值解释", benefit: "续费权益包" },
      "e-line": { valueHook: "升阶课程价值解释", benefit: "升阶规划权益" }
    }
  }
];

const audiencePacks = [
  { id: "AUD-RLINE-HIGH-RENEWAL", name: "R线高优续费窗口人群", businessLine: "r-line", levelCode: "R1-R6", productType: "annual", lifecycleNodes: ["M8", "M11", "M12"], targetCount: 1280, excludedCount: 96, overlapRate: 0.18, dataFreshness: "T+1", rules: ["H1/H2", "无风险熔断", "报告已打开或领券未付"] },
  { id: "AUD-KLINE-MISS-REPAIR", name: "K线连续漏学修复人群", businessLine: "k-line", levelCode: "K2", productType: "annual", lifecycleNodes: ["M3", "M6"], targetCount: 640, excludedCount: 42, overlapRate: 0.11, dataFreshness: "T+1", rules: ["近7天漏学>=3天", "可触达", "无售后未完结"] },
  { id: "AUD-ELINE-STRUCTURE", name: "E线升阶规划样例人群", businessLine: "e-line", levelCode: "E1", productType: "annual", lifecycleNodes: ["M6", "M8"], targetCount: 0, excludedCount: 0, overlapRate: 0, dataFreshness: "待接入", rules: ["结构样例，待接入真实字段"] }
];

const dispatchBatches = [
  { id: "DSP-20260722-001", strategyId: "ES-OUTCOME-REPORT-001", audiencePackId: "AUD-RLINE-HIGH-RENEWAL", businessLine: "r-line", downstreamSystem: "私聊/前台卡片", status: "completed", plannedCount: 1280, reachedCount: 1096, failedCount: 48, writebackStatus: "complete", observationWindow: "3天" },
  { id: "DSP-20260722-002", strategyId: "ES-EXEC-MISS-001", audiencePackId: "AUD-KLINE-MISS-REPAIR", businessLine: "k-line", downstreamSystem: "中心化触达系统", status: "running", plannedCount: 640, reachedCount: 412, failedCount: 31, writebackStatus: "partial", observationWindow: "7天" }
];

const effectivenessMetrics = [
  { id: "EFF-RLINE-REPORT", strategyId: "ES-OUTCOME-REPORT-001", businessLine: "r-line", metric: "报告打开后下一步点击率", value: 31.4, benchmark: 24.0, direction: "positive", window: "3天" },
  { id: "EFF-KLINE-MISS", strategyId: "ES-EXEC-MISS-001", businessLine: "k-line", metric: "7天活跃天数提升", value: 1.2, benchmark: 0.8, direction: "positive", window: "7天" },
  { id: "EFF-RLINE-HIGH", strategyId: "ES-MODEL-HIGH-001", businessLine: "r-line", metric: "H1/H2续费率", value: 42.6, benchmark: 30.0, direction: "positive", window: "续费窗口" }
];

const inboundReviews = [
  { id: "INB-001", businessLine: "r-line", sourceStrategyId: "ES-OUTCOME-REPORT-001", type: "报告", quality: "high-value", solved: true, scoreImpact: "plus", suggestion: "保留报告入口，补充奖学金解释" },
  { id: "INB-002", businessLine: "k-line", sourceStrategyId: "ES-EXEC-MISS-001", type: "学习", quality: "normal", solved: true, scoreImpact: "none", suggestion: "补读路径文案减少催学感" }
];

const dataRequirements = [
  { id: "REQ-DOMAIN-001", name: "业务域主数据", owner: "产研/数据", status: "must-add", refreshCycle: "每日", reason: "全线中台必须按业务线、级别、班期和生命周期模板聚合", fallback: "R线样板静态配置" },
  { id: "REQ-STRATEGY-001", name: "策略ID/版本ID", owner: "策略/产研", status: "must-add", refreshCycle: "实时/T+1", reason: "策略下发、回写和复盘必须能追溯到版本", fallback: "人工维护策略资产表" },
  { id: "REQ-WRITEBACK-001", name: "触达和活动回写", owner: "CRM/活动/数据", status: "needs-adaptation", refreshCycle: "T+1", reason: "判断策略动作是否真的影响学习和转化", fallback: "批次级汇总回填" }
];

export const SEED_STATE = {
  version: "seed-2026-07-22-english-strategy",
  generatedAt: "2026-07-22T10:00:00+08:00",
  businessLines,
  lifecycleTemplates,
  strategyAssets,
  audiencePacks,
  dispatchBatches,
  effectivenessMetrics,
  inboundReviews,
  dataRequirements,
  users,
  tasks: [
    { id: "task-1025", userId: "monthly-t24-p0", category: "conversion", subtype: "F14待付款/支付失败", priority: "P0", status: "open", assigneeTeam: "sales", channel: "text" },
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
  scholarship: {
    policyStatus: "discussion-configurable",
    annualRedemptionCap: 200,
    perRedemptionCap: 50,
    balanceExpires: false,
    expiredCouponReturn: "scholarship-account",
    sampleAccount: { userId: "annual-h2-outcomes", balance: 86, redeemed: 40, coViewMilestones: ["M4报告", "M7测评"] }
  },
  demands: []
};

export function scenarioUser(id) {
  const user = SEED_STATE.users.find((item) => item.id === id);
  return user ? structuredClone(user) : undefined;
}
