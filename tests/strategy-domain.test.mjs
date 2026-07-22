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
  assert.deepEqual(getBusinessLines(SEED_STATE).map((line) => line.id), ["english-all", "k-line", "e-line"]);
  assert.equal(getBusinessLines(SEED_STATE).find((line) => line.id === "k-line").sampleDepth, "full");
  assert.equal(getBusinessLines(SEED_STATE).find((line) => line.id === "e-line").sampleDepth, "structure");
});

test("strategy assets can be reused across K2 and E1 with level differences", () => {
  const assets = strategyAssetsForDomain(SEED_STATE, { businessLine: "k-line" });
  const reusable = assets.find((asset) => asset.id === "ES-OUTCOME-REPORT-001");

  assert.equal(reusable.scope, "line-reusable");
  assert.equal(reusable.reusable, true);
  assert.equal(reusable.differenceConfig["k-line"].valueHook, "K2能力成长路径 + 中心化SOP");
  assert.equal(reusable.differenceConfig["e-line"].valueHook, "升阶规划 + 长期学习目标");
  assert.ok(reusable.target.businessLines.includes("k-line"));
});

test("coverage summary compares K2 and E1 strategy domains", () => {
  const coverage = coverageByBusinessLine(SEED_STATE);
  assert.deepEqual(coverage.map((item) => item.businessLine), ["k-line", "e-line"]);
  assert.equal(coverage.find((item) => item.businessLine === "k-line").coverageStatus, "healthy");
  const eLine = coverage.find((item) => item.businessLine === "e-line");
  assert.equal(eLine.assetCount, 4);
  assert.equal(eLine.onlineCount, 3);
  assert.equal(eLine.coverageStatus, "healthy");
});

test("dashboard and dispatch summaries expose strategy-level operations", () => {
  const summary = strategyDashboardSummary(SEED_STATE);
  assert.equal(summary.businessLineCount, 2);
  assert.ok(summary.onlineAssetCount >= 3);
  assert.ok(summary.strategyHealthRate > 0);

  const dispatch = dispatchSummary(SEED_STATE);
  assert.equal(dispatch.totalBatches, SEED_STATE.dispatchBatches.length);
  assert.ok(dispatch.writebackCompleteRate > 0);
  assert.ok(SEED_STATE.dispatchBatches.every((batch) => batch.strategyVersion && batch.observationWindow));
  assert.ok(SEED_STATE.dispatchBatches.every((batch) => Array.isArray(batch.failureReasons)));
  assert.ok(SEED_STATE.dispatchBatches.every((batch) => Array.isArray(batch.blockedReasons)));
});

test("audience pack summary explains target, exclusions, and freshness", () => {
  const summary = audienceSummary(SEED_STATE, "AUD-K2-SA-STABLE");
  assert.equal(summary.id, "AUD-K2-SA-STABLE");
  assert.equal(summary.businessLine, "k-line");
  assert.ok(summary.excludedCount > 0);
  assert.equal(summary.dataFreshness, "每周一T+1");
  assert.deepEqual(summary.cohortIds, ["K2-SOP-Sim-202607"]);
  assert.ok(summary.availableActions.includes("首月学习复盘"));
});

test("E1 records are template-backed until product data is fully connected", () => {
  assert.ok(SEED_STATE.audiencePacks.find((pack) => pack.businessLine === "e-line").targetCount > 0);
  assert.equal(SEED_STATE.dispatchBatches.some((batch) => batch.businessLine === "e-line"), true);

  const effectiveness = SEED_STATE.effectivenessMetrics.find((metric) => metric.businessLine === "e-line");
  const inbound = SEED_STATE.inboundReviews.find((review) => review.businessLine === "e-line");

  assert.equal(effectiveness.evidenceStatus, "模板模拟");
  assert.ok(effectiveness.value > 0);
  assert.equal(inbound.evidenceStatus, "模板模拟");
  assert.ok(inbound.inboundCount > 0);
});

test("dispatch batches keep strategy lineage and completed count reconciliation", () => {
  const packById = new Map(SEED_STATE.audiencePacks.map((pack) => [pack.id, pack]));

  for (const batch of SEED_STATE.dispatchBatches) {
    const pack = packById.get(batch.audiencePackId);
    assert.ok(pack, `${batch.id} must reference an audience pack`);
    assert.equal(batch.strategyId, pack.strategyId, `${batch.id} must use the same strategy as ${pack.id}`);
    if (batch.status === "completed") {
      assert.equal(
        batch.plannedCount,
        batch.reachedCount + batch.failedCount + (batch.blockedCount || 0),
        `${batch.id} planned count must reconcile`
      );
    }
  }
});
