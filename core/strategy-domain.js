function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function getBusinessLines(state) {
  return Array.isArray(state?.businessLines) ? state.businessLines : [];
}

export function getActiveBusinessDomain(state) {
  const id = state?.ui?.businessLine || "english-all";
  return getBusinessLines(state).find((line) => line.id === id) || getBusinessLines(state)[0] || null;
}

export function strategyAssetsForDomain(state, domainFilter = {}) {
  const assets = Array.isArray(state?.strategyAssets) ? state.strategyAssets : [];
  const businessLine = domainFilter.businessLine || "english-all";
  if (businessLine === "english-all") return assets;
  return assets.filter((asset) => asset.target?.businessLines?.includes(businessLine) || asset.businessLine === businessLine);
}

export function coverageByBusinessLine(state) {
  return getBusinessLines(state)
    .filter((line) => line.id !== "english-all")
    .map((line) => {
      const assets = strategyAssetsForDomain(state, { businessLine: line.id });
      const onlineCount = assets.filter((asset) => asset.status === "online").length;
      const hasReadyAudience = (state?.audiencePacks || []).some((pack) => (
        pack.businessLine === line.id && pack.targetCount > 0 && pack.dataFreshness !== "待接入"
      ));
      const coverageStatus = !hasReadyAudience ? "needs-setup" : onlineCount >= 3 ? "healthy" : onlineCount >= 1 ? "partial" : "needs-setup";
      return { businessLine: line.id, name: line.name, sampleDepth: line.sampleDepth, assetCount: assets.length, onlineCount, coverageStatus };
    });
}

export function strategyDashboardSummary(state) {
  const lines = getBusinessLines(state).filter((line) => line.id !== "english-all");
  const assets = Array.isArray(state?.strategyAssets) ? state.strategyAssets : [];
  const onlineAssetCount = assets.filter((asset) => asset.status === "online").length;
  const reusableAssetCount = assets.filter((asset) => asset.reusable).length;
  const batches = Array.isArray(state?.dispatchBatches) ? state.dispatchBatches : [];
  const completedBatches = batches.filter((batch) => batch.status === "completed").length;
  return {
    businessLineCount: lines.length, assetCount: assets.length, onlineAssetCount, reusableAssetCount,
    strategyHealthRate: percent(onlineAssetCount, Math.max(assets.length, 1)),
    completedBatchRate: percent(completedBatches, Math.max(batches.length, 1)),
    dataRequirementCount: state?.dataRequirements?.length || 0
  };
}

export function audienceSummary(state, audiencePackId) {
  const pack = (state?.audiencePacks || []).find((item) => item.id === audiencePackId);
  if (!pack) return null;
  return { ...pack, totalConsidered: pack.targetCount + pack.excludedCount, exclusionRate: percent(pack.excludedCount, pack.targetCount + pack.excludedCount) };
}

export function dispatchSummary(state) {
  const batches = Array.isArray(state?.dispatchBatches) ? state.dispatchBatches : [];
  const planned = batches.reduce((sum, batch) => sum + (batch.plannedCount || 0), 0);
  const reached = batches.reduce((sum, batch) => sum + (batch.reachedCount || 0), 0);
  const complete = batches.filter((batch) => batch.writebackStatus === "complete").length;
  return {
    totalBatches: batches.length, plannedCount: planned, reachedCount: reached,
    reachRate: percent(reached, planned), writebackCompleteRate: percent(complete, Math.max(batches.length, 1))
  };
}
