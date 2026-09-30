import test from "node:test";
import assert from "node:assert/strict";
import {
  buildArchiveEntry,
  loadArchiveEntries,
  loadQAEntries,
  normalizeQAEntries,
  parseUploadedText,
  saveArchiveEntries,
  saveQAEntries
} from "../modules/rline-input-store.js";

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
}

test("uploaded CSV/TSV/JSON keeps table rows and quoted content", () => {
  const csv = parseUploadedText('问题,证据,责任部门\n"课程卡顿,家长退出",D3反馈,产品', "qa.csv");
  assert.deepEqual(csv.columns, ["问题", "证据", "责任部门"]);
  assert.equal(csv.rows[0]["问题"], "课程卡顿,家长退出");
  assert.equal(csv.rows[0]["责任部门"], "产品");

  const tsv = parseUploadedText("问题\t方案\n开口不足\t增加跟读", "qa.tsv");
  assert.equal(tsv.rows[0]["方案"], "增加跟读");

  const json = parseUploadedText(JSON.stringify({ rows: [{ 问题: "词汇量多", 状态: "待协同" }] }), "qa.json");
  assert.deepEqual(json.columns, ["问题", "状态"]);
  assert.equal(json.rows[0]["状态"], "待协同");
});

test("QA normalization maps Chinese OA columns into an actionable loop", () => {
  const [entry] = normalizeQAEntries([{
    "QA类型": "课程QA",
    "问题描述": "缺少复习",
    "原话": "家长反馈没有复习",
    "影响判断": "次日回流下降",
    "协同部门": "教研",
    "部门方案": "增加D3复习任务",
    "负责人": "教研负责人",
    "截止时间": "2026-10-02",
    "验证指标": "D4回流率",
    "状态": "处理中"
  }], { label: "OA课程QA", defaultType: "用户QA" });

  assert.equal(entry.type, "课程QA");
  assert.equal(entry.issue, "缺少复习");
  assert.equal(entry.department, "教研");
  assert.equal(entry.solution, "增加D3复习任务");
  assert.equal(entry.dueDate, "2026-10-02");
  assert.equal(entry.verification, "D4回流率");
  assert.equal(entry.source, "OA课程QA");
});

test("archive and QA records can be saved and loaded from browser storage", () => {
  const storage = fakeStorage();
  const archive = buildArchiveEntry({ name: "M1W1D5日报", columns: ["班期"], rows: [{ 班期: "1期" }], source: "OA" });
  saveArchiveEntries([archive], storage);
  assert.equal(loadArchiveEntries(storage)[0].name, "M1W1D5日报");

  saveQAEntries([{ id: "qa-1", type: "用户QA", issue: "开口不足", status: "待协同" }], storage);
  assert.equal(loadQAEntries(storage)[0].issue, "开口不足");
});
