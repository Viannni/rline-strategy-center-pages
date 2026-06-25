const tagSeed = [
  ["A01", "累积完课率", "学情行为", "P0核心", "已有", "每日/每周", "阅读完成率、读后完成率、已完成绘本/篇章"],
  ["A02", "完课分层", "学情行为", "P0核心", "已有", "每周", "S/A/B/C/D分层，重点看跌档用户"],
  ["A03", "连续打卡天数", "学情行为", "P1重要", "缺失待补", "每日", "R线必须补埋点；一期可用按时完成节数近似"],
  ["A04", "近14天活跃天数", "学情行为", "P1重要", "部分可用", "每日/每周", "近14天阅读、复习、测评活跃天数"],
  ["A05", "完课趋势箭头", "行为趋势", "P0核心", "部分可用", "每周", "4周趋势；月课按W1-W4滚动"],
  ["A06", "培测成绩", "学情行为", "P0核心", "已有", "测评后/月度", "定级测、月测、期中测、升阶测"],
  ["A07", "学习深度", "学情行为", "P2补充", "缺失待补", "每日/每周", "读前/读中/读后、开口、互动题、点选、填空"],
  ["A08", "中台质量分层", "学情行为", "P0核心", "已有", "每月", "作为用户质量底座，不直接触达用户"],
  ["A09", "薄弱知识模块", "学情行为", "P1重要", "部分可用", "测评后/月度", "词汇、句型、阅读理解、跟读薄弱项"],
  ["A10", "学习时段偏好", "学情行为", "P2补充", "缺失待补", "每月", "用于触达时机，不进入续费硬分"],
  ["B01", "续费意愿", "家长对话", "P0核心", "已有", "每周/事件后", "问卷、沟通、AI/指导师回收"],
  ["B02", "服务满意度", "家长对话", "P1重要", "已有", "每月/问卷后", "区分AI、真人、讲座、直播价值"],
  ["B03", "进步感知", "家长对话", "P1重要", "已有", "每月/报告后", "家长是否看见词汇、阅读量、开口、测评进步"],
  ["B04", "沟通情感倾向", "家长对话", "P0核心", "部分可用", "实时", "正向/中性/负向/投诉关键词，先关键词后NLP"],
  ["B05", "触达响应率", "家长对话", "P0核心", "部分可用", "每周", "近30天消息打开、回复、预约、点击"],
  ["B06", "活动参与度", "家长对话", "P1重要", "已有", "活动后/月度", "单词PK、节日比赛、阅读挑战、复习直播"],
  ["B07", "投诉/退款信号", "家长对话", "P0核心", "部分可用", "实时", "熔断标签，一旦触发暂停销售"],
  ["B08", "家长英语水平", "用户画像", "P2补充", "已有", "每月/问卷后", "用于替代辅导、亲子共读、轻松不费妈话术"],
  ["C01", "新老用户", "用户画像", "P0核心", "已有", "每月", "老用户、首次购买、月课试用、正价课用户分层"],
  ["C02", "在校年级", "用户画像", "P1重要", "已有", "每月/年度", "3-6岁强调兴趣，7-12岁强调KET/PET规划"],
  ["C03", "城市等级", "用户画像", "P1重要", "已有", "每月", "只做微调，不作为强判断"],
  ["C04", "购买价格段", "用户画像", "P1重要", "已有", "订单后/月度", "需改为R线价格：月课20/30、半年240、年课480"],
  ["C05", "多科在读数", "用户画像", "P1重要", "已有", "每月", "多科用户信任度高，同时注意时间冲突"],
  ["C06", "其他科续费状态", "用户画像", "P0核心", "已有", "每月", "其他科已续是高信任信号"],
  ["C07", "第三方画像补充", "用户画像", "P2补充", "缺失待补", "每月", "一期不作为规则硬门槛"],
  ["D01", "是否进群", "转化信号", "P1重要", "已有", "每周/事件后", "R线无社群时改为私域/企微/服务入口已建立"],
  ["D02", "领券行为", "转化信号", "P0核心", "已有", "实时", "临门信号，领券未付生成P0任务"],
  ["D03", "直播参与", "转化信号", "P2补充", "已有", "实时/活动后", "复习直播、阅读讲座、家长会到场/回放"],
  ["D04", "问卷填写", "转化信号", "P1重要", "已有", "问卷后/月度", "月课调研、续费问卷、服务偏好问卷"],
  ["D05", "价格异议", "转化信号", "P0核心", "部分可用", "每周/事件后", "低价产品也记录值不值、权益不清、比价原因"],
  ["D06", "时间异议", "转化信号", "P0核心", "部分可用", "每周/事件后", "没时间、孩子坚持不了、课外安排冲突"],
  ["D07", "竞品接触信号", "转化信号", "P2补充", "缺失待补", "每月/事件后", "一期用沟通关键词，不做强判断"],
  ["E01", "完课环比变化", "行为趋势", "P0核心", "已有", "每月/每周近似", "正价课看月变，月课看周变"],
  ["E02", "近30天触达饱和度", "行为趋势", "P1重要", "部分可用", "每周", "控制1:1000下的打扰，决定是否继续人工触达"],
  ["E03", "CSI月度变化", "行为趋势", "P0核心", "已有", "每月", "复盘用，下钻到拖后腿标签"],
  ["E04", "续费意向变化趋势", "行为趋势", "P0核心", "部分可用", "每周/事件后", "继续到拒绝的急转比一直拒绝更要紧"],
  ["E05", "服务响应时延", "行为趋势", "P2补充", "部分可用", "每周", "服务侧KPI，不直接当用户问题"],
  ["E06", "分享/推荐行为", "行为趋势", "P2补充", "缺失待补", "每周/事件后", "报告分享、绘本分享、邀请体验"]
];

const formulas = {
  A01: "完课率 = 已完成绘本/篇章数 ÷ 应完成数 × 100。月课近7天权重60%，8-14天权重30%，历史累计10%。",
  A02: "S=100，A=80，B=60，C=40，D=20。若从S/A跌到C/D，自动生成习惯修复任务。",
  A03: "0天=20，1-2天=40，3-6天=70，7天及以上=100。连续中断2天后不清零，先进入补读提醒。",
  A04: "近14天活跃分 = 活跃天数 ÷ 14 × 100。活跃包含阅读、复习、测评、卡册、书架回放。",
  A05: "最近窗口 - 上一窗口：>+5=100，0~+5=70，-5~0=40，<-5=10。连续两次下降升级P0预警。",
  A06: "定级测/阶段测按原始分折算；未参与不直接记0，先标记未参与，连续两次未参与才降权。",
  A07: "学习深度 = 读前完成20 + 正文有效阅读30 + 读后练习25 + 开口/音频15 + 互动正确率10。",
  A08: "沿用中台质量层级；仅作为底层可信度和任务排序参考，不对家长展示。",
  A09: "按薄弱模块数量与严重程度标记：无薄弱=100，单模块轻度=75，多模块/连续薄弱=40。",
  A10: "统计30天内学习开始时间，形成早/午/晚/睡前偏好；用于触达时机，不直接拉高续费分。",
  B01: "明确继续=100，考虑中=50，观望=30，拒绝=10，未知=30；问卷与沟通不一致时取更保守值。",
  B02: "认可≥2项=100，认可1项=70，0项=30，未填写=50；超过60天未更新每月-5%，最低50。",
  B03: "有具体进步描述=100，泛泛认可=70，感觉进步不大=20，未填写=40。",
  B04: "正面=100，中性=60，负面=20，投诉/退款=0并触发熔断。MVP先用关键词规则。",
  B05: "近30天回复率≥60%=100，30-59%=70，10-29%=40，<10%=10，从未回复=0。",
  B06: "参与活动=100，仅领取资料=60，未参与=20，未覆盖=30。活动结束后即时回写。",
  B07: "无信号=100，有疑虑表达=40，明确投诉/退款=0；触发后冻结销售动作14天。",
  B08: "家长英语好=80，一般=100，较差=100，未填写=50。产品替代辅导价值越强，刚需越高。",
  C01: "老用户/已续用户=100，新用户/首次购买=50；月课新用户首30天叠加置信度。",
  C02: "3-6岁核心兴趣启蒙=100，7-9岁=80，10-12岁=70并叠加出口规划标签。",
  C03: "一线/新一线=100，二线=80，三线=60，四线及以下=50。仅微调，不做硬阈值。",
  C04: "R线需重写：月课20/30、半年240、年课480为主口径；若499/899并存，先标口径待确认。",
  C05: "同时≥3科=100，2科=80，1科=50；多科但时间异议高时不额外加权。",
  C06: "已续其他科=100，未续=30，不适用=50；高信任但仍需看R线学习健康。",
  C07: "待第三方或渠道画像接入后定义；MVP不进入分母。",
  D01: "R线无社群时替换为服务入口建立：已加企微/已建服务关系=100，未建立=20。",
  D02: "已领券=100，未领券=30；领券30天未用每日-2%，最低30。",
  D03: "直播到场=100，回放≥5分钟=70，仅预约未到=50，未参与=30。",
  D04: "已填写=100，未填写但有其他数据=40；问卷内容同时回写B01/B02/B03/D05/D06。",
  D05: "无价格异议=100，有疑虑=30。若用户问价但未拒绝，不当作负向，只标记待解释。",
  D06: "无时间异议=100，有时间疑虑=20；寒暑假窗口可自动恢复+20。",
  D07: "无竞品信号=100，有提及竞品=30；一期只做备注，不触发强扣分。",
  E01: "本月完课率 - 上月完课率：>+5=100，0~+5=70，-5~0=40，<-5=10。",
  E02: "触达饱和度 = 近30天已用触达数 ÷ 30 × 100。50-80%最佳，>90%进入限流。",
  E03: "本月CSI - 上月CSI：>+10快速增长，+3~+10稳步提升，-3~+3持平，<-10快速下滑。",
  E04: "对比近两次B01：上升=100，持平=60，下降=10。下降时优先查触发事件。",
  E05: "平均响应时延：<2h=100，2-8h=80，8-24h=50，>24h=20。",
  E06: "有分享/推荐=100，无=30；包括报告分享、绘本分享、邀请体验。"
};

