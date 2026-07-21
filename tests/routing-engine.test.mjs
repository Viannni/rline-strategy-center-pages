import test from "node:test";
import assert from "node:assert/strict";
import { scoreUser } from "../core/scoring-engine.js";
import { TASK_RULES } from "../data/rules.js";
import { scenarioUser } from "../data/seed-data.js";
import { evaluateTouchGate, getPlacement, routeUser } from "../core/routing-engine.js";

test("template question routes to unbound Agent queue", () => {
  const user = scenarioUser("template-question");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "agent");
  assert.equal(result.bindingMode, "unbound");
  assert.equal(result.channel, "text");
  assert.equal(result.taskSubtype, "模板答疑");
});

test("annual M9 H1 with P0 transaction routes to bound sales", () => {
  const user = scenarioUser("annual-renewal-p0");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "sales");
  assert.equal(result.bindingMode, "bound");
  assert.equal(result.priority, "P0");
  assert.equal(result.taskCategory, "conversion");
  assert.equal(result.taskSubtype, "F14待付款/支付失败");
});

test("renewal-window F14 coupon-unused routes to bound sales with its declared conversion subtype", () => {
  const user = scenarioUser("annual-renewal-p0");
  user.transaction = {
    ...user.transaction,
    status: "coupon-unused",
    unpaid: false,
    paymentFailed: false,
    couponUnused: true
  };
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "sales");
  assert.equal(result.bindingMode, "bound");
  assert.equal(result.taskCategory, "conversion");
  assert.equal(result.taskSubtype, "领券未用");
  assert.equal(result.priority, "P1");
  assert.equal(result.slaHours, 24);
});

test("non-renewal H1 keeps its F14 P0 signal while routing to unbound learning planning", () => {
  const user = scenarioUser("p0-outside-renewal-window");
  const score = scoreUser(user);
  const result = routeUser(user, score);

  assert.equal(score.hLevel, "H1");
  assert.equal(score.transactionSignal.priority, "P0");
  assert.equal(result.team, "learning");
  assert.equal(result.subteam, "learning-planning");
  assert.equal(result.bindingMode, "unbound");
  assert.equal(result.taskCategory, "outcome");
  assert.equal(result.taskSubtype, "高优学情规划");
  assert.ok(TASK_RULES.categories.find((category) => category.id === "outcome").subtypes.includes("高优学情规划"));
  assert.notEqual(result.taskCategory, "conversion");
  assert.notEqual(result.team, "sales");
  assert.equal(result.trace[2].value, "H1/P0");
});

test("renewal-window H1 remains a bound sales conversion task", () => {
  const user = scenarioUser("high-base");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "sales");
  assert.equal(result.bindingMode, "bound");
  assert.equal(result.taskCategory, "conversion");
  assert.equal(result.taskSubtype, "H1高优转化");
  assert.equal(result.priority, "P1");
});

test("touch limit blocks task without changing score", () => {
  const user = scenarioUser("touch-blocked");
  const score = scoreUser(user);
  const before = structuredClone(score);
  const result = routeUser(user, score);

  assert.equal(result.touchGate.status, "blocked");
  assert.equal(result.hLevel, score.hLevel);
  assert.deepEqual(score, before);
});

test("H4 risk outside a renewal window routes to the unbound after-sales repair subteam", () => {
  const user = { ...scenarioUser("high-score-risk"), stageCode: "T10" };
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.hLevel, "H4");
  assert.equal(result.team, "learning");
  assert.equal(result.subteam, "after-sales");
  assert.equal(result.bindingMode, "unbound");
  assert.equal(result.channel, "phone");
});

test("renewal-window H4 keeps bound sales as front owner and records repair support", () => {
  const user = scenarioUser("high-score-risk");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "sales");
  assert.equal(result.bindingMode, "bound");
  assert.equal(result.supportTeam, "learning");
  assert.equal(result.supportSubteam, "after-sales");
});

test("missed learning routes to the learning intervention subteam", () => {
  const user = scenarioUser("learning-repair");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "learning");
  assert.equal(result.subteam, "learning-intervention");
  assert.equal(result.taskCategory, "repair");
  assert.equal(result.taskSubtype, "连续漏学");
});

