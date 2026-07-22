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
  { id: "custom-k", name: "K2中心化SOP模板", nodes: ["M0W-1", "M1W1", "M1W3", "M2-M3", "M4-M5", "M6", "M8W1", "M9-M11", "M12W4"], renewalWindow: ["M9-M11"] }
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
  },
  {
    id: "ES-K2-ACTIVITY-001", name: "K2主题活动透传与活动回流", type: "activity-content", ownerRole: "content-strategy", scope: "line-specific", reusable: false,
    target: { businessLines: ["k-line"], productTypes: ["annual"], lifecycleNodes: ["M0W-1", "M1W1-M1W2", "M2W4", "M4W2", "M5W4", "M9W4", "M11W3", "M12W4"] },
    exclusions: ["risk-fuse", "activity-muted"], action: "按主题月节点配置活动预告、活动提醒、期中活动和期末收官，绑定活动素材参数并回收参与数据", observationWindow: "当日/活动周期",
    metrics: ["metric_11_activity_participation", "activity_click_rate", "completion_rate_lift_in_activity_window"], dataDependencies: ["strategy_id", "activity_id", "poster_asset_id", "activity_participated", "completion_rate"], status: "online",
    sampleCases: [
      { node: "M0W-1", audience: "全员", channel: "群聊/私聊", trigger: "固定周日12:00", sample: "首月活动上线前一天预热，告诉家长和孩子活动即将开始，鼓励参与，不承诺未确认奖励。" },
      { node: "M5W4", audience: "全员", channel: "私聊", trigger: "期中活动前一日", sample: "提醒第六主题月期中活动即将开始，家长可督促孩子跟上进度并关注活动海报。" },
      { node: "M11W3", audience: "全员", channel: "私聊", trigger: "期末活动前一日", sample: "告知最后一月活动规则和收官感，提醒孩子不要在最后阶段掉队。" }
    ],
    fieldContract: ["策略组", "细分场景", "业务生效周期", "循环方式", "触发时间规则", "人群", "渠道", "引用参数", "策略ID", "有效性关注"],
    sourceStrategyIds: ["942101074592666625", "942101653331123201", "942102494557508609"]
  },
  {
    id: "ES-K2-WECHAT-REVIEW-001", name: "K2分层学情复盘微信触达", type: "centralized-touch", ownerRole: "content-strategy", scope: "line-specific", reusable: false,
    target: { businessLines: ["k-line"], productTypes: ["annual"], lifecycleNodes: ["M1W1", "M1", "M2-M3", "M4-M5", "M6", "M8W1", "M10-M11"] },
    exclusions: ["risk-fuse", "after-sales-unclosed", "touch-frequency-blocked"], action: "按S/A/B/C/D层级生成不同语气和重点的微信学情复盘，并挂载成长笔记、完课率、未完成节数等参数", observationWindow: "3天/7天",
    metrics: ["metric_15_wechat_reply_rate", "metric_16_effective_wechat_reply", "completion_rate_lift_7d", "planning_reply_rate"], dataDependencies: ["weekly_completion_level", "completion_rate", "answer_accuracy", "growth_note_asset_id", "missing_lessons"], status: "online",
    sampleCases: [
      { node: "M1W1", audience: "全员", channel: "私聊", trigger: "周一首日/周五首周", sample: "询问首日和首周学习体验、内容吸收和难点，末尾引导家长有问题可私聊。" },
      { node: "M2-M3", audience: "B级", channel: "私聊", trigger: "每周二16:00", sample: "先肯定可取细节，再同步本周完课和答题短板，给出轻量补读建议。" },
      { node: "M10-M11", audience: "C/D级", channel: "私聊", trigger: "双周周二16:00", sample: "表扬坚持到最后，结合薄弱数据引导收尾目标和下一阶段衔接方案。" }
    ],
    fieldContract: ["用户分层", "业务生效周", "循环方式", "触发时间", "触发条件", "参数", "话术版本", "观察窗口"],
    sourceStrategyIds: ["941414221073871873", "941414651392680961", "941415391582481409"]
  },
  {
    id: "ES-K2-PHONE-ASK-001", name: "K2电话规划主动询问", type: "phone-intent", ownerRole: "execution-strategy", scope: "line-specific", reusable: false,
    target: { businessLines: ["k-line"], productTypes: ["annual"], lifecycleNodes: ["M1W1", "M2W4", "M3-M5", "M6", "M7", "M9-M11"] },
    exclusions: ["risk-fuse", "call-frequency-blocked", "after-sales-unclosed"], action: "先用私聊邀约电话，再按学情层级进入学习规划、习惯稳定、活动解释或续费衔接沟通", observationWindow: "7天",
    metrics: ["metric_17_phone_invite_rate", "metric_18_phone_connect_rate", "planning_acceptance_rate", "renewal_signal_lift"], dataDependencies: ["completion_level", "completion_rate", "phone_invited", "phone_connected", "renewal_status"], status: "online",
    sampleCases: [
      { node: "M1W1", audience: "全员且本周完课率=0", channel: "私聊邀约+电话", trigger: "周三10:00", sample: "共情初学未启动原因，询问是否遇到困难，转电话解决开课阻碍。" },
      { node: "M6", audience: "B/C/D且累计完课率曾经>=80%", channel: "私聊邀约+电话", trigger: "双周周三14:00", sample: "先肯定过往高完课，再指出近期下滑，电话帮家长拆解状态变化和修复计划。" },
      { node: "M9-M11", audience: "未续费用户", channel: "私聊邀约+电话", trigger: "每月第四周周三14:00", sample: "以全年收尾和下一阶段衔接为主线，预约电话共识学习规划。" }
    ],
    fieldContract: ["电话邀约事件", "接通结果", "拒接/未接原因", "规划结论", "下一步动作", "续费状态"],
    sourceStrategyIds: ["941414677242176513", "941414891810185217", "944183311169498113"]
  },
  {
    id: "ES-K2-MAKEUP-001", name: "K2补读提醒与修复路径", type: "learning-repair", ownerRole: "model-strategy", scope: "line-specific", reusable: false,
    target: { businessLines: ["k-line"], productTypes: ["annual"], lifecycleNodes: ["M1W3-M1W4", "M2-M4", "M5-M7", "M9-M12"] },
    exclusions: ["risk-fuse", "after-sales-unclosed"], action: "按未完成节数、历史补读和本周补读窗口触发提醒，观察补读章节数和正读时间分布", observationWindow: "本周五24:00/下一条提醒前",
    metrics: ["metric_9_regular_completion_rate", "metric_10_weekend_makeup_rate", "metric_12_daily_makeup_lessons", "completion_recovery_rate"], dataDependencies: ["missing_lessons_this_week", "makeup_lessons_daily", "regular_learning_hours", "completion_rate"], status: "online",
    sampleCases: [
      { node: "M1W3-M1W4", audience: "C/D级且本周未完成节>=1", channel: "私聊", trigger: "周四10:00", sample: "用温暖口吻询问阅读状态和困难，强调可以一起解决，不增加压力。" },
      { node: "M2-M4", audience: "C/D级且本周未完成节>=1", channel: "私聊", trigger: "周四/周六10:00", sample: "更专业直接地提醒长期滞后影响后续学习，给出本周补读目标。" },
      { node: "M9-M12", audience: "B级且本周未完成节>=1", channel: "私聊", trigger: "周三10:00", sample: "关注未完成内容是否遇到困难，引导家长反馈原因并进入短修复。" }
    ],
    fieldContract: ["未完成节数", "历史补读节数", "本周补读节数", "正读时间分布", "补读观察截止时间"],
    sourceStrategyIds: ["939189397324813313", "939189219310163969", "939189239480572929"]
  }
];

