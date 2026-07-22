import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createStore } from "../core/store.js";
import { SEED_STATE } from "../data/seed-data.js";
import {
  createSimulationConfirmation,
  createImportPreview,
  applySimulation,
  mapImportRows,
  previewSimulation,
  userExportCsv,
  userExportJson,
  isDesktopOnlyFeatureAvailable
} from "../views/users.js";
import { RULE_EDITOR_MIN_WIDTH, isRuleEditorAvailable } from "../views/scoring.js";
import { STRICT_ISO_HTML_PATTERN, taskExportCsv } from "../views/tasks.js";
import { dialogContract } from "../ui/components.js";
import * as audiencesView from "../views/audiences.js";
import * as businessLinesView from "../views/business-lines.js";
import * as dispatchView from "../views/dispatch.js";

const memoryStorage = (setItem = () => {}) => ({
  getItem() { return null; },
  setItem,
  removeItem() {}
});

test("import mapping preserves source rows and previews valid, skipped, and failed rows", () => {
  const source = [
    { external_id: "new-user", kind: "monthly", stage: "T1", note: "new" },
    { external_id: "bad-user", kind: "annual", stage: "T1" },
    { external_id: "mid-base", kind: "monthly", stage: "T16" }
  ];
  const before = structuredClone(source);
  const mapping = { user_id: "external_id", product_type: "kind", stage_code: "stage" };
  const mapped = mapImportRows(source, mapping);
  const preview = createImportPreview(source, mapping, SEED_STATE.users, "skip");

  assert.equal(mapped[0].user_id, "new-user");
  assert.equal(mapped[0].note, "new");
  assert.deepEqual(source, before);
  assert.deepEqual(preview.counts, { success: 1, warning: 1, failure: 1 });
  assert.equal(preview.result.errors[0].row, 2);
  assert.equal(preview.result.skipped[0].userId, "mid-base");
});

test("export helpers serialize user and role-task content with formula protection", () => {
  const state = structuredClone(SEED_STATE);
  state.users[0].childId = "=unsafe";
  const json = userExportJson(state.users);
  const csv = userExportCsv([{ id: "u1", childId: "=unsafe", hLevel: "H1" }]);
  const taskCsv = taskExportCsv(state, "sales");

  assert.equal(JSON.parse(json)[0].childId, "=unsafe");
  assert.match(csv, /"'=unsafe"/);
  assert.match(taskCsv, /用户ID/);
  assert.match(taskCsv, /二销|sales/);
});

test("quota failures keep the in-memory state usable and mark storage as recoverable", () => {
  const store = createStore(SEED_STATE, memoryStorage(() => { throw new DOMException("quota", "QuotaExceededError"); }));
  store.update((state) => ({ ...state, generatedAt: "2026-07-21T00:00:00+08:00" }));

  assert.equal(store.getState().generatedAt, "2026-07-21T00:00:00+08:00");
  assert.deepEqual(store.getState().storage.notice, { code: "STORAGE_UNAVAILABLE", recoverable: true });
});

test("mobile-only capability gating leaves bulk import and rule editing to desktop", () => {
  assert.equal(isDesktopOnlyFeatureAvailable(390), false);
  assert.equal(isDesktopOnlyFeatureAvailable(768), false);
  assert.equal(isDesktopOnlyFeatureAvailable(1280), true);
  assert.equal(RULE_EDITOR_MIN_WIDTH, 900);
  assert.equal(isRuleEditorAvailable(899), false);
  assert.equal(isRuleEditorAvailable(900), true);
});

test("simulation preview remains immutable until the confirmation path applies it", () => {
  const store = createStore(SEED_STATE, memoryStorage());
  const before = store.getState().users.find((user) => user.id === "high-base").report.opened;
  const preview = previewSimulation(store.getState(), "high-base", { reportOpened: !before });
  let applyCalls = 0;
  const confirmation = createSimulationConfirmation({
    store,
    userId: "high-base",
    changes: preview.changes,
    apply: (...args) => {
      applyCalls += 1;
      return applySimulation(...args);
    }
  });

  assert.equal(store.getState().users.find((user) => user.id === "high-base").report.opened, before);
  assert.equal(applyCalls, 0);
  assert.equal(confirmation.cancel(), false);
  assert.equal(applyCalls, 0);
  assert.equal(confirmation.confirm(), false);
  assert.equal(store.getState().users.find((user) => user.id === "high-base").report.opened, before);

  const acceptedConfirmation = createSimulationConfirmation({ store, userId: "high-base", changes: preview.changes });
  assert.equal(acceptedConfirmation.confirm(), true);
  assert.equal(store.getState().users.find((user) => user.id === "high-base").report.opened, !before);
});

test("dialog contract exposes title focus, tab containment, escape, overlay close, and trigger restoration", () => {
  assert.deepEqual(dialogContract(), {
    initialFocus: "title",
    trapTab: true,
    closeOnEscape: true,
    closeOnOverlay: true,
    restoreTrigger: true
  });
});

test("strict ISO input pattern is valid under the HTML v-mode regexp rules", () => {
  const browserPattern = new RegExp(`^(?:${STRICT_ISO_HTML_PATTERN})$`, "v");

  assert.equal(browserPattern.test("2026-07-21T10:00:00+08:00"), true);
  assert.equal(browserPattern.test("2026-07-21T02:00:00Z"), true);
  assert.equal(browserPattern.test("2026-07-21 10:00:00"), false);
});

test("audience and dispatch views are strategy-level not teacher task pages", async () => {
  const audiencesSource = await readFile(new URL("../views/audiences.js", import.meta.url), "utf8");
  const dispatchSource = await readFile(new URL("../views/dispatch.js", import.meta.url), "utf8");

  assert.match(audiencesSource, /人群圈选/);
  assert.match(audiencesSource, /排除人数/);
  assert.match(audiencesSource, /数据新鲜度/);
  assert.doesNotMatch(audiencesSource, /真实姓名/);

  assert.match(dispatchSource, /下发追踪/);
  assert.match(dispatchSource, /策略包/);
  assert.match(dispatchSource, /回写完整/);
  assert.doesNotMatch(dispatchSource, /老师待办/);
});

test("strategy operations views expose cohort, action, failure, and window contracts", () => {
  const render = (view) => {
    const root = { innerHTML: "" };
    view.render(root, { state: SEED_STATE, role: "strategy" });
    return root.innerHTML;
  };
  const businessLines = render(businessLinesView);
  const audiences = render(audiencesView);
  const dispatch = render(dispatchView);

  assert.match(businessLines, /产品类型/);
  assert.match(businessLines, /班期/);
  assert.match(businessLines, /R-Annual-M8M12-202607/);

  assert.match(audiences, /圈选规则/);
  assert.match(audiences, /可执行动作/);
  assert.match(audiences, /排除原因/);
  assert.match(audiences, /观察窗/);
  assert.match(audiences, /奖学金抵扣提醒/);

  assert.match(dispatch, /版本/);
  assert.match(dispatch, /失败原因/);
  assert.match(dispatch, /观察窗口/);
  assert.match(dispatch, /v2026\.07\.22-r1/);
  assert.match(dispatch, /字段缺失/);
});