const sources = {
  A01: "现有完成率/完成节数字段 + R线阅读完成事件",
  A02: "现有完课分层字段 + R线周/月窗口重算",
  A03: "需产品埋点：每日完成学习行为；一期可用按时完成节数近似",
  A04: "参与率、参与节数、阅读/复习/测评事件",
  A05: "完成率、按时完成率、补读率、未完成节数",
  A06: "定级测、月测、期中测、升阶测成绩",
  A07: "需产品埋点：读前/读中/读后/开口/互动题/查词",
  A08: "现有中台质量分层",
  A09: "问卷薄弱板块 + 培测成绩 + 后续产品内逐题正确率",
  A10: "需产品埋点：学习起始时间戳",
  B01: "蜜续/续费问卷、指导师沟通回收、AI Agent回收",
  B02: "服务满意问卷、1V1规划反馈、讲座/直播反馈",
  B03: "成长报告打开后反馈、问卷进步描述、私聊正向反馈",
  B04: "企微/客服/句子互动文本关键词",
  B05: "企微/句子互动已读、点击、回复日志",
  B06: "活动系统、直播系统、问卷活动参与字段",
  B07: "客服系统、企微文本、退款/投诉关键词",
  B08: "用户问卷",
  C01: "注册时间、购买时间、新老用户字段",
  C02: "宝贝年龄、宝贝年级、定级信息",
  C03: "城市等级、订单地址、收货地址、IP fallback",
  C04: "订单价格、SKU、权益内容、优惠券",
  C05: "计划数量、计划品类、用户计划",
  C06: "其他科续费状态、计划列表",
  C07: "第三方画像或渠道画像，待接入",
  D01: "企微加指导师状态、服务入口绑定",
  D02: "领券时间、券状态、支付订单",
  D03: "直播预约、到场、回放、互动明细",
  D04: "月课调研、服务偏好问卷、续费问卷",
  D05: "异议点、不续费原因、沟通关键词",
  D06: "异议点、不续费原因、学习时间反馈",
  D07: "沟通关键词或第三方竞品数据，待接入",
  E01: "月度完成率与周度近似窗口",
  E02: "企微/Push/AI触达次数",
  E03: "CSI月度快照",
  E04: "B01历史快照",
  E05: "服务消息时间戳",
  E06: "分享按钮、报告转发、邀请体验事件"
};

const tags = tagSeed.map(([id, name, category, priority, availability, refresh, rline]) => ({
  id,
  name,
  category,
  priority,
  availability,
  refresh,
  rline,
  formula: formulas[id],
  source: sources[id]
}));

const users = [
  {
    id: "R1月课A",
    stage: "T24",
    tier: "H1",
    reason: "20天完成18本，卡册查看12次，报告打开，已领券未付",
    action: "24小时内做年课规划和权益提醒",
    risk: "无",
    details: ["学习健康高，已经形成阅读节奏。", "效果外化完成，家长打开过报告。", "商业动作明确，领券未支付需要临门任务。"],
    next: ["指导师发送年课路径和返券说明。", "若24小时无回复，切换为未支付提醒。", "支付后回写D02/E04并移出临门任务。"]
  },
  {
    id: "R1月课B",
    stage: "T18",
    tier: "H2",
    reason: "完成16本，家长未打开报告，无领券",
    action: "推月课成果报告和词汇累计数据",
    risk: "商业意向不足",
    details: ["孩子侧学得动，但家长侧价值感知不足。", "不宜直接推销售，先做效果外化。", "适合进入T21成果报告预热。"],
    next: ["推送10/20本小结。", "引导查看已读绘本、核心词和卡册资产。", "报告打开后再看是否转H1。"]
  },
  {
    id: "R2月课C",
    stage: "T14",
    tier: "H3",
    reason: "家长预约讲座，孩子漏学4天",
    action: "补读提醒 + 复习直播邀约",
    risk: "学习节奏不稳",
    details: ["家长认知可达，但孩子学习健康不稳。", "如果先销售，容易被时间异议打断。", "适合用复习直播和补读任务提分。"],
    next: ["先生成补读任务。", "推送T14单词PK或复习直播。", "连续3天恢复后再进入H2。"]
  },
  {
    id: "R3正价D",
    stage: "M3",
    tier: "H2",
    reason: "测评完成，薄弱项为词汇复现，家长正向回复",
    action: "邀约季度词汇复习直播",
    risk: "无",
    details: ["M3是第一次阶段成果外化节点。", "薄弱项明确，适合用中心化复习直播解决。", "直播后可以承接下一阶段学习规划。"],
    next: ["邀约季度复习直播。", "直播后回写B06/A09。", "向家长解释词汇复现和阅读量的长期价值。"]
  },
  {
    id: "R1月课E",
    stage: "T9",
    tier: "H4",
    reason: "完课低，三次无响应，提出退款",
    action: "暂停销售，主管处理体验原因",
    risk: "退款熔断",
    details: ["触发B07风险，不能进入转化队列。", "当前问题不是续费，而是体验修复和止损。", "需要回收退款原因，反哺产品/服务。"],
    next: ["主管接管。", "记录退款原因：难度、时间、体验、价格或服务。", "14天内只允许修复动作。"]
  }
];

const monthlyStages = [
  ["T0-T3", "激活期", "定级测、首课、读前开始；看首课完成和登录。", ["定级测完成", "首课开始", "首课完成", "首次读前导读"], ["未激活提醒", "首课卡点处理", "进入习惯期"]],
  ["T4-T10", "习惯期", "连续学、近7天完课、漏学；推打卡与低压提醒。", ["连续学习", "漏学天数", "近7天完课", "补读行为"], ["7天阅读打卡", "漏学2天提醒", "补读任务"]],
  ["T11-T16", "效果期", "10课小结、词汇/绘本数据、卡册使用。", ["已读绘本", "已获卡牌", "卡册查看", "互动正确率"], ["10本阅读小结", "单词PK", "报告预热"]],
  ["T17-T21", "认知期", "讲座预约、复习直播、家长回复。", ["讲座预约", "直播到场", "报告打开", "家长回复"], ["阅读讲座邀约", "复习直播", "1V1规划预约"]],
  ["T22-T26", "转化期", "报告、年课路径、领券、问价、下单未付。", ["年课页访问", "领券", "问价", "下单未付"], ["年课路径说明", "返券提醒", "临门任务"]],
  ["T27-T28", "收口期", "支付、未支付、异议、返场和任务回写。", ["支付", "未支付", "价格异议", "时间异议"], ["异议回收", "未支付返场", "模型复盘"]]
];