const audiencePacks = [
  {
    id: "AUD-RLINE-HIGH-RENEWAL", name: "R线高优续费窗口人群", businessLine: "r-line", levelCode: "R1-R6", productType: "annual", cohortIds: ["R-Annual-M8M12-202607"], lifecycleNodes: ["M8", "M11", "M12"],
    strategyId: "ES-MODEL-HIGH-001", targetCount: 1280, excludedCount: 96, overlapRate: 0.18, dataFreshness: "T+1", observationWindow: "续费窗口内",
    availableActions: ["成长报告价值卡", "奖学金抵扣提醒", "续费权益解释"], exclusionReasons: ["风险熔断", "全局频控阻断", "售后未完结"],
    rules: ["H1/H2", "无风险熔断", "报告已打开或领券未付"]
  },
  {
    id: "AUD-KLINE-MISS-REPAIR", name: "K线连续漏学修复人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-Annual-M3M6-202607"], lifecycleNodes: ["M3", "M6"],
    strategyId: "ES-EXEC-MISS-001", targetCount: 640, excludedCount: 42, overlapRate: 0.11, dataFreshness: "T+1", observationWindow: "7天",
    availableActions: ["补读路径卡", "复习直播预约", "学习修复提醒"], exclusionReasons: ["不可触达", "售后未完结"],
    rules: ["近7天漏学>=3天", "可触达", "无售后未完结"],
    segmentationBasis: "近7天行为补充识别，适合做短期修复，不替代K2周度S/A/B/C/D分层"
  },
  {
    id: "AUD-K2-SA-STABLE", name: "K2 S/A稳定高完课人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-SOP-Sim-202607"], lifecycleNodes: ["M1", "M2-M3", "M4-M5", "M6", "M8W1", "M10-M11"],
    strategyId: "ES-K2-WECHAT-REVIEW-001", targetCount: 1860, excludedCount: 74, overlapRate: 0.16, dataFreshness: "每周一T+1", observationWindow: "3天/7天",
    availableActions: ["首月学习复盘", "双周习惯培养", "半年学习反馈", "下一阶段规划引导"], exclusionReasons: ["全局频控", "风险熔断", "售后未完结"],
    rules: ["每周一取前20节课完成数", "S=完成20节", "A=完成18-19节", "高完课率>=90%", "可触达"]
  },
  {
    id: "AUD-K2-B-RHYTHM", name: "K2 B级节奏波动人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-SOP-Sim-202607"], lifecycleNodes: ["M1", "M2-M3", "M4-M5", "M6", "M8W1", "M10-M11"],
    strategyId: "ES-K2-WECHAT-REVIEW-001", targetCount: 920, excludedCount: 66, overlapRate: 0.22, dataFreshness: "每周一T+1", observationWindow: "7天",
    availableActions: ["周度学情反馈", "补读建议", "习惯波动电话邀约", "下一阶段查漏补缺"], exclusionReasons: ["全局频控", "不可触达", "售后未完结"],
    rules: ["每周一取前20节课完成数", "B=完成14-17节", "完课率70%-89%", "本周未完成节>=1时可叠加补读提醒"]
  },
  {
    id: "AUD-K2-CD-REPAIR", name: "K2 C/D基础修复人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-SOP-Sim-202607"], lifecycleNodes: ["M1W3-M1W4", "M2-M3", "M4-M5", "M6", "M8W1", "M10-M11"],
    strategyId: "ES-K2-MAKEUP-001", targetCount: 680, excludedCount: 58, overlapRate: 0.19, dataFreshness: "每日T+1+每周一分层", observationWindow: "本周五24:00",
    availableActions: ["首月低压修复", "短期补读规划", "学习断层预警", "电话规划邀约"], exclusionReasons: ["风险熔断", "售后未完结", "频控阻断"],
    rules: ["每周一取前20节课完成数", "C=完成10-13节", "D=完成<10节", "完课率<70%", "本周未完成节>=1优先修复"]
  },
  {
    id: "AUD-K2-ACTIVITY-MIDTERM", name: "K2 M6期中活动承接人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-SOP-Sim-202607"], lifecycleNodes: ["M4W2", "M5W4", "M6"],
    strategyId: "ES-K2-ACTIVITY-001", targetCount: 1480, excludedCount: 82, overlapRate: 0.28, dataFreshness: "随活动T+1", observationWindow: "活动周期",
    availableActions: ["期中活动预热", "活动规则提醒", "补读参与引导", "活动结果复盘"], exclusionReasons: ["活动屏蔽", "频控阻断", "售后未完结"],
    rules: ["M4W2提前告知补读计划", "M5W4期中活动预告", "M6活动提醒", "按S/A/B/C/D调整动机重点"]
  },
  {
    id: "AUD-K2-NOSTART-M1W1", name: "K2首周未启动人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-SOP-Sim-202607"], lifecycleNodes: ["M1W1"],
    strategyId: "ES-K2-PHONE-ASK-001", targetCount: 210, excludedCount: 18, overlapRate: 0.07, dataFreshness: "每日T+1", observationWindow: "7天",
    availableActions: ["首日关怀", "首周学习体验询问", "电话解决开课阻碍"], exclusionReasons: ["不可触达", "频控阻断"],
    rules: ["本业务周完课率=0", "首周尚未进入学习节奏", "优先共情询问原因"]
  },
  {
    id: "AUD-K2-UNRENEWED-M9M11", name: "K2 M9-M11未续费衔接人群", businessLine: "k-line", levelCode: "K2", productType: "annual", cohortIds: ["K2-SOP-Sim-202607"], lifecycleNodes: ["M9", "M10", "M11"],
    strategyId: "ES-K2-PHONE-ASK-001", targetCount: 360, excludedCount: 44, overlapRate: 0.14, dataFreshness: "每两周T+1", observationWindow: "续费窗口内",
    availableActions: ["全年学习收尾复盘", "下一阶段衔接电话", "薄弱项补齐方案", "续费认知铺垫"], exclusionReasons: ["已续费", "售后未完结", "风险熔断"],
    rules: ["M9-M11", "未续费", "可触达", "按S/A/B/C/D层级生成不同衔接重点"]
  },
  {
    id: "AUD-ELINE-STRUCTURE", name: "E线升阶规划样例人群", businessLine: "e-line", levelCode: "E1", productType: "annual", cohortIds: ["待接入"], lifecycleNodes: ["M6", "M8"],
    strategyId: "ES-OUTCOME-REPORT-001", targetCount: 0, excludedCount: 0, overlapRate: 0, dataFreshness: "待接入", observationWindow: "待接入",
    availableActions: ["升阶规划入口待接入"], exclusionReasons: ["字段未接入"],
    rules: ["结构样例，待接入真实字段"]
  }
];

