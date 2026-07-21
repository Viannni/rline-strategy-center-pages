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
  missingScoreDefaults: {
    F03: 60
  },
  scoreInputs: {
    F07: { field: "normalizedScore", scale: 100, omitWhenMissing: true }
  }
};

export const H_LEVEL_RULES = [
  { id: "H4", order: 1, label: "风险修复", when: "风险熔断、风险扣分>=20，或学习健康<35且有负向反馈", action: "停止销售强推，进入体验修复" },
  { id: "H1", order: 2, label: "高优转化", when: "基础高优分>=75且无风险", action: "续费窗口内二销24小时跟进" },
  { id: "H2", order: 3, label: "成果外化", when: "基础高优分>=65，或基础分>=60且成果外化标准化分>=70", action: "报告解读、规划、讲座或复习内容铺垫" },
  { id: "H3", order: 4, label: "中心化提分", when: "基础高优分40-64且运营提分潜力>=65且无风险", action: "中心化活动和低成本提分" },
  { id: "L", order: 5, label: "低频维护", when: "基础分<40且提分潜力<65且无风险", action: "产品化低频维护" }
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