const annualStages = [
  ["M1", "习惯稳定", "看学习趋势、漏学、月度报告打开。", ["月度完课", "趋势箭头", "漏学", "报告打开"], ["月度阅读报告", "阅读挑战", "学习节奏修复"]],
  ["M3", "效果外化", "季度词汇/句型复习直播，第一次阶段成果。", ["季度测评", "词汇复现", "复习直播", "进步感知"], ["季度复习直播", "单词PK", "阶段规划"]],
  ["M6", "诊断调整", "期中测、学习规划、时间/难度异议。", ["期中测", "难度适配", "时间异议", "续费意愿"], ["期中规划", "难度调节", "续费铺垫"]],
  ["M9", "高阶规划", "KET/PET规划讲座，强化长期出口。", ["阅读能力报告", "年级适配", "家长规划意愿", "高阶讲座"], ["KET/PET讲座", "长期路线图", "高阶价值沟通"]],
  ["M12", "升阶续费", "升阶测、全年阅读护照、下一阶段路径。", ["升阶测", "全年报告", "领券", "续费意向"], ["升阶证书", "全年护照", "续费任务"]],
  ["节点外", "低频养护", "只处理风险、断学和关键服务响应。", ["断学", "风险", "触达饱和", "服务响应"], ["低频提醒", "风险修复", "自动触达"]]
];

const cycles = [
  ["实时", "5-15分钟", "投诉、退款、领券、直播、下单未付、负向情绪。", "风险任务、临门任务", ["B04", "B07", "D02", "D03"], "适合处理不可错过的销售和风险事件。"],
  ["每日", "02:00计算，09:00派发", "连续学、漏学、读前/中/后、卡册、书架、互动题。", "习惯修复、效果提醒", ["A03", "A04", "A07"], "月课强依赖每日节奏，正价课只看异常。"],
  ["每周", "周一08:00 + W节点", "完课、趋势、触达响应、异议、触达饱和。", "高优任务、提分任务", ["A01", "A02", "A05", "B05", "D05", "D06", "E02", "E04"], "用于指导师任务量控制和策略周复盘。"],
  ["每月", "每月1日 + 报告后", "培测、进步感知、满意度、用户画像、CSI月变。", "报告解读、节点运营", ["A06", "B02", "B03", "C01-C06", "E03"], "用于正价课月度经营和长期续费铺垫。"],
  ["节点", "事件后即时回算", "月测、期中测、升阶测、讲座、比赛、返券。", "人群迁移、任务回写", ["A06", "B06", "D02", "D03", "D04"], "活动后必须看人群是否从H3迁移到H2/H1。"]
];

const taskRules = [
  ["P0", "风险修复", "投诉、退款、删除、强负向情绪", "2小时", "主管/人工介入，暂停销售", ["B07=0", "B04负向", "退款订单"], ["主管接管", "记录原因", "14天保护期"]],
  ["P0", "临门转化", "领券未用、下单未付、主动问价", "24小时", "规划解读、权益提醒、异议处理", ["D02=100", "下单未付", "问价"], ["发送年课路径", "解释权益", "未支付返场"]],
  ["P1", "高优转化", "H1且处于W4/M6/M12", "当日", "1V1学习规划", ["高优≥75", "商业意向≥60", "无熔断"], ["预约规划", "发报告", "记录意向"]],
  ["P1", "效果外化", "完课高或测评完成但报告未打开", "48小时", "引导看报告，解释成果", ["A01高", "A06完成", "B03低"], ["推报告", "解释词汇/阅读量", "看是否进H1"]],
  ["P2", "提分邀约", "H3且运营提分潜力≥70", "72小时", "邀约讲座/复习直播/比赛", ["H3", "B05可达", "窗口接近"], ["圈选活动", "回收报名", "看分层迁移"]],
  ["P3", "习惯修复", "漏学2-3天，前期学得动", "72小时", "低压补读提醒", ["漏学2-3天", "此前A01不低"], ["补读提醒", "降低任务门槛", "恢复后回流"]]
];

const operations = [
  ["T7", "7天阅读打卡", "完成≥5本用户", "A03/A04", "学习健康 +5~10", ["阅读连续性不稳但已有完课基础", "月课T4-T10"], ["报名", "连续学天数", "完赛", "后续完课率"]],
  ["T10", "10本阅读小结", "完成≥8本用户", "B03/D04", "效果外化 +8", ["孩子学得动但家长未感知", "报告未打开用户"], ["报告打开", "私聊回复", "领券"]],
  ["T14", "单词PK/复习任务", "卡册有积累用户", "A07/B06", "复习深度 +5~12", ["卡册有词但复习少", "读后正确率一般"], ["报名", "完赛", "卡册复习次数"]],
  ["T18", "阅读讲座邀约", "H2/H3用户", "B01/B06", "家长互动 +5~12", ["家长可达但认知不足", "对长期阅读价值模糊"], ["预约", "到场", "回放", "后续咨询"]],
  ["T21", "月课成果报告", "完课≥12本用户", "B03/D04", "商业准备 +8", ["学了但没有购买动作", "报告未打开"], ["打开", "转发", "回复", "领券"]],
  ["T24", "年课路径+返券", "H1/H2用户", "D02/E04", "商业意向 +10~20", ["高学习健康且无风险", "接近月课收口"], ["领券", "问价", "下单", "支付"]],
  ["M3", "季度复习直播", "正价课阶段用户", "A09/B03", "进步感知 +8~15", ["薄弱模块明确", "家长需要阶段成果"], ["到场", "互动", "测后提升"]],
  ["M9", "KET/PET规划讲座", "7-12岁与高阶用户", "B01/B03", "长期价值 +8~12", ["高年级或高阶用户", "家长关注出口"], ["预约", "到场", "规划咨询"]],
  ["M12", "升阶测+阅读护照", "到期用户", "A06/B03/D02", "续费准备 +10~20", ["到期/升阶用户", "全年学习数据完整"], ["升阶测", "报告打开", "续费支付"]]
];

const demands = [
  ["P0", "数据事件", "阅读开始、完成、读前/中/后、互动题、测评、报告、卡册、书架、领券、支付", "产品/数据", "能按用户ID、课程ID、时间戳查询", ["先接月课T0-T28关键事件", "事件必须有userId、courseId、eventTime、source"]],
  ["P0", "标签计算", "沿用A/B/C/D/E标签，补R线事件映射", "数据", "每天输出用户标签值和更新时间", ["不改变CSI底层，只加R线映射", "缺失标签不进入分母"]],
  ["P0", "分数引擎", "CSI、高优识别分、运营提分潜力", "数据/产品", "能解释每个用户分数来源", ["分数必须可下钻到标签", "每次触达后能看分数变化"]],
  ["P0", "任务引擎", "P0-P4任务自动生成", "产品/学服", "指导师能看到任务原因和动作", ["任务不只显示分数", "必须有触发原因、推荐动作、回收字段"]],
  ["P0", "风险熔断", "投诉/退款/负向情绪暂停销售动作", "产品/学服", "风险用户不会进入销售任务", ["B07触发后14天保护", "主管或风险队列可见"]],
  ["P0", "CRM标签/分群承接", "高优识别结果输出为CRM标签或用户分群，供营销中心活动生效对象圈选", "CRM/数据/产品", "活动新建页可搜索并选择R线H1/H2/H3/H4标签或分群", ["scopeData用于标签ID多选", "userGroupIdList用于用户分群ID多选", "修复当前用户分群接口403权限"]],
  ["P0", "营销活动回写", "活动报名、到场、完赛、分享、领券、支付回写用户分数", "营销中心/数据", "活动ID能关联用户ID并回写B06/D02/D03/E04", ["活动列表已有数据入口", "需要确认各活动类型可回传事件", "R线活动必须有统一act code命名"]],
  ["P0", "看板", "高优池、任务执行、提分、转化、风险", "数据/策略", "每日可看用户数、转化率、迁移率", ["按H1-H4分层", "按指导师、阶段、活动下钻"]],
  ["P1", "活动圈选", "按运营提分潜力圈选活动/讲座人群", "产品/策略", "能导出人群包并回收活动结果", ["H3提分池优先", "活动后看H3→H2/H1迁移"]],
  ["P1", "AB测试配置", "人群、话术、时间、频次、权益可控", "产品/数据", "能看实验组和对照组转化差异", ["先测讲座邀约时间和报告呈现", "样本量不足时仅作趋势参考"]],
  ["P2", "NLP情绪识别", "自动识别正向、负向、退款、竞品", "数据/产品", "关键词规则先行，NLP后续校准", ["MVP关键词即可", "敏感词触发需人工复核"]]
];

