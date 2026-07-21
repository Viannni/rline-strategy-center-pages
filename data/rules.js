export const SCORING_RULES = {
  version: "online-2026-07-20",
  baseDimensions: [
    { id: "learningHealth", label: "学习健康", cap: 30, fields: ["F04", "F05", "F06"] },
    { id: "courseExperience", label: "课程体验", cap: 15, fields: ["F07"], omitWhenMissing: true },
    { id: "outcomes", label: "成果外化", cap: 15, fields: ["F08", "F09"] },
    { id: "parentEngagement", label: "家长互动", cap: 15, fields: ["F11", "F16"] },
    { id: "fit", label: "用户适配", cap: 5, fields: ["F03"] }
  ],
  independentSignals: ["F13", "F14"],
  touchGate: "F12",
  riskField: "F15",
  riskPrecedence: {
    evaluatedBy: "H4",
    field: "F15",
    trigger: "fuse",
    supersedes: [
      "score-ordering",
      "F13-marketing-priority",
      "F14-transaction-priority",
      "sales-task-routing"
    ]
  },
  missingScoreDefaults: {
    F03: 60
  },
  scoreInputs: {
    F07: { field: "normalizedScore", scale: 100, omitWhenMissing: true }
  },
  pointRules: {
    learningHealth: {
      firstLesson: { id: "F04-first-lesson", label: "首课完成", points: 4, fieldIds: ["F04"], window: "当前课程", sourceField: "firstLessonCompleted", inferredCompletionMinimum: 80 },
      completionHigh: { id: "F04-completion-80", label: "近7天完课率80%及以上", points: 8, fieldIds: ["F04"], window: "近7天", minimum: 80 },
      completionMedium: { id: "F04-completion-60", label: "近7天完课率60%-79%", points: 5, fieldIds: ["F04"], window: "近7天", minimum: 60 },
      activeSeven: { id: "F05-active-7", label: "近7天有效学习7天", points: 5, fieldIds: ["F05"], window: "近7天", minimum: 7 },
      activeThree: { id: "F05-active-3", label: "近7天有效学习3天", points: 3, fieldIds: ["F05"], window: "近7天", minimum: 3 },
      missedAtMostOne: { id: "F06-missed-at-most-1", label: "连续漏学不超过1天", points: 4, fieldIds: ["F06"], window: "当前", maximum: 1 },
      onTrack: { id: "F04-on-track", label: "当前进度不落后应学进度", points: 4, fieldIds: ["F04", "F02"], window: "当前阶段", proxyMinimum: 50 },
      stableTrend: { id: "F04-F05-stable-trend", label: "近7天学习趋势持平或上升", points: 3, fieldIds: ["F04", "F05"], window: "近7天", sourceField: "trend7d", inferredActiveDaysMinimum: 7 }
    },
    courseExperience: {
      excellent: { id: "F07-score-90", label: "课程评价分90分及以上", points: 15, fieldIds: ["F07"], window: "最近课程节点", minimum: 90 },
      good: { id: "F07-score-80", label: "课程评价分80-89分", points: 12, fieldIds: ["F07"], window: "最近课程节点", minimum: 80 },
      fair: { id: "F07-score-70", label: "课程评价分70-79分", points: 8, fieldIds: ["F07"], window: "最近课程节点", minimum: 70 },
      low: { id: "F07-score-60", label: "课程评价分60-69分", points: 4, fieldIds: ["F07"], window: "最近课程节点", minimum: 60 }
    },
    outcomes: {
      assessmentCompleted: { id: "F08-assessment-completed", label: "完成阶段测评/挑战", points: 5, fieldIds: ["F08"], window: "当前生命周期节点" },
      assessmentStrong: { id: "F08-assessment-80", label: "测评/挑战成绩达到80分及以上", points: 3, fieldIds: ["F08"], window: "最近一次", minimum: 80 },
      reportGenerated: { id: "F09-report-generated", label: "报告仅生成", points: 0, fieldIds: ["F09"], window: "报告节点" },
      reportOpened: { id: "F09-report-opened", label: "家长打开成长报告", points: 5, fieldIds: ["F09"], window: "报告节点" },
      reportEngaged: { id: "F09-report-engaged", label: "报告有效停留或分享", points: 3, fieldIds: ["F09"], window: "报告节点", minimumDwellMinutes: 0.5 }
    },
    parentEngagement: {
      replied: { id: "F11-parent-replied", label: "家长近7天有有效回复", points: 5, fieldIds: ["F11"], window: "近7天" },
      positiveOrNeutral: { id: "F11-parent-positive-neutral", label: "家长回复为正向或中性", points: 4, fieldIds: ["F11"], window: "近30天", minimumReplyRate: 0.5 },
      messageOpened: { id: "F11-message-opened", label: "家长打开服务消息", points: 2, fieldIds: ["F11"], window: "近30天", inferredReplyRate: 0.8 },
      feedback: { id: "F16-learning-feedback", label: "提交学习反馈", points: 3, fieldIds: ["F11", "F16"], window: "最近任务" }
    },
    fit: {
      courseFit: { id: "F03-course-fit", label: "课程级别与定级结果适配", points: 3, fieldIds: ["F03"], window: "当前课程", defaultScore: 60 },
      ageGradeFit: { id: "F03-age-grade-fit", label: "年龄/年级与当前R级别适配", points: 1, fieldIds: ["F03"], window: "当前课程", minimum: 80 },
      noDifficultyFeedback: { id: "F03-no-difficulty-feedback", label: "无明显难度负向反馈", points: 1, fieldIds: ["F03", "F15", "F16"], window: "当前" }
    },
    risk: {
      objectionDeduction: 15,
      unresolvedServiceDeduction: 10,
      noResponseSaturationDeduction: 10,
      missedSevenDaysDeduction: 10,
      maximumDeduction: 30
    },
    uplift: {
      learningRepairWeight: 0.3,
      outcomesGapWeight: 0.3,
      parentReachabilityWeight: 0.2,
      activityResponseWeight: 0.2
    }
  }
};

