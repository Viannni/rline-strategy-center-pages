const ARCHIVE_KEY = "rline-workbench-input-archives-v1";
const QA_KEY = "rline-workbench-qa-entries-v1";

function storageObject(storage) {
  return storage || (typeof window !== "undefined" ? window.localStorage : null);
}

function readJson(storage, key, fallback) {
  try {
    const value = storageObject(storage)?.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storageObject(storage)?.setItem(key, JSON.stringify(value));
  } catch {
    // The workbench remains usable when browser storage is unavailable or full.
  }
}

function makeId(prefix = "item") {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[\s\-_\/()（）【】[]：:]/g, "");
}

function firstValue(row, aliases) {
  const entries = Object.entries(row || {});
  const aliasKeys = aliases.map(normalizeKey);
  const match = entries.find(([key, value]) => aliasKeys.includes(normalizeKey(key)) && value !== null && value !== undefined && String(value).trim() !== "");
  return match ? String(match[1]).trim() : "";
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  const columns = (rows.shift() || []).map((value, index) => String(value || "").trim() || "字段" + (index + 1));
  return {
    columns,
    rows: rows.map((values) => columns.reduce((result, column, index) => ({ ...result, [column]: String(values[index] ?? "").trim() }), {}))
  };
}

function parseJsonRows(text) {
  const parsed = JSON.parse(String(text || ""));
  const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.rows) ? parsed.rows : Array.isArray(parsed?.data) ? parsed.data : []);
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  return { columns, rows: rows.map((row) => columns.reduce((result, column) => ({ ...result, [column]: row?.[column] ?? "" }), {})) };
}

export function parseUploadedText(text, fileName = "") {
  const name = String(fileName || "").toLowerCase();
  const extension = name.split(".").pop();
  if (extension === "json") {
    const parsed = parseJsonRows(text);
    return { ...parsed, format: "json", parseStatus: "已解析" };
  }
  if (extension === "xlsx" || extension === "xls") {
    return { columns: [], rows: [], format: extension, parseStatus: "原文件已登记；请另存为CSV后提取表格字段" };
  }
  const delimiter = extension === "tsv" || String(text).includes("\t") ? "\t" : ",";
  const parsed = parseDelimited(text, delimiter);
  return { ...parsed, format: delimiter === "\t" ? "tsv" : "csv", parseStatus: parsed.columns.length ? "已解析" : "未识别到表头" };
}

export function normalizeQAEntries(rows = [], source = {}) {
  return rows.filter((row) => row && Object.values(row).some((value) => String(value ?? "").trim() !== "")).map((row) => {
    const typeValue = firstValue(row, ["QA类型", "类型", "问题类型", "type", "category"]);
    const isCourse = /课程|course|lesson|教研|教材/i.test(typeValue + firstValue(row, ["问题", "反馈", "question", "issue"]));
    return {
      id: makeId("qa"),
      type: /用户|家长|user/i.test(typeValue) ? "用户QA" : isCourse ? "课程QA" : (source.defaultType || "用户QA"),
      category: firstValue(row, ["分类", "类别", "category", "module"]) || (isCourse ? "课程体验" : "用户反馈"),
      issue: firstValue(row, ["问题", "反馈", "问题描述", "question", "issue", "content"]) || "待补充问题",
      evidence: firstValue(row, ["证据", "原话", "数据证据", "evidence", "quote"]) || "待补充证据",
      impact: firstValue(row, ["影响", "影响判断", "impact", "risk"]) || "待判断影响",
      department: firstValue(row, ["责任部门", "协同部门", "部门", "ownerTeam", "department"]) || "待分派",
      solution: firstValue(row, ["解决方案", "部门方案", "解决动作", "方案", "solution", "action"]) || "待协同部门补充解决方案",
      owner: firstValue(row, ["负责人", "owner", "处理人"]) || "",
      dueDate: firstValue(row, ["截止时间", "截止日期", "dueDate", "deadline"]) || "",
      status: firstValue(row, ["状态", "status", "进展"]) || "待协同",
      verification: firstValue(row, ["验证结果", "验证指标", "复盘结果", "verification", "validation"]) || "待回收验证结果",
      count: firstValue(row, ["数量", "频次", "人数", "count", "frequency"]) || "",
      metric: firstValue(row, ["指标", "metric"]) || "",
      source: source.label || source.url || "上传表格",
      sourceUrl: source.url || "",
      capturedAt: source.capturedAt || new Date().toISOString()
    };
  });
}