const dispatchBatches = [
  { id: "DSP-20260722-001", strategyId: "ES-MODEL-HIGH-001", strategyVersion: "v2026.07.22-r1", audiencePackId: "AUD-RLINE-HIGH-RENEWAL", businessLine: "r-line", downstreamSystem: "前台卡片/中心化触达", status: "completed", plannedCount: 1280, reachedCount: 1096, failedCount: 48, blockedCount: 136, failureReasons: ["入口异常9", "字段缺失7", "系统失败32"], blockedReasons: ["全局频控96", "售后未完结40"], writebackStatus: "complete", observationWindow: "续费窗口内" },
  { id: "DSP-20260722-002", strategyId: "ES-EXEC-MISS-001", strategyVersion: "v2026.07.22-k1", audiencePackId: "AUD-KLINE-MISS-REPAIR", businessLine: "k-line", downstreamSystem: "中心化触达系统", status: "running", plannedCount: 640, reachedCount: 412, failedCount: 31, blockedCount: 0, failureReasons: ["不可触达18", "字段缺失8", "频控阻断5"], blockedReasons: [], writebackStatus: "partial", observationWindow: "7天" },
  { id: "DSP-K2-M1W1-NOSTART", strategyId: "ES-K2-PHONE-ASK-001", strategyVersion: "v2026.07.22-k2-phone-v0", audiencePackId: "AUD-K2-NOSTART-M1W1", businessLine: "k-line", downstreamSystem: "中心化触达系统/电话任务池", status: "completed", plannedCount: 210, reachedCount: 168, failedCount: 14, blockedCount: 28, failureReasons: ["电话字段缺失6", "不可触达5", "系统失败3"], blockedReasons: ["全局频控18", "售后未完结10"], writebackStatus: "complete", observationWindow: "7天" },
  { id: "DSP-K2-M2M3-B-WECHAT", strategyId: "ES-K2-WECHAT-REVIEW-001", strategyVersion: "v2026.07.22-k2-wechat-v0", audiencePackId: "AUD-K2-B-RHYTHM", businessLine: "k-line", downstreamSystem: "私聊触达配置", status: "completed", plannedCount: 920, reachedCount: 781, failedCount: 73, blockedCount: 66, failureReasons: ["素材参数缺失24", "触达失败31", "字段缺失18"], blockedReasons: ["售后未完结42", "频控24"], writebackStatus: "complete", observationWindow: "7天" },
  { id: "DSP-K2-M6-ACTIVITY", strategyId: "ES-K2-ACTIVITY-001", strategyVersion: "v2026.07.22-k2-activity-v0", audiencePackId: "AUD-K2-ACTIVITY-MIDTERM", businessLine: "k-line", downstreamSystem: "活动运营/私聊触达配置", status: "running", plannedCount: 1480, reachedCount: 1041, failedCount: 71, blockedCount: 82, failureReasons: ["海报参数缺失21", "触达失败42", "活动ID缺失8"], blockedReasons: ["频控51", "售后未完结31"], writebackStatus: "partial", observationWindow: "活动周期" },
  { id: "DSP-K2-M9M11-RENEWAL", strategyId: "ES-K2-PHONE-ASK-001", strategyVersion: "v2026.07.22-k2-renew-v0", audiencePackId: "AUD-K2-UNRENEWED-M9M11", businessLine: "k-line", downstreamSystem: "策略包下发/二销承接", status: "running", plannedCount: 360, reachedCount: 219, failedCount: 18, blockedCount: 44, failureReasons: ["电话未接入8", "字段缺失5", "触达失败5"], blockedReasons: ["已续费剔除31", "售后未完结13"], writebackStatus: "partial", observationWindow: "续费窗口内" }
];