const examples = [
  ["Big Dog, Small Dog", "R1 概念/标签式绘本：每页聚焦一个可见属性，适合观察完课、核心词曝光、卡牌获得。", ["R1低阶绘本", "主题来自孩子熟悉的日常动物", "每页只处理一个属性：big、small、long、fast"], ["核心词卡牌获得", "音频播放", "每页阅读完成", "卡册复习"], ["A01", "A07", "B03"]],
  ["Magic Canvas", "导读 + 核心词单词卡 + 读中互动，可用于学习深度和词汇复现评分。", ["读前导入背景", "核心词magic等先曝光", "读中用画面变化吸引翻页"], ["读前完成", "单词卡播放", "互动题", "例句回看"], ["A07", "A09", "B03"]],
  ["Pets Around Me", "熟悉日常主题，适合做T7打卡挑战和T14单词PK。", ["R1/R2均可用", "宠物主题易做节日/家庭任务", "适合亲子共读"], ["打卡完成", "单词PK报名", "报告分享"], ["A03", "B06", "E06"]],
  ["月课T21成果报告", "呈现已读绘本、已获卡牌、核心词、互动正确率，承接W4转化。", ["面向完课≥12本用户", "强调孩子已经坚持下来的证据", "不要只展示总分，要展示成长资产"], ["报告生成", "报告打开", "报告转发", "领券"], ["B03", "D04", "D02"]],
  ["季度词汇复习直播", "针对掌握一般的孩子做中心化复习，提升B03进步感知和B06活动参与。", ["M3/M6节点使用", "按薄弱模块分层邀约", "直播后生成复习完成回写"], ["预约", "到场", "互动", "复习完成"], ["A09", "B03", "B06"]],
  ["KET/PET规划讲座", "面向7-12岁和高阶用户，强化长期出口，服务M9/M12续费。", ["不是全量推送", "只推给年龄/级别匹配的家长", "强调阅读能力出口，不制造焦虑"], ["预约", "到场", "规划咨询", "续费意向变化"], ["B01", "B03", "E04"]]
];

const kpiDetails = {
  highPriority: {
    title: "今日高优池",
    summary: "H1/H2用户池用于指导师当天优先触达。核心不是找“分最高的人”，而是找当前最适合被人工推进的人。",
    meta: { 口径: "H1/H2", 周期: "每日09:00派发", 对接: "策略/学服/数据", 风险: "需剔除熔断用户" },
    sections: [
      ["进入条件", ["高优识别分≥65", "H1需商业意向≥60且无熔断", "处于W4、M6、M12等转化窗口时优先级上调"]],
      ["下钻字段", ["用户阶段", "触发标签", "推荐动作", "指导师", "最近触达结果", "风险提示"]],
      ["验收方式", ["H1/H2支付率高于全量", "指导师任务完成率可追踪", "高优用户未触达原因可回收"]]
    ]
  },
  liftPool: {
    title: "H3提分池",
    summary: "H3不是低价值用户，而是当前不适合强销售、但有机会通过中心化运营拉起的人群。",
    meta: { 口径: "高优40-64且提分潜力≥70", 周期: "每周圈选", 对接: "策略/活动/教研", 风险: "避免当成销售池" },
    sections: [
      ["典型用户", ["孩子学得动但家长没看见价值", "家长预约讲座但学习节奏不稳", "完成较多但没有领券或问价"]],
      ["适合动作", ["阅读打卡", "单词PK", "复习直播", "成长报告", "阅读讲座"]],
      ["核心看板", ["活动前后分数变化", "H3→H2/H1迁移率", "活动后领券/咨询/支付"]]
    ]
  },
  risk: {
    title: "风险熔断",
    summary: "风险熔断池保护用户体验，也保护指导师不要继续错误销售。出现投诉、退款、强负向后，只允许修复动作。",
    meta: { 口径: "B07/B04/D05/D06", 周期: "实时", 对接: "学服主管/客服", SLA: "2小时" },
    sections: [
      ["触发条件", ["明确退款/投诉", "删除指导师", "连续负向反馈", "触达饱和>90%且继续触达"]],
      ["系统动作", ["冻结销售任务14天", "进入主管可见风险队列", "保留修复类触达"]],
      ["回收字段", ["原因类型", "是否解决", "是否恢复学习", "是否解除熔断"]]
    ]
  },
  convertible: {
    title: "预计可转化",
    summary: "预计可转化池聚焦已经出现商业动作的人，包括领券、问价、下单未付、年课页访问。",
    meta: { 口径: "D02/E04/订单", 周期: "实时", 对接: "指导师/销售策略", SLA: "24小时" },
    sections: [
      ["进入条件", ["领券未使用", "下单未支付", "主动问价", "打开年课路径页"]],
      ["推荐动作", ["解释全年路径", "对齐价格权益", "处理价格/时间异议", "未支付返场"]],
      ["验收方式", ["24小时跟进率", "未支付转支付率", "异议回收完整率"]]
    ]
  }
};

const scoreDetails = {
  priority: {
    title: "高优识别分",
    summary: "判断用户当前是否值得指导师优先触达，解决“今天先找谁”的问题。",
    meta: { 总分: "100", 刷新: "每日+事件触发", 用途: "指导师任务", 阈值: "H1≥75 / H2≥65" },
    formula: "高优识别分 = 学习健康35 + 效果外化20 + 家长互动20 + 商业意向15 + 用户适配10 - 风险扣分",
    sections: [
      ["学习健康35", ["A01累积完课", "A02完课分层", "A03连续打卡", "A04近14天活跃", "A05趋势", "A07学习深度"]],
      ["效果外化20", ["A06测评", "A09薄弱模块", "B03进步感知", "报告打开"]],
      ["家长与商业35", ["B01续费意愿", "B04情绪", "B05响应", "D02领券", "D03直播", "E04意向变化"]]
    ]
  },
  lift: {
    title: "运营提分潜力",
    summary: "判断哪些中腰部用户值得策略用活动、讲座、直播、报告提前拉起。",
    meta: { 总分: "100", 刷新: "每周+活动后", 用途: "活动圈选", 阈值: "≥70进入提分池" },
    formula: "运营提分潜力 = 学习基础30 + 效果外化缺口25 + 家长认知20 + 可达性15 + 窗口接近10",
    sections: [
      ["高潜特征", ["孩子有完课基础但连续性不稳", "家长有打开/回复但缺少长期规划", "学了不少但没有看到结果"]],
      ["提分动作", ["打卡挑战提升A03/A04", "成长报告提升B03", "讲座/直播提升B06/D03"]],
      ["复盘口径", ["活动前后分差", "H3迁移到H2/H1人数", "活动后支付或领券"]]
    ]
  },
  fuse: {
    title: "熔断规则",
    summary: "任何分数都不能覆盖风险信号。熔断优先级高于高优识别和商业意向。",
    meta: { 触发: "实时", 冻结: "14天", 允许动作: "修复/安抚/解决问题", 禁止动作: "销售转化" },
    formula: "IF B07=0 OR 明确投诉/退款 THEN 冻结销售动作14天；B04同步降至0；仅允许+动作。",
    sections: [
      ["触发源", ["客服系统", "企微关键词", "退款订单", "删除指导师状态"]],
      ["解除条件", ["问题已解决", "家长情绪恢复", "主管确认可重新进入普通队列"]],
      ["需要产品支持", ["风险用户不进入销售任务", "主管队列单独可见", "解除熔断必须有记录"]]
    ]
  }
};

