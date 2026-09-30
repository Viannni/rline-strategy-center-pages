import test from "node:test";
import assert from "node:assert/strict";
import { mergeLiveSnapshot, validateLivePayload } from "../live-data.js";

const fallback = {
  current: {
    date: "2026-09-14",
    stage: "M1W1D1",
    asOf: "14:00",
    points: [{ time: "14:00", participant: 59 }],
    pending: ["18:00", "日终"]
  },
  references: { daily: { retention: 72 } },
  weekly: { currentWeek: "M1W1" },
  sop: { actions: [{ time: "18:00", action: "首日督学" }] }
};

test("live payload overlays current data while preserving workbench configuration", () => {
  const merged = mergeLiveSnapshot(fallback, {
    generatedAt: "2026-09-15T09:00:00+08:00",
    current: {
      date: "2026-09-15",
      stage: "M1W1D2",
      asOf: "09:00",
      points: [{ time: "09:00", participant: 12 }],
      pending: ["12:00", "日终"]
    }
  });

  assert.equal(merged.current.stage, "M1W1D2");
  assert.equal(merged.current.points[0].participant, 12);
  assert.equal(merged.references.daily.retention, 72);
  assert.equal(merged.weekly.currentWeek, "M1W1");
  assert.equal(merged.sop.actions[0].action, "首日督学");
});

test("live payload validation rejects empty or partial snapshots", () => {
  assert.equal(validateLivePayload(null), false);
  assert.equal(validateLivePayload({ current: {} }), false);
  assert.equal(validateLivePayload({ current: { date: "2026-09-15", stage: "M1W1D2", asOf: "09:00" } }), false);
  assert.equal(validateLivePayload({
    current: {
      date: "2026-09-15",
      stage: "M1W1D2",
      asOf: "09:00",
      points: [{ time: "09:00", participant: 12 }]
    }
  }), true);
});
