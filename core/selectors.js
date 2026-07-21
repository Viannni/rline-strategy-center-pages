import { scoreUsers } from "./scoring-engine.js";

const clone = (value) => structuredClone(value);

const ROLE_ASSIGNMENTS = Object.freeze({
  agent: new Set(["agent"]),
  learning: new Set(["learning", "after-sales", "learning-intervention", "learning-planning"]),
  sales: new Set(["sales"])
});

function assignmentValues(task) {
  return [task?.assigneeTeam, task?.subteam, task?.role]
    .filter((value) => typeof value === "string" && value.length > 0);
}

export function selectUsers(state, filters = {}) {
  const scores = new Map((state?.scores ?? []).map((score) => [score.userId, score]));
  return (state?.users ?? [])
    .filter((user) => {
      const score = scores.get(user.id);
      const route = state?.routes?.[user.id];
      return (!filters.productType || user.productType === filters.productType)
        && (!filters.stageCode || user.stageCode === filters.stageCode)
        && (!filters.hLevel || score?.hLevel === filters.hLevel)
        && (!filters.team || route?.team === filters.team);
    })
    .map((user) => ({ user: clone(user), score: clone(scores.get(user.id) ?? null), route: clone(state?.routes?.[user.id] ?? null) }));
}

export function selectDashboardMetrics(state) {
  const scores = state?.scores ?? [];
  return {
    totalUsers: (state?.users ?? []).length,
    highPriorityUsers: scores.filter((score) => score.hLevel === "H1" || score.hLevel === "H2").length,
    upliftUsers: scores.filter((score) => score.hLevel === "H3").length,
    riskUsers: scores.filter((score) => score.hLevel === "H4").length,
    openTasks: (state?.tasks ?? []).filter((task) => task.status !== "done" && task.status !== "closed").length
  };
}

export function selectTasksForRole(state, role) {
  const team = typeof role === "string" ? role : role?.team;
  const allowedAssignments = ROLE_ASSIGNMENTS[team];
  return (state?.tasks ?? [])
    .filter((task) => !team || (allowedAssignments ?? new Set([team])).has(task.assigneeTeam) || assignmentValues(task).some((value) => (allowedAssignments ?? new Set([team])).has(value)))
    .map(clone);
}

export function selectTeamLoad(state) {
  const loads = new Map();
  for (const [userId, route] of Object.entries(state?.routes ?? {})) {
    const key = `${route.team}:${route.subteam}`;
    const current = loads.get(key) ?? { team: route.team, subteam: route.subteam, count: 0, userIds: [] };
    current.count += 1;
    current.userIds.push(userId);
    loads.set(key, current);
  }
  return [...loads.values()]
    .map((entry) => ({ ...entry, userIds: entry.userIds.filter(Boolean).sort() }))
    .sort((left, right) => right.count - left.count || left.team.localeCompare(right.team) || left.subteam.localeCompare(right.subteam));
}

export function selectMigrationRows(state) {
  const previousUsers = state?.history?.at(-1)?.users ?? [];
  const previousScores = new Map(scoreUsers(previousUsers).map((score) => [score.userId, score]));
  return (state?.scores ?? []).map((score) => ({
    userId: score.userId,
    hLevel: score.hLevel,
    fromHLevel: previousScores.get(score.userId)?.hLevel ?? null,
    changed: previousScores.get(score.userId)?.hLevel !== score.hLevel,
    baseScore: score.baseScore
  }));
}
