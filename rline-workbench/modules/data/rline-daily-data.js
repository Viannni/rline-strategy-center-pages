// Snapshot from the internal R-line SOP and course data sources.
// Keep source timestamps explicit so partial-day data is never presented as a final result.
export const RLINE_DAILY_SNAPSHOT = Object.freeze({
  version: "rline-daily-snapshot-2026-09-20-m1w1-closed",
  generatedAt: "2026-09-20T00:00:00+08:00",
  snapshotCapturedAt: "2026-09-20T00:00:00+08:00",
  sourceSync: {
    timezone: "Asia/Shanghai",
    keyTimes: ["12:00", "14:00", "18:00", "24:00"],
    delayMinutes: 30,
    plannedFetchTimes: ["12:30", "14:30", "18:30", "次日00:30"],
    mode: "manual_snapshot",
    status: "source-automation-blocked",
    message: "当前页面每60秒检查本地快照；钉钉源表自动读取尚未接通，需组织管理员开启CLI数据访问或提供可调用的导出/API。"
  },
  current: {
    date: "2026-09-18",
    stage: "M1W1D5",
    cohort: "1期",
    asOf: "24:00",
    status: "closed",
    isDayEnd: true,
    dataStatus: "24:00已回填",
    totalUsers: 610,
    split: [
      { level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 118, positiveRead: 115, retention: 30.81, depth: 30.03, absent: 265, notFinished: 3 },
      { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 75, positiveRead: 68, retention: 33.04, depth: 29.96, absent: 152, notFinished: 7 }
    ],
    points: [
      { time: "24:00", participant: 193, positiveRead: 183, retention: 31.64, depth: 30.00, absent: 417, notFinished: 10, capturedAt: "2026-09-20T00:00:00+08:00" }
    ],
    pending: [],
    missing: [],
    finalAsOf: "24:00"
  },
  bi: {
    name: "R线月课训练营看板 · 班期转化数据",
    url: null,
    capturedAt: "2026-09-22T00:30:00+08:00",
    status: "refreshed",
    note: "BI实时结果层；本次为2026-09-21昨日快照。未开课和其他状态保留原始0值，不纳入行课策略达成判断；日内和日终历史仍以课程日数据快照为准。",
    fields: ["在班用户数", "用户占比", "参与率", "完课率-课时", "100%深度用户占比", "补完率", "训练营退单率", "转化率"],
    cohorts: [
      { level: "R1", cohortId: "111151", cohortName: "R1-3期", status: "未开课", courseStartDate: "2026-09-28", sources: [{ name: "扩品", users: 28, userShare: 25, participation: 0, completion: 0, depth: 0, supplementCompletion: 0, refundRate: null, conversionRate: null }, { name: "用户召回", users: 47, userShare: 42, participation: 0, completion: 0, depth: 0, supplementCompletion: 0, refundRate: null, conversionRate: null }, { name: "APP部", users: 38, userShare: 34, participation: 0, completion: 0, depth: 0, supplementCompletion: 0, refundRate: null, conversionRate: null }] },
      { level: "R1", cohortId: "111150", cohortName: "R1-2期", status: "行课中", courseStartDate: "2026-09-21", sources: [{ name: "扩品", users: 206, userShare: 24, participation: 66.0, completion: 61.7, depth: 61.7, supplementCompletion: 0, refundRate: null, conversionRate: null }, { name: "用户召回", users: 273, userShare: 32, participation: 61.5, completion: 59.7, depth: 59.7, supplementCompletion: 0, refundRate: null, conversionRate: null }, { name: "APP部", users: 382, userShare: 44, participation: 54.5, completion: 51.8, depth: 51.8, supplementCompletion: 0, refundRate: null, conversionRate: null }] },
      { level: "R1", cohortId: "110963", cohortName: "R1-1期", status: "行课中", courseStartDate: "2026-09-14", sources: [{ name: "扩品", users: 82, userShare: 21, participation: 82.9, completion: 50.7, depth: 39.0, supplementCompletion: 29.6, refundRate: null, conversionRate: null }, { name: "用户召回", users: 80, userShare: 21, participation: 86.3, completion: 47.7, depth: 30.0, supplementCompletion: 17.6, refundRate: null, conversionRate: null }, { name: "APP部", users: 221, userShare: 58, participation: 80.5, completion: 47.7, depth: 25.3, supplementCompletion: 18.6, refundRate: null, conversionRate: null }] },
      { level: "R2", cohortId: "111169", cohortName: "R2-3期", status: "其他", statusNote: "截图包含1名其他状态用户，以及34名用户召回、13名APP部未开课用户", courseStartDate: "2026-09-28", sources: [{ name: "用户召回", users: 1, userShare: 100, participation: 0, completion: null, depth: 0, supplementCompletion: 0, refundRate: null, conversionRate: null, rowStatus: "其他", rowCourseStartDate: null }, { name: "用户召回", users: 34, userShare: 72, participation: 0, completion: 0, depth: 0, supplementCompletion: 0, refundRate: null, conversionRate: null, rowStatus: "未开课" }, { name: "APP部", users: 13, userShare: 28, participation: 0, completion: 0, depth: 0, supplementCompletion: 0, refundRate: null, conversionRate: null, rowStatus: "未开课" }] },
      { level: "R2", cohortId: "111168", cohortName: "R2-2期", status: "行课中", courseStartDate: "2026-09-21", sources: [{ name: "扩品", users: 13, userShare: 3, participation: 23.1, completion: 15.4, depth: 15.4, supplementCompletion: 0, refundRate: null, conversionRate: null }, { name: "用户召回", users: 312, userShare: 67, participation: 54.8, completion: 52.9, depth: 52.9, supplementCompletion: 0, refundRate: null, conversionRate: null }, { name: "APP部", users: 141, userShare: 30, participation: 54.6, completion: 51.8, depth: 51.8, supplementCompletion: 0, refundRate: null, conversionRate: null }] },
      { level: "R2", cohortId: "111166", cohortName: "R2-1期", status: "行课中", courseStartDate: "2026-09-14", sources: [{ name: "扩品", users: 66, userShare: 29, participation: 77.3, completion: 45.9, depth: 28.8, supplementCompletion: 24.2, refundRate: null, conversionRate: null }, { name: "用户召回", users: 66, userShare: 29, participation: 77.3, completion: 48.9, depth: 37.9, supplementCompletion: 28.1, refundRate: null, conversionRate: null }, { name: "APP部", users: 95, userShare: 42, participation: 73.7, completion: 45.7, depth: 34.7, supplementCompletion: 23.5, refundRate: null, conversionRate: null }] }
    ]
  },
  report: {
    rows: [
      { label: "关键节点服务策略有效性评估", text: "D5 24:00日终：总参与193人、正读183人，R1参与118人/正读115人，R2参与75人/正读68人；留存31.64%、深度30.00%，较D4日终参与减少47人、正读减少48人。正读占参与94.82%，参与质量稳定，但参与规模和留存继续下滑，需要结合D5 SOP执行与主管日报判断召回动作是否有效。" },
      { label: "策略目标是否达成以及分析", text: "M1W1周数据已回填：整体留存75.08%，高于周参考64% 11.08pp；整体深度38.03%，低于周参考61% 22.97pp；整体完课率56.33%，低于周参考72% 15.67pp。结论为留存目标达成，但深度和完课目标未达成，后续策略应从扩大参与转向提升完整学习和完课承接。" },
      { label: "策略对业务的支撑程度和规划", text: "M1W1 D1-D5日终数据已完整留存，周度页已同步每日趋势及R1/R2/整体周汇总。周汇总显示R1完课率57.08%、R2完课率55.07%，两组均低于72%参考；下一周重点拆解深度未达成、实际完课课时不足及渠道/服务动作的关联，并跟进主管日报动作证据。" },
      { label: "基建推进", text: "管理后台目前无法查看实时数据，问题已反馈；R线月课管理后台将重新评估取数和改造方案。当前采用R线数据模板手动导数，后续持续跟进后台改造。" },
      { label: "卡点", text: "管理后台目前无法直接使用，导致日内数据需要通过模板手动导出，影响实时观察、动作验证和日终结论产出效率。" },
      { label: "需求", text: "暂无新增需求；当前重点是跟进管理后台取数与改造问题，并完成动态SOP素材库建设。" },
      { label: "明日安排", text: "完成M1W1首周归档：核对D5 SOP发送、触达覆盖和主管日报反馈；补充R1/R2周度差异及渠道完课分析；以深度和完课为下一周优化重点，明确保留、调整和新增动作。" }
    ]
  },
  references: {
    daily: { retention: 72, depth: 69, completion: 69, label: "D1参考" },
    weekly: { retention: 64, depth: 61, completion: 72, label: "W1参考" },
    operations: {
      activityParticipation: null,
      activityConversion: null,
      monthlyTestParticipation: 15,
      monthlyTestFeedbackCoverage: 100,
      monthToYearRefundMultiChannel: 4.5,
      monthToYearRefundThreeChannel: 3
    }
  },
  sop: {
    week: "WEEK1",
    sourceUrl: null,
    lastSyncedStage: "M1W1D5",
    lastSyncedAt: "2026-09-20T00:00:00+08:00",
    syncStatus: "manual-source-capture",
    actions: [
      { id: "D1-0900", day: "D1", time: "09:00", channel: "Quicker", audience: "R1 / R2", action: "早签资料", goal: "首课激活", validation: "参与人数、正读人数" },
      { id: "D1-0930", day: "D1", time: "09:30", channel: "朋友圈1", audience: "所有用户", action: "APP下载&介绍", goal: "完成学习入口教育", validation: "APP进入及首课参与" },
      { id: "D1-1200", day: "D1", time: "12:00", channel: "朋友圈2", audience: "所有用户", action: "APP功能介绍", goal: "让家长知道书架等功能", validation: "功能触达与使用" },
      { id: "D1-1800-A", day: "D1", time: "18:00", channel: "Quicker", audience: "所有用户", action: "首日督学", goal: "推动首课完成与固定学习时间", validation: "当日正学完成" },
      { id: "D1-1800-B", day: "D1", time: "18:00", channel: "朋友圈3", audience: "所有用户", action: "本月活动露出", goal: "建立持续学习激励预期", validation: "活动曝光、后续完课" },
      { id: "D1-2030", day: "D1", time: "20:30", channel: "动态SOP", audience: "当日未完成", action: "晚间督学", goal: "召回未完成用户", validation: "次日补读/正读变化" },
      { id: "D2-0900", day: "D2", time: "09:00", channel: "Quicker", audience: "R1 / R2", action: "早签资料", goal: "启动当日学习，承接连续学习", validation: "当日参与人数、正读人数" },
      { id: "D2-1200", day: "D2", time: "12:00", channel: "朋友圈1", audience: "所有用户", action: "表彰昨日完成", goal: "强化完成反馈与持续学习动机", validation: "次日参与、正读及连续学习变化" },
      { id: "D2-1800-A", day: "D2", time: "18:00", channel: "Quicker", audience: "昨日未完成", action: "补读提醒", goal: "召回昨日未完成用户，推动补读", validation: "补读人数、补读完成率" },
      { id: "D2-1800-B", day: "D2", time: "18:00", channel: "朋友圈2", audience: "所有用户", action: "产品功能介绍", goal: "帮助家长理解并使用学习报告", validation: "APP功能触达与使用" },
      { id: "D2-2030", day: "D2", time: "20:30", channel: "动态SOP", audience: "当日未完成", action: "晚间督学", goal: "推动当日未完成用户完成学习", validation: "次日补读、正读变化" },
      { id: "D4-0900", day: "D4", time: "09:00", channel: "Quicker", audience: "R1 / R2", action: "早签资料", goal: "启动当日学习，复习并引入当日单词", validation: "参与人数、正读人数" },
      { id: "D4-1800", day: "D4", time: "18:00", channel: "Quicker", audience: "昨日未完成", action: "补读提醒", goal: "推动昨日未完成用户补读", validation: "补读人数、补读完成率" },
      { id: "D4-2030", day: "D4", time: "20:30", channel: "动态SOP", audience: "当日未完成", action: "督学", goal: "推动当日未完成用户完成学习", validation: "次日补读、正读变化" }
    ]
  },
  weekly: {
    currentWeek: "M1W1",
    status: "closed",
    dataStatus: "M1W1 D1-D5日终及官方周度结果已回填",
    fields: [
      { label: "周留存", value: 75.08, reference: 64, unit: "%" },
      { label: "周深度", value: 38.03, reference: 61, unit: "%" },
      { label: "周完课", value: 56.33, reference: 72, unit: "%" },
      { label: "月测参与", value: null, reference: 15, unit: "%" },
      { label: "月测反馈覆盖", value: null, reference: 100, unit: "%" }
    ],
    comparison: [
      { label: "周留存", actual: 75.08, reference: 64, unit: "%" },
      { label: "周深度", actual: 38.03, reference: 61, unit: "%" },
      { label: "周完课", actual: 56.33, reference: 72, unit: "%" }
    ],
    officialSummary: {
      totalUsers: 610,
      rows: [
        { label: "R1-1期", totalUsers: 383, participant: 299, retention: 78.07, depthCompletedUsers: 138, depth: 36.03, expectedLessonHours: 1915, completedLessonHours: 1093, completion: 57.08 },
        { label: "R2-1期", totalUsers: 227, participant: 159, retention: 70.04, depthCompletedUsers: 94, depth: 41.41, expectedLessonHours: 1135, completedLessonHours: 625, completion: 55.07 },
        { label: "1期总", totalUsers: 610, participant: 458, retention: 75.08, depthCompletedUsers: 232, depth: 38.03, expectedLessonHours: 3050, completedLessonHours: 1718, completion: 56.33 }
      ],
      source: "M1W1周数据表截图，历史差值列未纳入计算"
    },
    trend: {
      labels: ["D1", "D2", "D3", "D4", "D5"],
      datasets: [
        { label: "日留存参考", data: [72, 68, 65, 62, 55], color: "#16795a" },
        { label: "日深度参考", data: [69, 66.5, 63.5, 60.5, 52.5], color: "#4d8fe3" },
        { label: "日完课参考", data: [69, 69.2, 69.2, 69, 66.5], color: "#dd9d22" }
      ]
    },
    targets: {
      daily: {
        labels: ["D1", "D2", "D3", "D4", "D5"],
        retention: [72, 68, 65, 62, 55],
        depth: [69, 66.5, 63.5, 60.5, 52.5],
        completion: [69, 69.2, 69.2, 69, 66.5]
      },
      monthly: {
        labels: ["W1", "W2", "W3", "W4"],
        retention: [64, 54, 48.5, 42],
        depth: [61, 51.5, 46, 40.5],
        completion: [72, 68.8, 65.5, 62]
      }
    },
    keyTrends: {
      labels: ["D5·24:00"],
      datasets: [
        { label: "参与人数", data: [193], color: "#4d8fe3" },
        { label: "正读人数", data: [183], color: "#2ea76f" },
        { label: "参与未完成人数", data: [10], color: "#e86c56" }
      ]
    }
  },
  history: {
    model: "append-only-daily-observations",
    cohorts: [
      { id: "rline-2026-09-14-1", name: "1期", startDate: "2026-09-14", status: "active" }
    ],
    daily: [
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-14", week: "M1W1", day: "D1", stage: "M1W1D1", asOf: "12:00", status: "partial", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 31, positiveRead: 27, retention: 8.09, depth: 7.05, absent: 352, notFinished: 4 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 20, positiveRead: 15, retention: 8.81, depth: 6.61, absent: 207, notFinished: 5 }], metrics: { participant: 51, positiveRead: 42, retention: 8.36, depth: 6.89, absent: 559, notFinished: 9 }, capturedAt: "2026-09-14T12:00:00+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-14", week: "M1W1", day: "D1", stage: "M1W1D1", asOf: "14:00", status: "partial", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 39, positiveRead: 34, retention: 10.18, depth: 8.88, absent: 344, notFinished: 5 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 20, positiveRead: 15, retention: 8.81, depth: 6.61, absent: 207, notFinished: 5 }], metrics: { participant: 59, positiveRead: 49, retention: 9.67, depth: 8.03, absent: 551, notFinished: 10 }, capturedAt: "2026-09-14T14:00:00+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-14", week: "M1W1", day: "D1", stage: "M1W1D1", asOf: "18:00", status: "partial", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 61, positiveRead: 53, retention: 15.93, depth: 13.84, absent: 322, notFinished: 8 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 30, positiveRead: 22, retention: 13.22, depth: 9.69, absent: 197, notFinished: 8 }], metrics: { participant: 91, positiveRead: 75, retention: 14.92, depth: 12.3, absent: 519, notFinished: 16 }, review: { effectiveness: "18:00阶段参与91人、正读75人，较14:00分别增加32人和26人；触达后参与与正读有增量，但留存和深度仍低于D1参考，日终结果尚未验证。", actionResult: "待日终动作回写回写：首日督学、活动露出和晚间督学的实际发送、触达覆盖及用户反馈。", nextStep: "继续回收24:00日终数据，并在D2回看D1参与未完成用户的补读/正读变化。" }, capturedAt: "2026-09-14T18:19:24+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-14", week: "M1W1", day: "D1", stage: "M1W1D1", asOf: "24:00", status: "closed", isDayEnd: true, totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 239, positiveRead: 227, retention: 62.4, depth: 59.27, absent: 144, notFinished: 12 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 124, positiveRead: 118, retention: 54.63, depth: 51.98, absent: 103, notFinished: 6 }], metrics: { participant: 363, positiveRead: 345, retention: 59.51, depth: 56.56, absent: 247, notFinished: 18 }, review: { effectiveness: "D1日内参与从12:00的51人、14:00的59人、18:00的91人，最终增长至24:00的363人；正读从42人增长至345人。触达动作带来了持续增量，但最终留存59.51%、深度56.56%，仍未达到D1参考72%和69%。", actionResult: "已形成12:00、14:00、18:00、24:00四个真实时点；首日督学、活动露出及晚间动作的发送覆盖与用户反馈，仍需日终动作回写作为动作证据补齐。", nextStep: "D2优先关注D1参与未完成18人的补读/正读变化，并对比D1日内各时点增量，判断晚间督学和次日承接是否有效。" }, capturedAt: "2026-09-14T23:59:00+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-15", week: "M1W1", day: "D2", stage: "M1W1D2", asOf: "12:00", status: "partial", dataStatus: "12:00已回填，等待14:00/18:00/24:00", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 20, positiveRead: 18, retention: 5.22, depth: 4.7, absent: 363, notFinished: 2 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 12, positiveRead: 12, retention: 5.29, depth: 5.29, absent: 215, notFinished: 0 }], metrics: { participant: 32, positiveRead: 30, retention: 5.25, depth: 4.92, absent: 578, notFinished: 2 }, pending: ["14:00", "18:00", "24:00"], capturedAt: "2026-09-15T14:50:43+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-15", week: "M1W1", day: "D2", stage: "M1W1D2", asOf: "14:00", status: "partial", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 38, positiveRead: 32, retention: 9.92, depth: 8.36, absent: 345, notFinished: 6 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 17, positiveRead: 15, retention: 7.49, depth: 6.61, absent: 210, notFinished: 2 }], metrics: { participant: 55, positiveRead: 47, retention: 9.02, depth: 7.7, absent: 555, notFinished: 8 }, capturedAt: "2026-09-16T09:11:56+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-15", week: "M1W1", day: "D2", stage: "M1W1D2", asOf: "18:00", status: "partial", dataStatus: "18:00已回填，14:00待补录，24:00待回收", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 41, positiveRead: 32, retention: 10.7, depth: 8.36, absent: 342, notFinished: 9 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 20, positiveRead: 19, retention: 8.81, depth: 8.37, absent: 207, notFinished: 1 }], metrics: { participant: 61, positiveRead: 51, retention: 10.0, depth: 8.36, absent: 549, notFinished: 10 }, pending: ["24:00"], missing: ["14:00"], capturedAt: "2026-09-15T18:10:46+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-15", week: "M1W1", day: "D2", stage: "M1W1D2", asOf: "24:00", status: "closed", isDayEnd: true, totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 178, positiveRead: 167, retention: 46.48, depth: 43.6, absent: 205, notFinished: 11 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 102, positiveRead: 99, retention: 44.93, depth: 43.61, absent: 125, notFinished: 3 }], metrics: { participant: 280, positiveRead: 266, retention: 45.9, depth: 43.61, absent: 330, notFinished: 14 }, review: { effectiveness: "D2日终参与280人、正读266人，较18:00分别增加219人和215人；正读占参与95.00%，参与未完成14人，占参与5.00%。较D1日终参与363人、正读345人分别下降83人和79人，留存和深度也分别下降13.61pp、12.95pp。", actionResult: "D2 12:00、14:00、18:00、24:00四个时点均已留存；日终动作回写显示跟读意愿较高，但词汇偏多且相似、题型偏信息检索、复述/趣味游戏/口语输出不足，失联用户手动补加20人仅3人通过。", nextStep: "D3继续关注D2参与未完成14人的补读/正读变化，验证补读提醒与晚间督学是否带来回流；同步推动R1词汇引入环节增加开口练习的产运/教研评估。" }, capturedAt: "2026-09-16T09:11:56+08:00" }
      , { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-16", week: "M1W1", day: "D3", stage: "M1W1D3", asOf: "24:00", status: "closed", isDayEnd: true, totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 153, positiveRead: 150, retention: 39.95, depth: 39.16, absent: 230, notFinished: 3 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 93, positiveRead: 91, retention: 40.97, depth: 40.09, absent: 134, notFinished: 2 }], metrics: { participant: 246, positiveRead: 241, retention: 40.33, depth: 39.51, absent: 364, notFinished: 5 }, review: { effectiveness: "D3日终参与246人、正读241人，较18:00阶段分别增加189人和188人；正读占参与98.0%，参与未完成5人，占参与2.03%。较D2日终参与/正读下降34人/25人，留存、深度继续低于参考。", actionResult: "已补齐D3 24:00日终结果；D3实际SOP发送覆盖和用户反馈仍需主管日报或发送记录补充验证。", nextStep: "D4继续关注D3日终参与未完成5人的补读/正读变化，并结合D4阶段数据判断晚间督学和补读动作是否带来回流。" }, capturedAt: "2026-09-17T18:34:43+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-17", week: "M1W1", day: "D4", stage: "M1W1D4", asOf: "18:00", status: "partial", dataStatus: "18:00已回填，24:00待回收", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 38, positiveRead: 36, retention: 9.92, depth: 9.4, absent: 345, notFinished: 2 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 27, positiveRead: 27, retention: 11.89, depth: 11.89, absent: 200, notFinished: 0 }], metrics: { participant: 65, positiveRead: 63, retention: 10.66, depth: 10.33, absent: 545, notFinished: 2 }, pending: ["24:00"], capturedAt: "2026-09-17T18:34:43+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-17", week: "M1W1", day: "D4", stage: "M1W1D4", asOf: "24:00", status: "closed", isDayEnd: true, dataStatus: "24:00已回填，参与未完成待补齐", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 145, positiveRead: 141, retention: 37.86, depth: 36.81, absent: 238 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 95, positiveRead: 90, retention: 41.85, depth: 39.65, absent: 132 }], metrics: { participant: 240, positiveRead: 231, retention: 39.34, depth: 37.87, absent: 370, notFinished: null }, missing: ["notFinished"], capturedAt: "2026-09-18T11:21:57+08:00" },
      { cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", date: "2026-09-18", week: "M1W1", day: "D5", stage: "M1W1D5", asOf: "24:00", status: "closed", isDayEnd: true, dataStatus: "24:00已回填", totalUsers: 610, split: [{ level: "R1", className: "R1-1期", owner: "温笛-敬雯涵", totalUsers: 383, participant: 118, positiveRead: 115, retention: 30.81, depth: 30.03, absent: 265, notFinished: 3 }, { level: "R2", className: "R2-1期", owner: "温笛-敬雯涵", totalUsers: 227, participant: 75, positiveRead: 68, retention: 33.04, depth: 29.96, absent: 152, notFinished: 7 }], metrics: { participant: 193, positiveRead: 183, retention: 31.64, depth: 30.00, absent: 417, notFinished: 10 }, capturedAt: "2026-09-20T00:00:00+08:00" }
    ],
    weekly: [{ cohortId: "rline-2026-09-14-1", cohortName: "1期", courseStartDate: "2026-09-14", week: "M1W1", status: "closed", dataStatus: "M1W1 D1-D5日终及官方周度结果已回填", daysCaptured: 5, expectedDays: 5, latestDay: "D5", latestAsOf: "24:00", summary: { retention: 75.08, depth: 38.03, completion: 56.33 }, officialSummary: { totalUsers: 610, rows: [{ label: "R1-1期", totalUsers: 383, participant: 299, retention: 78.07, depthCompletedUsers: 138, depth: 36.03, expectedLessonHours: 1915, completedLessonHours: 1093, completion: 57.08 }, { label: "R2-1期", totalUsers: 227, participant: 159, retention: 70.04, depthCompletedUsers: 94, depth: 41.41, expectedLessonHours: 1135, completedLessonHours: 625, completion: 55.07 }, { label: "1期总", totalUsers: 610, participant: 458, retention: 75.08, depthCompletedUsers: 232, depth: 38.03, expectedLessonHours: 3050, completedLessonHours: 1718, completion: 56.33 }] }, dailyEndMetrics: [{ day: "D1", date: "2026-09-14", participant: 363, positiveRead: 345, retention: 59.51, depth: 56.56, absent: 247, notFinished: 18 }, { day: "D2", date: "2026-09-15", participant: 280, positiveRead: 266, retention: 45.9, depth: 43.61, absent: 330, notFinished: 14 }, { day: "D3", date: "2026-09-16", participant: 246, positiveRead: 241, retention: 40.33, depth: 39.51, absent: 364, notFinished: 5 }, { day: "D4", date: "2026-09-17", participant: 240, positiveRead: 231, retention: 39.34, depth: 37.87, absent: 370, notFinished: null }, { day: "D5", date: "2026-09-18", participant: 193, positiveRead: 183, retention: 31.64, depth: 30.00, absent: 417, notFinished: 10 }], capturedAt: "2026-09-20T00:00:00+08:00" }]
  },
  monthly: {
    currentMonth: "M1",
    stages: [
      { code: "M1W1", label: "启航激活", focus: "首课参与、入口教育、学习习惯启动", metrics: "日留存、日深度、首课正读" },
      { code: "M1W2", label: "习惯建立", focus: "连续学习、补读召回、周单词复习", metrics: "周留存、补读召回率、连续学习率" },
      { code: "M1W3", label: "成果外化", focus: "单词PK、复习直播、月测准备", metrics: "活动参与、直播观看、月测参与" },
      { code: "M1W4", label: "反馈与进阶", focus: "成长报告、月测反馈、下一阶段建议", metrics: "报告送达/查看、反馈覆盖、进阶承接" }
    ]
  },
  sourceLinks: [
    { label: "R线运营SOP", url: null },
    { label: "1期行课数据", url: null },
    { label: "R线行课运营参考标准", url: null }
  ]
});