const queueDetails = {
  p0: ["P0临门/风险", "当天必须处理的任务，包含风险修复和临门转化。", ["风险2小时内接管", "临门24小时内跟进", "不允许被P1/P2挤占"]],
  p1: ["P1高优转化", "H1/H2用户的人工推进任务，重点发生在W4/M6/M12。", ["必须有触发原因", "必须有推荐话术主题", "必须回写结果"]],
  p2: ["P2提分邀约", "H3提分池的活动/讲座/直播邀约任务。", ["适合中心化运营", "不直接销售", "看活动后迁移率"]],
  p3: ["P3习惯修复", "学习节奏有问题但仍可挽回的用户。", ["低压提醒", "降低学习门槛", "恢复后再转高优"]]
};

const backendModules = [
  {
    name: "营销中心",
    status: "已授权",
    use: "活动列表、新建活动、推广链接、数据入口",
    owner: "策略/活动运营/产品",
    relevance: "R线节日赛、阅读打卡、直播互动、领课、任务制活动可优先复用",
    fields: ["活动类型", "活动ID", "活动名称", "活动状态", "场景标签", "活动链接", "生效对象", "推广链接", "数据"],
    gaps: ["新增R线场景标签", "活动结果回写到用户分数", "CRM分群权限联调"]
  },
  {
    name: "客户关系-管理平台",
    status: "已授权",
    use: "CRM标签与CRM分群",
    owner: "CRM/数据/产品",
    relevance: "活动生效对象已支持CRM标签和CRM分群，是高优用户触达的关键底座",
    fields: ["scopeData: CRM标签ID多选", "userGroupIdList: 用户分群ID多选", "用户分群状态=VALID"],
    gaps: ["分群接口当前403", "需要把H1/H2/H3输出成可选标签或分群", "需要分群更新周期和过期策略"]
  },
  {
    name: "销售运营-管理平台",
    status: "已授权",
    use: "销售/运营任务承接",
    owner: "学服/销售运营/产品",
    relevance: "适合承接P0临门、P1高优、P2提分邀约等指导师任务",
    fields: ["任务队列", "SLA", "触发原因", "推荐动作", "回收结果"],
    gaps: ["需核对现有任务字段", "需展示分数来源和不可销售风险", "需与指导师工作流对齐"]
  },
  {
    name: "教务中心-管理后台",
    status: "已授权",
    use: "课程、测评、学习节点",
    owner: "教务/教研/产品",
    relevance: "学习行为、测评和薄弱模块是高优识别分的底层数据",
    fields: ["课程ID", "测评", "完课", "薄弱模块", "月度/阶段报告"],
    gaps: ["R线读前/读中/读后事件需补齐", "测评结果需要能回写标签", "内容节点要和T/M周期对齐"]
  },
  {
    name: "前台业务-叫叫学院卡片配置服务后台",
    status: "已授权",
    use: "前台卡片与资源入口配置",
    owner: "前台产品/运营",
    relevance: "可承接成果报告、卡册、活动入口、年课路径等前台触达位置",
    fields: ["卡片配置", "展示人群", "资源链接", "上线时间"],
    gaps: ["需要按R线生命周期展示", "需要前台曝光/点击回传", "需要与活动链接打通"]
  },
  {
    name: "工单系统",
    status: "已授权",
    use: "投诉、退款、服务问题",
    owner: "客服/学服主管",
    relevance: "风险熔断必须从投诉/退款/负向问题里实时回写",
    fields: ["工单类型", "问题状态", "处理人", "处理结果", "关闭时间"],
    gaps: ["需映射B07风险标签", "风险用户14天保护期", "解除熔断需人工记录"]
  },
  {
    name: "叫叫AI中台",
    status: "已授权",
    use: "AI智能化服务",
    owner: "AI中台/数据",
    relevance: "二期可做沟通情绪识别、异议分类、AI Agent问卷和话术推荐",
    fields: ["情绪倾向", "异议类型", "摘要", "推荐动作", "置信度"],
    gaps: ["MVP先用关键词规则", "AI结果必须人工可解释", "敏感标签需审核"]
  },
  {
    name: "可视化数据看板",
    status: "已授权",
    use: "数据看板与指标配置",
    owner: "数据/策略",
    relevance: "承接H1/H2/H3池规模、任务完成、活动迁移和续费转化复盘",
    fields: ["高优池", "提分池", "任务完成率", "活动迁移率", "支付率"],
    gaps: ["需新增R线专属看板", "需能按阶段、指导师、活动下钻", "需保留分数快照"]
  }
];

const activityFields = [
  {
    block: "活动列表筛选",
    existing: ["活动类型", "活动ID", "活动名称", "活动状态", "重置", "查询", "新建"],
    use: "按R线活动类型、状态和ID检索活动，便于策略复盘。",
    gap: "建议补R线产品线/课程线筛选，否则需依靠命名规范。"
  },
  {
    block: "活动列表字段",
    existing: ["活动ID", "活动名称", "活动链接", "生效时间", "活动状态", "活动类型", "场景标签", "创建时间", "最近编辑", "操作"],
    use: "可直接用场景标签承接T7打卡、T14单词PK、T21成果报告、T24返券、M3复习直播。",
    gap: "需新增或规范R线场景标签，避免和商城/英语直播活动混在一起。"
  },
  {
    block: "活动操作",
    existing: ["预览", "编辑", "删除", "复制新建", "复制链接", "推广链接", "设为默认", "推广", "数据"],
    use: "复制新建可快速复用周活动模板；推广链接可给指导师和中心化触达使用；数据入口可回收结果。",
    gap: "删除/编辑权限需设置审批或灰度，避免误伤在线活动。"
  },
  {
    block: "新建活动第一步",
    existing: ["活动类型", "活动名称", "act code", "生效时间", "生效对象", "活动域名", "分享信息", "下一步"],
    use: "活动基础配置已经支持人群、时间、域名、分享，足够承接MVP版R线中心化提分。",
    gap: "act code需制定R线命名规则，如R_T07_READ_2607。"
  },
  {
    block: "活动类型",
    existing: ["转介绍活动", "泛转介绍活动", "常规活动", "拼团活动", "邀友共得", "预约活动", "抽奖活动", "领课活动", "任务制活动"],
    use: "R线可用预约活动承接讲座/直播，任务制活动承接打卡/复习，抽奖活动承接节日赛，领课活动承接体验课。",
    gap: "需要产品确认各类型是否能回传报名、到场、完赛、领奖、支付等事件。"
  },
  {
    block: "CRM标签生效对象",
    existing: ["scopeType", "scopeData", "标签支持搜索标签id，支持多选"],
    use: "高优H1/H2、提分H3、风险H4可以先产出CRM标签，再在活动中圈选。",
    gap: "必须让数据定时产出标签ID，并确认标签刷新周期和活动读取延迟。"
  },
  {
    block: "CRM分群生效对象",
    existing: ["scopeType", "userGroupIdList", "支持搜索用户分群id，支持多选"],
    use: "适合更复杂的生命周期人群包，如T18 H3且直播可达、T24 H1领券未付。",
    gap: "当前分群接口403：/admin-api/gravity/user-group-tasks，需要补当前角色权限或单独开通R线分群读取。"
  },
  {
    block: "现有活动样例",
    existing: ["超级分享周_积木铅笔盒", "邀友共学_期末数学资料", "英语6月直播互动100/200/300/400颗"],
    use: "可作为R线活动命名、奖励、直播互动、分享推荐活动的参考模板。",
    gap: "R线必须区分低价月课和正价课，不建议全套复用商城大促逻辑。"
  }
];