export function buildArchiveEntry(meta = {}) {
  return {
    id: meta.id || makeId("archive"),
    name: meta.name || "未命名存档",
    kind: meta.kind || "table",
    source: meta.source || "本地上传",
    sourceUrl: meta.sourceUrl || "",
    capturedAt: meta.capturedAt || new Date().toISOString(),
    note: meta.note || "",
    mimeType: meta.mimeType || "",
    size: Number(meta.size || 0),
    columns: Array.isArray(meta.columns) ? meta.columns : [],
    rows: Array.isArray(meta.rows) ? meta.rows : [],
    previewUrl: meta.previewUrl || "",
    parseStatus: meta.parseStatus || "已登记"
  };
}

const DEFAULT_QA_ENTRIES = [
  {
    id: "seed-qa-user-1", type: "用户QA", category: "家长认知", issue: "家长认为课程像“哑巴英语”，没有开口跟读和输出环节",
    evidence: "R线日报家长反馈：没有开口跟读环节；单词跟读偶发，孩子读得对不对没有纠音反馈。",
    impact: "降低家长对课程价值的理解，可能影响学习黏性和续费判断。",
    department: "教研+产品", solution: "教研补充开口输入/跟读/纠音环节；产品确认跟读反馈入口和数据回传。",
    owner: "教研负责人", dueDate: "", status: "待协同", verification: "观察开口任务完成率、家长负向反馈和D3-D5深度。",
    count: "", metric: "开口环节完成率", source: "R线日报待确认", sourceUrl: "", capturedAt: "2026-09-29"
  },
  {
    id: "seed-qa-course-1", type: "课程QA", category: "课程承接", issue: "课程结束页缺少下节课预告、今日收获和奖励反馈",
    evidence: "日报反馈集中出现：单节课结束页信息单薄，缺少下节课预告、今日学习收获、奖励反馈。",
    impact: "孩子和家长无法形成学习预期，打卡意愿和次日回流可能下降。",
    department: "教研+产品", solution: "补充结束页固定组件：今日收获、下节预告、奖励反馈；先在R1试投一节并对比D+1回流。",
    owner: "课程产品", dueDate: "", status: "待协同", verification: "比较改版前后次日回流率、完课率和家长反馈。",
    count: "", metric: "次日回流率", source: "R线日报待确认", sourceUrl: "", capturedAt: "2026-09-29"
  },
  {
    id: "seed-qa-course-2", type: "课程QA", category: "内容难度", issue: "低龄用户词汇量偏多且读音相似，容易混淆和产生挫败",
    evidence: "日报反馈：词汇量有点多、读音相似，孩子容易混淆；选择题偏信息检索。",
    impact: "提高参与后的认知负担，可能拉低深度、正读质量和完整学习。",
    department: "教研", solution: "按低龄基础拆分词量；增加复述、趣味游戏和错词复习；对R1增加难度分层。",
    owner: "教研负责人", dueDate: "", status: "待协同", verification: "观察100%深度、参与未完成转完课和相关负向反馈变化。",
    count: "", metric: "100%深度", source: "R线日报待确认", sourceUrl: "", capturedAt: "2026-09-29"
  },
  {
    id: "seed-qa-user-2", type: "用户QA", category: "家长沟通", issue: "家长不清楚孩子学了什么，难以配合课后亲子复盘",
    evidence: "反馈集中在家长不知道本节课学了什么、课程目标和学习收获不清晰。",
    impact: "家庭侧无法形成陪读和复习动作，影响连续参与和课程价值感。",
    department: "运营+教研", solution: "输出课后家长卡：本节目标、孩子完成情况、家庭复习建议；与补读入口一并触达。",
    owner: "运营", dueDate: "", status: "待协同", verification: "观察家长卡查看率、补读点击率和次日参与人数。",
    count: "", metric: "次日参与人数", source: "R线日报待确认", sourceUrl: "", capturedAt: "2026-09-29"
  }
];

export function loadArchiveEntries(storage) {
  const entries = readJson(storage, ARCHIVE_KEY, []);
  return Array.isArray(entries) ? entries.map(buildArchiveEntry) : [];
}

export function saveArchiveEntries(entries, storage) {
  writeJson(storage, ARCHIVE_KEY, (Array.isArray(entries) ? entries : []).map(buildArchiveEntry));
}

export function loadQAEntries(storage) {
  const entries = readJson(storage, QA_KEY, null);
  if (!Array.isArray(entries)) return DEFAULT_QA_ENTRIES.map((item) => ({ ...item }));
  return entries;
}

export function saveQAEntries(entries, storage) {
  writeJson(storage, QA_KEY, Array.isArray(entries) ? entries : []);
}

export { ARCHIVE_KEY, QA_KEY, DEFAULT_QA_ENTRIES };
