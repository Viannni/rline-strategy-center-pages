export const CAPABILITY_STATUSES = Object.freeze({
  "confirmed-reusable": Object.freeze({
    code: "confirmed-reusable",
    label: "已确认可复用",
    liveFieldSupport: "documented"
  }),
  "entry-confirmed": Object.freeze({
    code: "entry-confirmed",
    label: "已有入口待核对",
    liveFieldSupport: "unverified"
  }),
  "needs-adaptation": Object.freeze({
    code: "needs-adaptation",
    label: "需要改造",
    liveFieldSupport: "requires-adaptation"
  }),
  "must-add": Object.freeze({
    code: "must-add",
    label: "必须新增",
    liveFieldSupport: "unavailable"
  }),
  degradable: Object.freeze({
    code: "degradable",
    label: "可降级",
    liveFieldSupport: "not-required"
  })
});

const withStatusMetadata = (item) => ({
  ...item,
  statusMeta: CAPABILITY_STATUSES[item.status]
});

const systemCapabilities = [
  {
    id: "marketing", name: "营销中心", path: "/m/marketing/operation/activity", status: "confirmed-reusable", confirmedAt: "2026-06-24",
    existing: ["活动筛选", "活动列表", "新建活动", "act code", "生效对象", "推广", "数据入口"],
    reuse: ["任务制活动", "预约活动", "抽奖活动", "领课活动"],
    changes: ["R线场景标签", "act code命名规范", "用户级结果回写"],
    gaps: ["报名、到场、完赛、分享、领奖和支付是否可按用户回写待核对"],
    fallback: "活动结果按日导出后导入用户事件宽表"
  },
  {
    id: "crm-tags", name: "CRM标签", path: "scopeData", status: "confirmed-reusable", confirmedAt: "2026-06-24",
    existing: ["标签ID搜索", "多选标签"], reuse: ["H层级", "风险", "生命周期等简单人群"],
    changes: ["标签ID字典", "刷新周期", "营销中心读取延迟"], gaps: ["复杂组合人群不由标签单独承接"],
    fallback: "优先用标签承接，不等待复杂分群"
  },
  {
    id: "crm-segments", name: "CRM分群", path: "userGroupIdList", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: [], reuse: ["生命周期、分数和活动行为的复杂组合人群"],
    changes: ["修复/admin-api/gravity/user-group-tasks读取权限"], gaps: ["历史实读接口返回403，未确认CRM用户组端点、字段或读取权限"],
    fallback: "多个CRM标签交集或离线名单"
  },
  {
    id: "sales-ops", name: "销售运营-管理平台", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口"], reuse: ["临门转化", "成果外化", "风险/漏学三类任务队列"],
    changes: ["触发原因", "用户证据", "推荐动作", "SLA", "风险", "结构化回写结果"],
    gaps: ["深层任务字段、触发原因和回写能力尚未实读确认"],
    fallback: "现有任务配合天眼模板或导入任务表"
  },
  {
    id: "crm-workbench", name: "客户关系-管理平台", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口", "CRM标签", "分群底座"], reuse: ["用户标签", "沟通记录", "F11/F16"],
    changes: ["结构化回复", "异议", "下一步动作字段"], gaps: ["结构化回写字段与权限尚未确认"],
    fallback: "固定枚举模板人工回写"
  },
  {
    id: "education", name: "教务中心-管理后台", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口", "课程", "测评", "完课", "学习节点"], reuse: ["F02-F09基础数据"],
    changes: ["R线阅读器", "课程评价", "报告", "测评分值映射"], gaps: ["字段口径和读取接口待核对"],
    fallback: "首期接入完课、活跃、漏学、课程评价和现有测评结果"
  },
  {
    id: "tickets", name: "工单系统", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口", "投诉", "退款", "服务问题"], reuse: ["F15风险", "处理状态", "解除记录"],
    changes: ["按用户ID实时回写", "解除权限"], gaps: ["实时回写字段和解除权限尚未确认"],
    fallback: "每日同步未关闭风险名单，销售侧人工冻结"
  },
  {
    id: "call-center", name: "外呼中心", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口"], reuse: ["电话任务", "接通结果", "时长", "回拨"],
    changes: ["任务分配", "绑定二销", "结果回写", "全局频控字段"], gaps: ["任务分配、回写与全局频控字段未确认"],
    fallback: "任务台输出电话名单，结果通过模板回写"
  },
  {
    id: "front-card", name: "前台业务卡片配置后台", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口"], reuse: ["报告", "活动", "奖学金", "续费路径入口"],
    changes: ["按生命周期/人群展示", "曝光", "点击", "兑换回传"], gaps: ["人群定向与事件回传字段未确认"],
    fallback: "固定节点配置全量卡片，点击结果按日回传"
  },
  {
    id: "ai-platform", name: "叫叫AI中台", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口"], reuse: ["二期情绪", "异议", "摘要", "推荐动作"],
    changes: ["可解释性", "置信度", "人工复核机制"], gaps: ["MVP字段与模型输出尚未确认"],
    fallback: "一期使用规则关键词和人工枚举"
  },
  {
    id: "analytics", name: "可视化数据看板", path: "应用入口", status: "entry-confirmed", confirmedAt: "2026-06-24",
    existing: ["应用入口", "看板基础"], reuse: ["H层级", "任务", "活动迁移", "支付", "风险复盘"],
    changes: ["用户级下钻", "每日分数快照", "活动ID和任务ID关联"], gaps: ["用户级关联与快照字段尚未确认"],
    fallback: "原型本地聚合，产研按固定宽表建首版报表"
  },
  {
    id: "rules-engine", name: "数据侧规则计算", path: "待新增/配置", status: "must-add", confirmedAt: null,
    existing: [], reuse: ["离线规则计算", "实时信号覆盖", "分数快照"],
    changes: ["统一计分", "H层级", "路由", "回写编排"], gaps: ["跨系统统一计算、路由、回写和快照能力当前不存在"],
    fallback: "MVP以离线规则、标签和定时导入先跑通"
  }
];