const backendReuse = [
  {
    title: "活动运营承接",
    priority: "P0",
    fit: "营销中心",
    action: "用任务制/预约/抽奖/领课活动承接T7打卡、T14单词PK、T18讲座、T21报告、M3复习直播。",
    needs: ["R线场景标签", "活动数据回写", "活动命名规范"]
  },
  {
    title: "高优用户触达",
    priority: "P0",
    fit: "CRM标签/分群",
    action: "把H1/H2/H3/H4按周期输出成CRM标签或用户分群，在活动生效对象中圈选。",
    needs: ["scopeData标签ID", "userGroupIdList分群ID", "分群接口权限"]
  },
  {
    title: "指导师任务",
    priority: "P0",
    fit: "销售运营-管理平台",
    action: "把P0风险/临门、P1高优、P2提分邀约派发给指导师，展示触发原因和推荐动作。",
    needs: ["任务SLA", "风险熔断", "结果回写"]
  },
  {
    title: "数据复盘看板",
    priority: "P1",
    fit: "可视化数据看板",
    action: "按生命周期、活动、指导师、标签变化看H3迁移率、H1支付率、触达完成率。",
    needs: ["分数快照", "活动ID回写", "支付结果归因"]
  },
  {
    title: "风险闭环",
    priority: "P0",
    fit: "工单系统",
    action: "投诉、退款、强负向进入熔断池，冻结销售动作14天，仅允许修复触达。",
    needs: ["风险标签", "主管队列", "解除熔断记录"]
  },
  {
    title: "AI辅助识别",
    priority: "P2",
    fit: "叫叫AI中台",
    action: "先用关键词识别价格/时间/退款/竞品异议，二期用AI做情绪和异议分类。",
    needs: ["关键词规则", "人工复核", "置信度展示"]
  }
];

const backendBlocks = [
  ["P0", "CRM分群接口403，当前用户可进活动页但无法读取用户分群任务", "产品/CRM/权限"],
  ["P0", "评分结果需要产出为CRM标签或分群，否则活动生效对象无法承接高优人群", "数据/CRM"],
  ["P0", "活动结果必须回写报名、到场、完赛、分享、领券、支付，否则无法计算提分效果", "营销中心/数据"],
  ["P1", "活动列表缺少明确R线产品线筛选，需要用场景标签和命名规范兜底", "营销中心/产品"],
  ["P1", "销售运营任务字段需核对是否支持触发原因、推荐动作、风险提示、回收结果", "销售运营/学服"],
  ["P1", "R线阅读器/卡册/报告事件还需补齐读前、读中、读后、卡册查看、报告打开埋点", "产品/数据"]
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function pill(text) {
  const className = text.includes("H1") || text.includes("P0") || text.includes("缺失") || text.includes("风险")
    ? "tag h1"
    : text.includes("H2") || text.includes("P1") || text.includes("部分")
      ? "tag h2"
      : text.includes("H3") || text.includes("已有")
        ? "tag h3"
        : "tag muted";
  return `<span class="${className}">${text}</span>`;
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function renderUsers() {
  $("#userRows").innerHTML = users.map((row, index) => `
    <tr data-detail="user:${index}" tabindex="0">
      <td><strong>${row.id}</strong></td>
      <td>${row.stage}</td>
      <td>${pill(row.tier)}</td>
      <td>${row.reason}</td>
      <td>${row.action}</td>
      <td>${row.risk === "无" ? pill("无") : pill(row.risk)}</td>
    </tr>
  `).join("");
}

function renderTimeline(stages, mode = "monthly") {
  $("#lifecycleTimeline").innerHTML = stages.map((stage, index) => `
    <article class="stage" data-detail="stage:${mode}:${index}" tabindex="0">
      <b>${stage[0]}</b>
      <span>${stage[1]}</span>
      <small>${stage[2]}</small>
    </article>
  `).join("");
}

function setupFilters() {
  const category = ["全部分类", ...new Set(tags.map((tag) => tag.category))];
  const availability = ["全部可用性", ...new Set(tags.map((tag) => tag.availability))];
  const cyclesSet = ["全部周期", ...new Set(tags.map((tag) => tag.refresh))];
  $("#categoryFilter").innerHTML = category.map((item) => `<option>${item}</option>`).join("");
  $("#availabilityFilter").innerHTML = availability.map((item) => `<option>${item}</option>`).join("");
  $("#cycleFilter").innerHTML = cyclesSet.map((item) => `<option>${item}</option>`).join("");
  ["#categoryFilter", "#availabilityFilter", "#cycleFilter", "#globalSearch"].forEach((id) => {
    $(id).addEventListener("input", renderTags);
  });
}

function renderTags() {
  const category = $("#categoryFilter").value;
  const availability = $("#availabilityFilter").value;
  const cycle = $("#cycleFilter").value;
  const query = $("#globalSearch").value.trim().toLowerCase();
  const filtered = tags.filter((tag) => {
    const text = Object.values(tag).join(" ").toLowerCase();
    return (category === "全部分类" || tag.category === category)
      && (availability === "全部可用性" || tag.availability === availability)
      && (cycle === "全部周期" || tag.refresh === cycle)
      && (!query || text.includes(query));
  });
  $("#tagRows").innerHTML = filtered.map((tag) => `
    <tr data-detail="tag:${tag.id}" tabindex="0">
      <td><strong>${tag.id}</strong></td>
      <td>${tag.name}</td>
      <td>${tag.category}</td>
      <td>${pill(tag.priority)}</td>
      <td>${pill(tag.availability)}</td>
      <td>${tag.refresh}</td>
      <td>${tag.rline}<br><span class="click-hint">查看字段口径</span></td>
    </tr>
  `).join("");
}

function renderCycles() {
  $("#cycleGrid").innerHTML = cycles.map((cycle, index) => `
    <article class="cycle-card" data-detail="cycle:${index}" tabindex="0">
      <b>${cycle[0]}</b>
      <span>${cycle[1]}</span>
      <small>${cycle[2]}</small>
      <small><strong>任务：</strong>${cycle[3]}</small>
    </article>
  `).join("");
}

function renderTasks() {
  $("#taskRules").innerHTML = taskRules.map((task, index) => `
    <article class="task-card" data-detail="task:${index}" tabindex="0">
      <header>
        <h3>${task[1]}</h3>
        ${pill(task[0])}
      </header>
      <dl>
        <dt>触发</dt><dd>${task[2]}</dd>
        <dt>SLA</dt><dd>${task[3]}</dd>
        <dt>动作</dt><dd>${task[4]}</dd>
      </dl>
    </article>
  `).join("");
}

function renderOperations() {
  $("#opsRows").innerHTML = operations.map((op, index) => `
    <article class="op-card" data-detail="operation:${index}" tabindex="0">
      <header>
        <h3>${op[1]}</h3>
        ${pill(op[0])}
      </header>
      <dl>
        <dt>人群</dt><dd>${op[2]}</dd>
        <dt>标签</dt><dd>${op[3]}</dd>
        <dt>目标</dt><dd>${op[4]}</dd>
      </dl>
    </article>
  `).join("");
}

function renderBackend() {
  $("#backendModules").innerHTML = backendModules.map((module, index) => `
    <article class="backend-card" data-detail="backendModule:${index}" tabindex="0">
      <header>
        <h3>${module.name}</h3>
        ${pill(module.status)}
      </header>
      <dl>
        <dt>用途</dt><dd>${module.use}</dd>
        <dt>承接</dt><dd>${module.relevance}</dd>
      </dl>
    </article>
  `).join("");

  $("#activityFieldRows").innerHTML = activityFields.map((field, index) => `
    <tr data-detail="activityField:${index}" tabindex="0">
      <td><strong>${field.block}</strong></td>
      <td>${field.existing.map((item) => item.includes(":") ? `<code>${item}</code>` : item).join(" / ")}</td>
      <td>${field.use}</td>
      <td>${field.gap}<br><span class="click-hint">查看提需口径</span></td>
    </tr>
  `).join("");

  $("#backendReuseCards").innerHTML = backendReuse.map((item, index) => `
    <article class="task-card" data-detail="backendReuse:${index}" tabindex="0">
      <header>
        <h3>${item.title}</h3>
        ${pill(item.priority)}
      </header>
      <dl>
        <dt>承接</dt><dd>${item.fit}</dd>
        <dt>动作</dt><dd>${item.action}</dd>
      </dl>
    </article>
  `).join("");

  $("#backendBlockRows").innerHTML = backendBlocks.map((block, index) => `
    <tr data-detail="backendBlock:${index}" tabindex="0">
      <td>${pill(block[0])}</td>
      <td><strong>${block[1]}</strong></td>
      <td>${block[2]}</td>
    </tr>
  `).join("");
}

function renderDemands() {
  $("#demandRows").innerHTML = demands.map((demand, index) => `
    <tr data-detail="demand:${index}" tabindex="0">
      <td>${pill(demand[0])}</td>
      <td><strong>${demand[1]}</strong></td>
      <td>${demand[2]}</td>
      <td>${demand[3]}</td>
      <td>${demand[4]}<br><span class="click-hint">查看验收明细</span></td>
    </tr>
  `).join("");
}

function setupExamples() {
  $$(".example-list article").forEach((card, index) => {
    card.dataset.detail = `example:${index}`;
    card.tabIndex = 0;
  });
}

function setupNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-item").forEach((item) => item.classList.remove("active"));
      $$(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      $(`#view-${button.dataset.view}`).classList.add("active");
    });
  });

  $$(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderTimeline(button.dataset.life === "monthly" ? monthlyStages : annualStages, button.dataset.life);
    });
  });
}