test("report interpretation routes to the learning planning subteam", () => {
  const user = scenarioUser("annual-h2-outcomes");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.team, "learning");
  assert.equal(result.subteam, "learning-planning");
  assert.equal(result.taskCategory, "outcome");
  assert.equal(result.taskSubtype, "报告解读");
  assert.equal(result.channel, "text");
});

test("complex learning issue escalates to a phone task", () => {
  const user = scenarioUser("difficulty-objection");
  const result = routeUser(user, scoreUser(user));

  assert.equal(result.subteam, "learning-planning");
  assert.equal(result.channel, "phone");
  assert.equal(result.placementId, "phone-task");
});

test("P0 exception requires an explicit flag and nonblank reason while remaining supervisor-visible", () => {
  const user = scenarioUser("touch-queued-p0-exemption");
  user.touch.p0Exception = true;
  user.touch.exceptionReason = "支付失败需在付款窗口内确认";
  const score = scoreUser(user);
  const before = structuredClone(user);
  const result = routeUser(user, score);

  assert.deepEqual(result.touchGate, {
    status: "eligible",
    reason: "支付失败需在付款窗口内确认",
    exceptionApplied: true,
    supervisorVisible: true
  });
  assert.equal(result.priority, "P0");
  assert.deepEqual(user, before);
});

test("P0 hard limits remain blocked without the explicit exception flag", () => {
  const user = scenarioUser("touch-queued-p0-exemption");
  user.touch = {
    ...user.touch,
    status: "blocked",
    channelHardLimit: true,
    p0Exception: false,
    exceptionReason: "过期豁免原因"
  };

  assert.deepEqual(evaluateTouchGate(user, "P0"), {
    status: "blocked",
    reason: "渠道硬上限",
    exceptionApplied: false,
    supervisorVisible: false
  });
});

test("P0 exception ignores blank reasons", () => {
  const user = scenarioUser("touch-queued-p0-exemption");
  user.touch = {
    ...user.touch,
    status: "blocked",
    globalLimit7d: 6,
    total7d: 6,
    p0ExemptionReason: null,
    p0Exception: true,
    exceptionReason: "   "
  };

  assert.deepEqual(evaluateTouchGate(user, "P0"), {
    status: "blocked",
    reason: "近7日接近频控上限",
    exceptionApplied: false,
    supervisorVisible: false
  });
});

test("touch gate blocks channel hard limits and queues ordinary soft limits", () => {
  const hardLimited = scenarioUser("template-question");
  hardLimited.touch.channelLimit = true;
  const queued = scenarioUser("touch-queued-p0-exemption");

  assert.deepEqual(evaluateTouchGate(hardLimited, "P1"), {
    status: "blocked",
    reason: "渠道硬上限",
    exceptionApplied: false,
    supervisorVisible: false
  });
  assert.deepEqual(evaluateTouchGate(queued, "P1"), {
    status: "queued",
    reason: "近7日接近频控上限",
    exceptionApplied: false,
    supervisorVisible: false
  });
});

test("route trace follows the required routing precedence", () => {
  const user = scenarioUser("annual-renewal-p0");
  const result = routeUser(user, scoreUser(user));

  assert.deepEqual(result.trace.map((entry) => entry.label), [
    "风险", "生命周期", "H层级/F14", "问题类型", "F12触达准入", "渠道", "团队/SLA"
  ]);
  assert.ok(result.trace.every((entry) => entry.value !== undefined && entry.decision));
});

test("routing and placement lookup are deterministic and non-mutating", () => {
  const user = scenarioUser("annual-h2-outcomes");
  const score = scoreUser(user);
  const beforeUser = structuredClone(user);
  const beforeScore = structuredClone(score);

  assert.deepEqual(routeUser(user, score), routeUser(user, score));
  assert.deepEqual(user, beforeUser);
  assert.deepEqual(score, beforeScore);
  assert.equal(getPlacement("task-queue").status, "entry-confirmed");
});

test("system placement exposes explicit evidence status without claiming verified fields", () => {
  const placement = getPlacement("routing-policy");

  assert.deepEqual(placement, {
    id: "routing-policy",
    feature: "触达准入、角色路由和任务派发",
    capabilityId: "rules-engine",
    status: "must-add",
    dependency: "F12频控、绑定关系和派单字段",
    fallback: "离线规则加任务表",
    statusMeta: {
      code: "must-add",
      label: "必须新增",
      liveFieldSupport: "unavailable"
    }
  });
  assert.equal(getPlacement("missing-placement"), null);
});