export const SYSTEM_CAPABILITIES = systemCapabilities.map(withStatusMetadata);

const featurePlacements = [
  { id: "activity-uplift", feature: "中心化提分活动", capabilityId: "marketing", status: "needs-adaptation", dependency: "用户级活动结果回写", fallback: "每日导入活动结果" },
  { id: "simple-segmentation", feature: "H层级与风险基础分群", capabilityId: "crm-tags", status: "confirmed-reusable", dependency: "标签字典和刷新周期", fallback: "标签优先" },
  { id: "complex-segmentation", feature: "复杂组合分群", capabilityId: "crm-segments", status: "entry-confirmed", dependency: "读取权限和字段确认", fallback: "CRM标签交集或离线名单" },
  { id: "task-queue", feature: "三类R线任务队列", capabilityId: "sales-ops", status: "entry-confirmed", dependency: "任务字段与结果回写确认", fallback: "现有任务和天眼模板" },
  { id: "touch-feedback", feature: "家长触达与结构化回写", capabilityId: "crm-workbench", status: "entry-confirmed", dependency: "F11/F16字段确认", fallback: "固定枚举人工回写" },
  { id: "learning-data", feature: "学习健康和成果字段", capabilityId: "education", status: "entry-confirmed", dependency: "F02-F09口径映射", fallback: "首期接入已确认基础字段" },
  { id: "risk-fuse", feature: "投诉退款风险熔断", capabilityId: "tickets", status: "entry-confirmed", dependency: "用户ID实时回写和解除权限", fallback: "每日风险名单人工冻结" },
  { id: "phone-task", feature: "电话任务与频控", capabilityId: "call-center", status: "entry-confirmed", dependency: "任务分配、回写和频控字段", fallback: "电话名单加模板回写" },
  { id: "front-entry", feature: "用户侧报告和续费入口", capabilityId: "front-card", status: "entry-confirmed", dependency: "人群展示和曝光/点击/兑换回传", fallback: "固定节点全量卡片" },
  { id: "ai-assist", feature: "情绪与异议辅助", capabilityId: "ai-platform", status: "degradable", dependency: "可解释性、置信度和人工复核", fallback: "规则关键词和人工枚举" },
  { id: "review-dashboard", feature: "H迁移与效果复盘", capabilityId: "analytics", status: "entry-confirmed", dependency: "用户级下钻和关联快照", fallback: "固定宽表首版报表" },
  { id: "scoring-routing", feature: "统一计分、路由与快照", capabilityId: "rules-engine", status: "must-add", dependency: "跨系统数据与事件契约", fallback: "离线规则加定时导入" },
  { id: "routing-policy", feature: "触达准入、角色路由和任务派发", capabilityId: "rules-engine", status: "must-add", dependency: "F12频控、绑定关系和派单字段", fallback: "离线规则加任务表" }
];

export const FEATURE_PLACEMENTS = featurePlacements.map(withStatusMetadata);