function detailTemplate({ eyebrow = "Drilldown", title, summary, meta = {}, formula, sections = [], actions = [] }) {
  $("#detailEyebrow").textContent = eyebrow;
  $("#detailTitle").textContent = title;
  const metaHtml = Object.entries(meta).map(([key, value]) => `
    <div><span>${key}</span><strong>${value}</strong></div>
  `).join("");
  const formulaHtml = formula ? `<section class="detail-section"><h3>计算口径</h3><code class="detail-formula">${formula}</code></section>` : "";
  const sectionsHtml = sections.map(([heading, content]) => `
    <section class="detail-section">
      <h3>${heading}</h3>
      ${Array.isArray(content) ? list(content) : `<p>${content}</p>`}
    </section>
  `).join("");
  const actionsHtml = actions.length ? `
    <section class="detail-actions">
      <h3>下一步</h3>
      ${list(actions)}
    </section>
  ` : "";
  $("#detailBody").innerHTML = `
    <p class="detail-summary">${summary}</p>
    <div class="detail-meta">${metaHtml}</div>
    ${formulaHtml}
    ${sectionsHtml}
    ${actionsHtml}
  `;
}

function openDrawer() {
  $("#drawerBackdrop").hidden = false;
  $("#detailDrawer").classList.add("open");
  $("#detailDrawer").setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  $("#detailDrawer").classList.remove("open");
  $("#detailDrawer").setAttribute("aria-hidden", "true");
  $("#drawerBackdrop").hidden = true;
}

function showTagDetail(id) {
  const tag = tags.find((item) => item.id === id);
  detailTemplate({
    eyebrow: `${tag.category} / ${tag.id}`,
    title: tag.name,
    summary: tag.rline,
    meta: {
      优先级: tag.priority,
      可用性: tag.availability,
      刷新周期: tag.refresh,
      数据来源: tag.source
    },
    formula: tag.formula,
    sections: [
      ["后台字段", [`用户ID`, `产品线=R线`, `事件时间`, `标签值`, `标签更新时间`, `计算窗口=${tag.refresh}`]],
      ["R线使用方式", [tag.rline, "进入高优识别分或运营提分潜力时，需要保留触发原因给指导师可见。"]],
      ["策略查看方式", [`月课：按T0-T28生命周期查看`, `正价课：按M1/M3/M6/M9/M12节点查看`, `异常用户需要下钻到最近一次触发事件。`]],
      ["提需/风险", tag.availability === "缺失待补"
        ? ["需要产品/数据补埋点或接口。", "MVP不进入硬分母，避免误伤用户。"]
        : tag.availability === "部分可用"
          ? ["一期可用导出、关键词或近似字段。", "二期需要产品化，减少人工加工。"]
          : ["一期可直接接入。", "需要确认R线字段名与现有字段名映射。"]]
    ],
    actions: ["和数据确认字段是否已入仓。", "和产品确认是否能在指导师端展示触发原因。", "首批月课后用支付结果校准权重。"]
  });
  openDrawer();
}

function showStageDetail(mode, index) {
  const stage = (mode === "annual" ? annualStages : monthlyStages)[Number(index)];
  detailTemplate({
    eyebrow: mode === "annual" ? "正价课生命周期" : "月课28天生命周期",
    title: `${stage[0]} ${stage[1]}`,
    summary: stage[2],
    meta: {
      查看周期: mode === "annual" ? "节点月重点查看" : "每日查看",
      主负责人: "策略中心",
      执行承接: "产品自动触达 + 指导师任务",
      数据回收: "标签变化 + 任务结果"
    },
    sections: [
      ["核心字段", stage[3]],
      ["策略动作", stage[4]],
      ["判断逻辑", mode === "annual"
        ? ["正价课不每天销售，只在节点月强化效果外化和续费铺垫。", "节点外只处理风险、断学和服务响应。"]
        : ["月课周期短，最近7天权重要高于历史累计。", "每周目标不同：W1激活，W2习惯，W3效果/认知，W4转化。"]]
    ],
    actions: ["确认该阶段产品自动触达是否可配置。", "确认指导师任务量上限。", "看该阶段用户是否向下一层迁移。"]
  });
  openDrawer();
}

function showUserDetail(index) {
  const user = users[Number(index)];
  detailTemplate({
    eyebrow: "用户样例",
    title: `${user.id} / ${user.tier}`,
    summary: user.reason,
    meta: { 阶段: user.stage, 分层: user.tier, 风险: user.risk, 推荐动作: user.action },
    sections: [
      ["判断依据", user.details],
      ["需要展示给指导师", ["触发原因", "推荐动作", "风险提示", "可用话术主题", "回收字段"]],
      ["回写字段", ["已触达/未回复/有意向/拒绝/已支付/需二次跟进", "异议类型", "下次跟进时间"]]
    ],
    actions: user.next
  });
  openDrawer();
}

function showCycleDetail(index) {
  const cycle = cycles[Number(index)];
  detailTemplate({
    eyebrow: "刷新周期",
    title: cycle[0],
    summary: cycle[5],
    meta: { 后台刷新: cycle[1], 适用事件: cycle[2], 触发任务: cycle[3], 关联标签: cycle[4].join(" / ") },
    sections: [
      ["系统要求", ["标签表保留最后更新时间。", "分数结果保留本次变化原因。", "指导师任务只派发可解释事件。"]],
      ["策略看法", ["不是所有标签都每天看。", "实时处理风险和临门，每日处理学习行为，每周处理趋势，每月处理效果与画像。"]],
      ["验收口径", ["刷新后用户池人数变化可见。", "单个用户可下钻到本次变化标签。", "任务派发和标签刷新时间能对上。"]]
    ]
  });
  openDrawer();
}

function showTaskDetail(index) {
  const task = taskRules[Number(index)];
  detailTemplate({
    eyebrow: "任务引擎",
    title: `${task[0]} ${task[1]}`,
    summary: task[4],
    meta: { 优先级: task[0], 触发条件: task[2], SLA: task[3], 承接方: task[0] === "P0" ? "主管/指导师" : "指导师" },
    sections: [
      ["触发字段", task[5]],
      ["任务动作", task[6]],
      ["指导师端展示", ["用户阶段", "分层", "触发原因", "推荐动作", "风险提示", "回收字段"]],
      ["质检口径", ["是否按SLA完成", "是否回写结果", "是否出现不该销售的风险用户"]]
    ]
  });
  openDrawer();
}

function showOperationDetail(index) {
  const op = operations[Number(index)];
  detailTemplate({
    eyebrow: "中心化提分",
    title: `${op[0]} ${op[1]}`,
    summary: `${op[2]}，目标提升 ${op[3]}。`,
    meta: { 节点: op[0], 人群: op[2], 目标标签: op[3], 期望变化: op[4] },
    sections: [
      ["适用人群", op[5]],
      ["观察指标", op[6]],
      ["动作边界", ["中心化提分不是直接销售。", "活动后必须回收行为结果，否则无法校准模型。", "H3人群优先，不建议全量撒。"]],
      ["产研需求", ["可按标签圈人", "可批量触达", "可回收报名/到场/完赛/报告打开/支付"]]
    ],
    actions: ["配置人群包。", "活动前记录基准分。", "活动后看H3→H2/H1迁移。"]
  });
  openDrawer();
}