export const H_LEVEL_RULES = [
  {
    id: "H4",
    order: 1,
    label: "风险修复",
    when: "风险熔断、风险扣分>=20，或学习健康<35且有负向反馈",
    action: "停止销售强推，进入体验修复",
    criteria: {
      anyOf: [
        { allOf: [{ metric: "riskFused", operator: "eq", value: true }] },
        { allOf: [{ metric: "riskDeduction", operator: "gte", value: 20 }] },
        {
          allOf: [
            { metric: "learningHealthNormalized", operator: "lt", value: 35 },
            { metric: "negativeFeedback", operator: "eq", value: true }
          ]
        }
      ]
    }
  },
  {
    id: "H1",
    order: 2,
    label: "高优转化",
    when: "基础高优分>=75且无风险",
    action: "续费窗口内二销24小时跟进",
    criteria: { allOf: [{ metric: "baseScore", operator: "gte", value: 75 }] }
  },
  {
    id: "H2",
    order: 3,
    label: "成果外化",
    when: "基础高优分>=65，或基础分>=60且成果外化标准化分>=70",
    action: "报告解读、规划、讲座或复习内容铺垫",
    criteria: {
      anyOf: [
        { allOf: [{ metric: "baseScore", operator: "gte", value: 65 }] },
        {
          allOf: [
            { metric: "baseScore", operator: "gte", value: 60 },
            { metric: "outcomeNormalized", operator: "gte", value: 70 }
          ]
        }
      ]
    }
  },
  {
    id: "H3",
    order: 4,
    label: "中心化提分",
    when: "基础高优分40-64且运营提分潜力>=65且无风险",
    action: "中心化活动和低成本提分",
    criteria: {
      allOf: [
        { metric: "baseScore", operator: "gte", value: 40 },
        { metric: "baseScore", operator: "lte", value: 64 },
        { metric: "upliftScore", operator: "gte", value: 65 }
      ]
    }
  },
  {
    id: "L",
    order: 5,
    label: "低频维护",
    when: "基础分<40且提分潜力<65且无风险",
    action: "产品化低频维护",
    criteria: { default: true }
  }
];

export const TASK_RULES = {
  categories: [
    { id: "conversion", label: "临门转化", subtypes: ["F14待付款/支付失败", "领券未用", "H1高优转化"] },
    { id: "outcome", label: "成果外化", subtypes: ["H2证据补强", "报告解读", "H3提分活动"] },
    { id: "repair", label: "风险/漏学修复", subtypes: ["退款投诉", "难度/时间问题", "连续漏学"] }
  ],
  renewalWindows: {
    monthly: ["T22", "T23", "T24", "T25", "T26", "T27", "T28"],
    annual: ["M8", "M9", "M10", "M11", "M12"]
  },
  touchGate: {
    statuses: ["eligible", "queued", "blocked"],
    p0Exemption: "P0可豁免，但必须填写原因并对主管可见"
  },
  defaultChannel: "text",
  phoneTriggers: ["risk", "complex-learning", "text-unresolved", "phone-request", "high-density-explanation"]
};