const effectivenessMetrics = [
  { id: "EFF-RLINE-REPORT", strategyId: "ES-OUTCOME-REPORT-001", strategyVersion: "v2026.07.22-r1", businessLine: "r-line", metric: "报告打开后下一步点击率", value: 31.4, benchmark: 24.0, direction: "positive", window: "3天", evidenceStatus: "已观测" },
  { id: "EFF-KLINE-MISS", strategyId: "ES-EXEC-MISS-001", strategyVersion: "v2026.07.22-k1", businessLine: "k-line", metric: "7天活跃天数提升", value: 1.2, benchmark: 0.8, direction: "positive", window: "7天", evidenceStatus: "已观测" },
  { id: "EFF-K2-WECHAT-REPLY", strategyId: "ES-K2-WECHAT-REVIEW-001", strategyVersion: "v2026.07.22-k2-wechat-v0", businessLine: "k-line", metric: "微信回复率", value: 18.6, benchmark: 14.0, direction: "positive", window: "3天", evidenceStatus: "K2模拟" },
  { id: "EFF-K2-MAKEUP-FRI", strategyId: "ES-K2-MAKEUP-001", strategyVersion: "v2026.07.22-k2-makeup-v0", businessLine: "k-line", metric: "本周五24点前补读章节数/人", value: 1.8, benchmark: 1.1, direction: "positive", window: "本周五24:00", evidenceStatus: "K2模拟" },
  { id: "EFF-K2-ACTIVITY", strategyId: "ES-K2-ACTIVITY-001", strategyVersion: "v2026.07.22-k2-activity-v0", businessLine: "k-line", metric: "当日活动参与率", value: 26.5, benchmark: 20.0, direction: "positive", window: "当日", evidenceStatus: "K2模拟" },
  { id: "EFF-K2-PHONE", strategyId: "ES-K2-PHONE-ASK-001", strategyVersion: "v2026.07.22-k2-phone-v0", businessLine: "k-line", metric: "电话接通率", value: 43.2, benchmark: 35.0, direction: "positive", window: "7天", evidenceStatus: "K2模拟" },
  { id: "EFF-K2-RENEWAL-BRIDGE", strategyId: "ES-K2-PHONE-ASK-001", strategyVersion: "v2026.07.22-k2-renew-v0", businessLine: "k-line", metric: "下一阶段规划同意率", value: 21.7, benchmark: 16.0, direction: "positive", window: "续费窗口", evidenceStatus: "K2模拟" },
  { id: "EFF-RLINE-HIGH", strategyId: "ES-MODEL-HIGH-001", strategyVersion: "v2026.07.22-r1", businessLine: "r-line", metric: "H1/H2续费率", value: 42.6, benchmark: 30.0, direction: "positive", window: "续费窗口", evidenceStatus: "已观测" },
  { id: "EFF-ELINE-PLAN", strategyId: "ES-OUTCOME-REPORT-001", strategyVersion: "待接入", businessLine: "e-line", metric: "升阶规划预约率", value: null, benchmark: null, direction: "placeholder", window: "待接入", evidenceStatus: "结构占位" }
];