function showBackendModuleDetail(index) {
  const module = backendModules[Number(index)];
  detailTemplate({
    eyebrow: "现有后台能力",
    title: module.name,
    summary: module.relevance,
    meta: { 状态: module.status, 当前用途: module.use, 对接方: module.owner, 策略判断: "优先复用现有后台" },
    sections: [
      ["已看到或可复用字段", module.fields],
      ["R线承接方式", [module.relevance, "优先把R线评分、标签、任务、活动都落到已有后台的可配置对象上。"]],
      ["需要补齐", module.gaps],
      ["讨论口径", ["先确认这个后台是否是责任系统。", "再确认字段是否已存在、能否配置、能否回写。", "最后确认一期开通权限和上线排期。"]]
    ],
    actions: ["拉对应后台owner确认字段。", "把R线MVP需要的字段标为P0/P1。", "完成后回写到提需清单。"]
  });
  openDrawer();
}

function showActivityFieldDetail(index) {
  const field = activityFields[Number(index)];
  detailTemplate({
    eyebrow: "营销中心活动页",
    title: field.block,
    summary: field.use,
    meta: { 来源: "后台实读", 路径: "营销中心 / 运营活动 / 活动列表", 状态: "可见", 讨论重点: "复用优先" },
    sections: [
      ["已有字段/按钮", field.existing],
      ["R线可用方式", [field.use]],
      ["需补充/风险", [field.gap]],
      ["落地例子", [
        "T7阅读打卡：任务制活动 + H3提分池标签。",
        "T18阅读讲座：预约活动 + H2/H3可达人群。",
        "T21成果报告：常规活动或前台卡片 + 报告打开回写。",
        "T24返券收口：推广链接 + 领券/支付回写。"
      ]]
    ],
    actions: ["和营销中心确认活动类型事件回传。", "和CRM确认标签/分群读取权限。", "和数据确认活动ID能否回写评分。"]
  });
  openDrawer();
}

function showBackendReuseDetail(index) {
  const item = backendReuse[Number(index)];
  detailTemplate({
    eyebrow: "后台复用场景",
    title: item.title,
    summary: item.action,
    meta: { 优先级: item.priority, 复用后台: item.fit, 目标: "降低新建系统成本", 状态: "待联调" },
    sections: [
      ["承接方式", [item.action]],
      ["需要能力", item.needs],
      ["讨论问题", ["现有后台是否支持R线产品线隔离？", "是否能按标签/分群圈人？", "触达和活动结果是否能回到用户分数？"]],
      ["策略边界", ["MVP不追求全自动闭环，必须先保证人群准确、动作可回收。", "如果没有回写结果，活动只能算运营动作，不能进入评分校准。"]]
    ],
    actions: ["确定责任后台。", "列出字段字典。", "约定首批R线活动样例。"]
  });
  openDrawer();
}

function showBackendBlockDetail(index) {
  const block = backendBlocks[Number(index)];
  detailTemplate({
    eyebrow: "上线阻塞项",
    title: block[1],
    summary: "这是R线用户分数系统从策略方案进入后台落地时需要优先讨论的问题。",
    meta: { 优先级: block[0], 对接对象: block[2], 状态: "待确认", 影响: block[0] === "P0" ? "阻塞MVP闭环" : "影响效率/准确性" },
    sections: [
      ["为什么重要", [
        block[0] === "P0" ? "不解决会导致高优识别、活动触达或结果回写无法闭环。" : "不解决仍可上线MVP，但会增加人工判断和复盘成本。",
        "这类问题需要在跨部门会上明确责任人和排期。"
      ]],
      ["讨论口径", ["现有后台是否已有能力？", "如果已有，缺的是权限、字段、接口还是产品配置？", "如果没有，一期能否用人工导出/近似字段兜底？"]],
      ["验收口径", ["有明确owner。", "有可测试样例用户或样例活动。", "策略能在后台看到字段/结果。"]]
    ],
    actions: ["把问题写入会议议程。", "约定owner和时间。", "更新提需清单状态。"]
  });
  openDrawer();
}

function showDemandDetail(index) {
  const demand = demands[Number(index)];
  detailTemplate({
    eyebrow: "跨部门提需",
    title: `${demand[0]} ${demand[1]}`,
    summary: demand[2],
    meta: { 优先级: demand[0], 对接方: demand[3], 验收口径: demand[4], 状态: "待部门确认" },
    sections: [
      ["拆解项", demand[5]],
      ["讨论问题", ["当前后台是否已有入口？", "数据源来自产品埋点、订单、活动系统还是人工回收？", "一期能否先用导出/近似字段？"]],
      ["验收方式", ["有字段字典。", "有样例用户可校验。", "能在看板或任务里看到结果。"]]
    ],
    actions: ["拉产品/数据确认可行性。", "补充字段 owner 和排期。", "进入MVP需求清单。"]
  });
  openDrawer();
}

function showExampleDetail(index) {
  const ex = examples[Number(index)];
  detailTemplate({
    eyebrow: "R线资料样例",
    title: ex[0],
    summary: ex[1],
    meta: { 适用标签: ex[4].join(" / "), 来源: "R线课程/服务资料", 用途: "开会举例", 是否上线: "按产品排期确认" },
    sections: [
      ["内容设计要点", ex[2]],
      ["可采集事件", ex[3]],
      ["怎么进入分数", [`${ex[4].join("、")} 对应学习、效果、活动或转化信号。`, "示例需要在真实上线后用埋点验证。"]],
      ["讨论价值", ["让产品知道要埋什么点。", "让教研知道哪些内容能转成用户资产。", "让学服知道怎么讲给家长听。"]]
    ]
  });
  openDrawer();
}

function showStaticDetail(key) {
  const [type, id] = key.split(":");
  if (type === "kpi") {
    detailTemplate({ eyebrow: "总览指标", ...kpiDetails[id] });
  }
  if (type === "score") {
    detailTemplate({ eyebrow: "评分模型", ...scoreDetails[id] });
  }
  if (type === "queue") {
    const queue = queueDetails[id];
    detailTemplate({
      eyebrow: "今日任务结构",
      title: queue[0],
      summary: queue[1],
      meta: { 队列: queue[0], 更新: "每日09:00", 承接: "指导师工作台", 回收: "任务结果回写" },
      sections: [["执行要求", queue[2]], ["下钻字段", ["任务ID", "用户ID", "触发标签", "阶段", "SLA", "完成状态", "回收结果"]]]
    });
  }
  openDrawer();
}

function openDetail(key) {
  const [type, a, b] = key.split(":");
  if (type === "tag") return showTagDetail(a);
  if (type === "stage") return showStageDetail(a, b);
  if (type === "user") return showUserDetail(a);
  if (type === "cycle") return showCycleDetail(a);
  if (type === "task") return showTaskDetail(a);
  if (type === "operation") return showOperationDetail(a);
  if (type === "backendModule") return showBackendModuleDetail(a);
  if (type === "activityField") return showActivityFieldDetail(a);
  if (type === "backendReuse") return showBackendReuseDetail(a);
  if (type === "backendBlock") return showBackendBlockDetail(a);
  if (type === "demand") return showDemandDetail(a);
  if (type === "example") return showExampleDetail(a);
  if (["kpi", "score", "queue"].includes(type)) return showStaticDetail(key);
}

function setupDetailEvents() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-detail]");
    if (trigger) openDetail(trigger.dataset.detail);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-detail]")) {
      event.preventDefault();
      openDetail(event.target.dataset.detail);
    }
    if (event.key === "Escape") closeDrawer();
  });
  $("#drawerClose").addEventListener("click", closeDrawer);
  $("#drawerBackdrop").addEventListener("click", closeDrawer);
}

renderUsers();
renderTimeline(monthlyStages, "monthly");
setupFilters();
renderTags();
renderCycles();
renderTasks();
renderOperations();
renderBackend();
renderDemands();
setupExamples();
setupNavigation();
setupDetailEvents();