export const FIELD_DEFINITIONS = [
  { id: "F01", name: "用户统一ID", technicalField: "user_id", scoreRole: "foundation", source: "学习/订单/CRM主键", refresh: "实时", availability: "required", missing: "无法映射时不进入自动评分，进入数据异常池", owner: "数据" },
  { id: "F02", name: "课程与生命周期阶段", technicalField: "product_type, stage_code", scoreRole: "foundation", source: "教务中心", refresh: "每日", availability: "required", missing: "非法或与产品类型冲突时停止路由", owner: "教务" },
  { id: "F03", name: "课程级别与用户适配", technicalField: "course_fit", scoreRole: "base", source: "教务中心", refresh: "每日", availability: "needs-validation", missingScore: 60, missing: "缺失时按默认60分参与评分并标记待补齐", owner: "教研" },
  { id: "F04", name: "有效完课率", technicalField: "effective_completion_rate", scoreRole: "base", source: "教务中心", refresh: "每日", availability: "entry-confirmed", missing: "缺失时不自动判为未完成", owner: "教务" },
  { id: "F05", name: "近7天活跃学习天数", technicalField: "active_learning_days_7d", scoreRole: "base", source: "教务中心", refresh: "每日", availability: "entry-confirmed", missing: "缺失时标记数据异常", owner: "教务" },
  { id: "F06", name: "连续漏学天数", technicalField: "consecutive_missed_days", scoreRole: "base-and-routing", source: "教务中心", refresh: "每日", availability: "entry-confirmed", missing: "缺失时不触发漏学任务", owner: "教务" },
  { id: "F07", name: "课程评价分", technicalField: "course_evaluation_score", scoreRole: "base", source: "课程评价", refresh: "课程节点后", availability: "needs-validation", scoreInput: "normalizedScore", normalizedScale: 100, missing: "无有效评价时课程体验不参与分母", owner: "教务" },
  { id: "F08", name: "测评/挑战结果", technicalField: "assessment_result", scoreRole: "base-and-uplift", source: "教务中心", refresh: "节点后", availability: "needs-validation", missing: "节点未到时显示不适用", owner: "教研" },
  { id: "F09", name: "成长报告行为", technicalField: "report_open, report_dwell, report_share", scoreRole: "base-and-routing", source: "报告服务", refresh: "实时", availability: "needs-validation", missing: "仅生成未打开不加分，只生成报告提醒", owner: "产品" },
  { id: "F10", name: "端内活动参与", technicalField: "in_app_activity_event", scoreRole: "uplift", source: "营销中心", refresh: "每日", availability: "confirmed-reusable", missing: "MANUAL外部活动仅复盘，不进入自动计算", owner: "运营" },
  { id: "F11", name: "家长回复与可达", technicalField: "parent_reply, reachable_flag", scoreRole: "base-and-uplift", source: "CRM", refresh: "实时", availability: "entry-confirmed", missing: "缺失时不推断家长不可达", owner: "学服" },
  { id: "F12", name: "触达准入/限流", technicalField: "touch_gate", scoreRole: "gate", source: "CRM/外呼", refresh: "实时", availability: "needs-adaptation", missing: "触达前即时校验；不进入基础分", owner: "CRM" },
  { id: "F13", name: "营销意向", technicalField: "marketing_intent_events", scoreRole: "independent", source: "营销中心/CRM", refresh: "实时", availability: "needs-adaptation", missing: "缺同曝光组时保留事件，不显示跨用户排名", owner: "运营" },
  { id: "F14", name: "交易状态", technicalField: "transaction_status", scoreRole: "independent", source: "订单/支付", refresh: "实时", availability: "entry-confirmed", missing: "非续费窗口保留事件，不自动生成二销任务", owner: "商业" },
  { id: "F15", name: "风险熔断状态", technicalField: "risk_fuse", scoreRole: "risk", source: "工单系统", refresh: "实时", availability: "entry-confirmed", missing: "未确认前不解除风险；熔断优先于分数和销售任务", owner: "学服" },
  { id: "F16", name: "任务触达结果", technicalField: "task_feedback", scoreRole: "feedback", source: "销售运营/CRM/外呼", refresh: "实时与次日", availability: "needs-adaptation", missing: "保存结构化回写；次日校准基础分，实时更新F13/F14/F15", owner: "销售运营" }
];