const inboundReviews = [
  { id: "INB-RLINE-REPORT-3D", businessLine: "r-line", sourceStrategyId: "ES-OUTCOME-REPORT-001", sourceVersion: "v2026.07.22-r1", type: "报告", window: "3天", inboundCount: 186, highValueRate: 38.2, riskRate: 4.3, resolutionRate: 81.7, qualityMix: "高价值 38.2% / 常规 57.5% / 风险 4.3%", evidenceStatus: "已观测", suggestion: "保留报告入口，补充奖学金解释" },
  { id: "INB-KLINE-MISS-7D", businessLine: "k-line", sourceStrategyId: "ES-EXEC-MISS-001", sourceVersion: "v2026.07.22-k1", type: "学习", window: "7天", inboundCount: 94, highValueRate: 24.5, riskRate: 7.4, resolutionRate: 76.6, qualityMix: "高价值 24.5% / 常规 68.1% / 风险 7.4%", evidenceStatus: "已观测", suggestion: "补读路径文案减少催学感" },
  { id: "INB-K2-FIRST-WEEK", businessLine: "k-line", sourceStrategyId: "ES-K2-PHONE-ASK-001", sourceVersion: "v2026.07.22-k2-phone-v0", type: "首周未启动", window: "7天", inboundCount: 47, highValueRate: 31.9, riskRate: 5.1, resolutionRate: 72.3, qualityMix: "开课阻碍 44.7% / 常规咨询 50.2% / 风险 5.1%", evidenceStatus: "K2模拟", suggestion: "保留共情式邀约，补齐未启动原因枚举" },
  { id: "INB-K2-ACTIVITY-RULE", businessLine: "k-line", sourceStrategyId: "ES-K2-ACTIVITY-001", sourceVersion: "v2026.07.22-k2-activity-v0", type: "活动规则", window: "活动周期", inboundCount: 128, highValueRate: 18.0, riskRate: 2.4, resolutionRate: 88.6, qualityMix: "规则确认 63.0% / 奖励咨询 34.6% / 风险 2.4%", evidenceStatus: "K2模拟", suggestion: "活动素材参数需展示规则、时间、奖品，不让老师二次解释" },
  { id: "INB-K2-MAKEUP", businessLine: "k-line", sourceStrategyId: "ES-K2-MAKEUP-001", sourceVersion: "v2026.07.22-k2-makeup-v0", type: "补读困难", window: "本周五24:00", inboundCount: 82, highValueRate: 29.6, riskRate: 6.2, resolutionRate: 70.4, qualityMix: "时间安排 41.5% / 难度卡点 52.3% / 风险 6.2%", evidenceStatus: "K2模拟", suggestion: "C/D级补读话术保持低压，M2后再提高目标明确度" },
  { id: "INB-K2-RENEWAL-PLAN", businessLine: "k-line", sourceStrategyId: "ES-K2-PHONE-ASK-001", sourceVersion: "v2026.07.22-k2-renew-v0", type: "续费衔接", window: "续费窗口", inboundCount: 61, highValueRate: 46.0, riskRate: 3.8, resolutionRate: 67.2, qualityMix: "规划需求 46.0% / 权益咨询 50.2% / 风险 3.8%", evidenceStatus: "K2模拟", suggestion: "M9-M11话术要先讲全年成果和下一阶段差距，再进入权益解释" },
  { id: "INB-ELINE-PLAN-7D", businessLine: "e-line", sourceStrategyId: "ES-OUTCOME-REPORT-001", sourceVersion: "待接入", type: "升阶规划", window: "待接入", inboundCount: 0, highValueRate: null, riskRate: null, resolutionRate: null, qualityMix: "结构占位，待接入真实进线聚合", evidenceStatus: "结构占位", suggestion: "补齐升阶路径说明后再进入有效性观测" }
];

