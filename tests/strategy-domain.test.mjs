import test from "node:test";
import assert from "node:assert/strict";

import { SEED_STATE } from "../data/seed-data.js";
import {
  audienceSummary,
  coverageByBusinessLine,
  dispatchSummary,
  getBusinessLines,
  strategyAssetsForDomain,
  strategyDashboardSummary
} from "../core/strategy-domain.js";

test("business domain seed data supports English-wide strategy management", () => {
  assert.deepEqual(getBusinessLines(SEED_STATE).map((line) => line.id), ["english-all", "r-line", "k-line", "e-line"]);
  assert.equal(getBusinessLines(SEED_STATE).find((line) => line.id === "r-line").sampleDepth, "full");
  assert.equal(getBusinessLines(SEED_STATE).find((line) => line.id === "k-line").sampleDepth, "structure");
});

test("strategy assets can be reused across lines while keeping R-line differences", () => {
  const assets = strategyAssetsForDomain(SEED_STATE, { businessLine: "r-line" });
  const reusable = assets.find((asset) => asset.id === "ES-OUTCOME-REPORT-001");

  assert.equal(reusable.scope, "line-reusable");
  assert.equal(reusable.reusable, true);
  assert.equal(reusable.differenceConfig["r-line"].valueHook, "阅读成长 + 奖学金提醒");
  assert.ok(reusable.target.businessLines.includes("k-line"));
});

test("coverage summary compares R, K, and E lines", () => {
  const coverage = coverageByBusinessLine(SEED_STATE);
  assert.deepEqual(coverage.map((item) => item.businessLine), ["r-line", "k-line", "e-line"]);
  assert.equal(coverage.find((item) => item.businessLine === "r-line").coverageStatus, "healthy");
  assert.equal(coverage.find((item) => item.businessLine === "e-line").coverageStatus, "needs-setup");
});

test("dashboard and dispatch summaries expose strategy-level operations", () => {
  const summary = strategyDashboardSummary(SEED_STATE);
  assert.equal(summary.businessLineCount, 3);
  assert.ok(summary.onlineAssetCount >= 3);
  assert.ok(summary.strategyHealthRate > 0);

  const dispatch = dispatchSummary(SEED_STATE);
  assert.equal(dispatch.totalBatches, SEED_STATE.dispatchBatches.length);
  assert.ok(dispatch.writebackCompleteRate > 0);
});

test("audience pack summary explains target, exclusions, and freshness", () => {
  const summary = audienceSummary(SEED_STATE, "AUD-RLINE-HIGH-RENEWAL");
  assert.equal(summary.id, "AUD-RLINE-HIGH-RENEWAL");
  assert.equal(summary.businessLine, "r-line");
  assert.ok(summary.excludedCount > 0);
  assert.equal(summary.dataFreshness, "T+1");
});