const k2StrategyPlaybook = [
  { id: "K2-LAYER-RULE", module: "用户分层", lifecycle: "每周一", audience: "K2年课全员", trigger: "取前20节课完成数，不包含当周", action: "生成S/A/B/C/D层级，供微信、电话、补读、活动策略调用", fields: ["完成节数", "完课率", "本周未完成节数", "分层快照时间"], output: "S=20节；A=18-19节；B=14-17节；C=10-13节；D<10节" },
  { id: "K2-ACT-M0-M1", module: "活动透传", lifecycle: "M0W-1/M1W1-M1W2", audience: "全员", trigger: "周日12:00预热；周一12:00提醒", action: "推送主题月活动预告和活动海报，提醒活动规则、时间和参与价值", fields: ["活动名称", "活动时间", "活动规则", "活动海报", "活动参与事件"], output: "活动参与率、活动后完课提升、活动规则进线量" },
  { id: "K2-WX-M1", module: "主动触达-微信文字", lifecycle: "M1W1", audience: "全员", trigger: "周一首日/周五首周固定触达", action: "询问学习状态、首周体验、内容吸收和难点，建立家长可反馈入口", fields: ["宝贝姓名", "首日完课", "首周完课", "私聊回复", "有效沟通"], output: "微信回复率、有效沟通率、首周开课修复率" },
  { id: "K2-WX-SA", module: "主动触达-微信文字", lifecycle: "M1-M11", audience: "S/A级", trigger: "M1每周、M2-M3双周、M4后月度", action: "以肯定和成长复盘为主，挂载成长笔记，逐步引导长期规划和续费认知", fields: ["完课率", "答题正确率", "成长笔记", "规划意向"], output: "复盘打开/回复、规划意向、续费信号提升" },
  { id: "K2-WX-B", module: "主动触达-微信文字", lifecycle: "M1-M11", audience: "B级", trigger: "M2-M3每周，M4后月度或续费期周度", action: "先肯定再指出短板，给出补读建议，M10-M11引导查漏补缺式衔接", fields: ["完课率", "未完成节数", "答题正确率", "补读建议"], output: "7天补读章节数、回复率、学习节奏恢复率" },
  { id: "K2-WX-CD", module: "主动触达-微信文字", lifecycle: "M1W3-M11", audience: "C/D级", trigger: "首月低压，M2后周度修复，M8后防断层", action: "共情初学困难，明确缺课漏洞和短期补读路径，避免指责式催学", fields: ["未完成节数", "补读节数", "缺课原因", "成长笔记"], output: "补读完成率、风险进线率、低分层迁移率" },
  { id: "K2-PHONE-NOSTART", module: "主动询问-电话", lifecycle: "M1W1", audience: "本业务周完课率=0", trigger: "周三10:00", action: "私聊邀约电话，解决未开课原因、设备/时间/难度阻碍", fields: ["本周完课率", "电话邀约", "电话接通", "未启动原因"], output: "电话接通率、首周启动率、阻碍原因分布" },
  { id: "K2-PHONE-M6", module: "主动询问-电话", lifecycle: "M6", audience: "S/A/B/C/D分层", trigger: "双周周三14:00", action: "结合期中活动、半年学习里程碑和状态波动，做电话规划或活动规则解释", fields: ["累计完课率", "近期完课率", "活动参与", "电话结论"], output: "规划同意率、活动参与率、M6后完课恢复" },
  { id: "K2-MAKEUP", module: "补读提醒", lifecycle: "M1W3-M12", audience: "B/C/D且本周未完成节>=1", trigger: "周一/周三/周四/周六按策略版本触发", action: "根据阶段调整语气强度，提醒补齐遗漏内容并观察到周五24点", fields: ["本周未完成节", "历史补读", "每日补读", "正读时间分布"], output: "本周补读章节数、周末补读率、正读时间分布变化" },
  { id: "K2-RENEWAL-M9", module: "续费衔接", lifecycle: "M9-M11", audience: "未续费用户", trigger: "每月第四周周三14:00", action: "全年收尾复盘、薄弱项拆解、下一阶段规划电话邀约，再进入权益解释", fields: ["续费状态", "分层", "全年完课率", "薄弱项", "电话接通", "规划结论"], output: "规划同意率、权益咨询率、续费窗口转化率" }
];

const strategyWorkTemplates = [
  { id: "TPL-CONTENT-CALENDAR", ownerRole: "content-strategy", module: "内容策略配置", cadence: "月度规划+周度维护", input: "生命周期节点、主题月、活动素材、成长笔记、用户分层", work: "配置活动预告、复习直播、月测反馈、成长报告、节日比赛等内容动作，并维护素材参数", output: "内容日历、素材ID、策略话术版本、活动结果回写", example: "K2 M5W4期中活动预热；R线M8前奖学金激励活动；缺资料时用主题月活动模板补齐" },
  { id: "TPL-CONTENT-COPY", ownerRole: "content-strategy", module: "话术与素材模板", cadence: "每个策略版本发布前", input: "人群层级、触发原因、禁止表达、可引用参数", work: "输出可复用话术模板和个性化参数，不让一线临场自由发挥", output: "话术版本、参数清单、禁用词/风险约束、样例摘要", example: "S/A级以肯定成长为主，B级先肯定再提醒，C/D级先共情再给补读方案" },
  { id: "TPL-EXEC-RULE", ownerRole: "execution-strategy", module: "策略动作包", cadence: "每日检查+周度发布", input: "人群包、策略ID、渠道、触发时间、排除条件、频控规则", work: "把策略拆成可下发批次，明确私聊、群聊、电话邀约、前台卡片等动作边界", output: "下发批次、失败原因、阻断原因、回写状态、观察窗口", example: "K2 M1W1未启动用户先私聊邀约，再进入电话任务池；资料缺失时用标准首周启动模板" },
  { id: "TPL-EXEC-CONFLICT", ownerRole: "execution-strategy", module: "频控与冲突检查", cadence: "每次下发前", input: "同用户近7天触达、售后状态、风险状态、活动曝光、续费窗口", work: "识别同一用户一周内收到的策略冲突，确定保留、延后、降频或熔断", output: "频控命中、豁免原因、冲突策略列表、最终下发顺序", example: "M6活动提醒与补读提醒同日命中时，优先活动入口，补读文案降压合并" },
  { id: "TPL-MODEL-SCORE", ownerRole: "model-strategy", module: "分数与分层", cadence: "每日T+1+关键节点快照", input: "完课率、活跃天数、测评、报告、活动、回复、支付、风险", work: "定义各类分数的取数周期、加扣分规则、H层迁移和高优识别逻辑", output: "分数快照、H层级、人群包命中解释、误判复盘", example: "K2每周一取前20节分S/A/B/C/D；R线续费窗口按H1/H2/H3/H4识别高优和风险" },
  { id: "TPL-MODEL-RENEWAL", ownerRole: "model-strategy", module: "续费识别与关单", cadence: "续费窗口内每日", input: "续费状态、领券、支付失败、权益点击、报告打开、风险熔断", work: "识别可续费用户、领券未付、支付失败、高分未续和风险冻结用户", output: "高优池、关单策略、风险剔除、续费漏斗复盘", example: "K2 M9-M11未续费人群先做学习规划同意率，再承接权益解释" },
  { id: "TPL-INSIGHT-ATTRIBUTION", ownerRole: "insight-strategy", module: "策略归因", cadence: "周复盘+节点复盘", input: "策略ID、版本、人群包、触达回写、学习行为、进线质量、转化结果", work: "判断策略动作是否带来学习、活跃、进线质量或转化改善，并输出保留/调整建议", output: "有效性报告、策略建议、数据缺口、AB实验需求", example: "K2补读提醒观察到周五24点；R线奖学金活动观察券点击、兑换和续费转化" },
  { id: "TPL-INSIGHT-INBOUND", ownerRole: "insight-strategy", module: "进线复盘", cadence: "每日监控+周度复盘", input: "来源策略、进线类型、高价值率、风险率、解决率、用户反馈原因", work: "把用户进线反向归因到策略文案、素材参数、产品入口和模型误判", output: "问题分类、文案修正、字段需求、产品提需", example: "活动规则进线高说明素材缺规则；补读困难进线高说明需要补缺课原因枚举" },
  { id: "TPL-AI-BOUNDARY", ownerRole: "application-strategy", module: "AI应用边界", cadence: "场景发布前+周度质检", input: "常见问答、活动规则、课程知识、风险场景、转人工原因", work: "定义哪些问题AI可答、哪些需要模板回复、哪些必须人工处理", output: "AI场景地图、知识缺口、转人工条件、风险拦截规则", example: "活动规则和课程入口可AI解释，投诉退款和强烈异议必须转人工" },
  { id: "TPL-AI-KB", ownerRole: "application-strategy", module: "知识库缺口维护", cadence: "每日收口+周度发布", input: "AI无法回答、重复追问、人工补充答案、课程FAQ", work: "把进线复盘中高频问题沉淀成可引用知识，更新问题模板和标准答案", output: "知识库新增项、命中率变化、转人工率变化", example: "K2活动奖品/时间/规则、课时内容、补读方式均应沉淀为参数化知识" }
];

const dataRequirements = [
  { id: "REQ-DOMAIN-001", name: "业务域主数据", owner: "产研/数据", status: "must-add", refreshCycle: "每日", reason: "全线中台必须按业务线、级别、班期和生命周期模板聚合", fallback: "R线样板静态配置" },
  { id: "REQ-STRATEGY-001", name: "策略ID/版本ID", owner: "策略/产研", status: "must-add", refreshCycle: "实时/T+1", reason: "策略下发、回写和复盘必须能追溯到版本", fallback: "人工维护策略资产表" },
  { id: "REQ-WRITEBACK-001", name: "触达和活动回写", owner: "CRM/活动/数据", status: "needs-adaptation", refreshCycle: "T+1", reason: "判断策略动作是否真的影响学习和转化", fallback: "批次级汇总回填" },
  { id: "REQ-RLINE-001", name: "R线报告路径聚合", businessLine: "r-line", owner: "数据产品", status: "confirmed-reusable", refreshCycle: "T+1", reason: "按策略和观察窗口汇总报告后行为", fallback: "R线样板静态配置" },
  { id: "REQ-KLINE-001", name: "K2周度分层与策略回写", businessLine: "k-line", owner: "数据产品/策略产品", status: "needs-adaptation", refreshCycle: "每日T+1+每周一分层", reason: "K2策略必须按S/A/B/C/D分层、业务周、策略ID、渠道和观察窗口看触达后学习变化", fallback: "周度聚合回填；首版先用前20节完成数+触达批次汇总" },
  { id: "REQ-KLINE-002", name: "K2内容素材参数池", businessLine: "k-line", owner: "内容策略/活动产品", status: "needs-adaptation", refreshCycle: "随主题月发布", reason: "活动、成长笔记、课时日签、主题周总结都需要参数化，否则策略配置只能写空话术", fallback: "素材ID人工维护，后续接入素材库版本ID" },
  { id: "REQ-ELINE-001", name: "E线升阶规划聚合", businessLine: "e-line", owner: "数据产品", status: "must-add", refreshCycle: "T+1", reason: "按策略和观察窗口汇总升阶规划效果", fallback: "结构样例，待接入真实字段" }
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
  k2StrategyPlaybook,
  strategyWorkTemplates,
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
