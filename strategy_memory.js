// TraderLab Strategy Memory — Portfolio & Execution Weight Analytics

// Local cache for in-memory strategy performance registries
let strategyRegistry = new Map();
let currentContext = { marketPhase: "neutral", volatility: "low" };

// Default initial state for any new strategy registered dynamically
const DEFAULT_STRATEGY_METRICS = {
  winRate: 0.50,
  profitFactor: 1.0,
  totalTrades: 0,
  score: 1.0,
  lastUsed: null
};

/**
 * INITIALIZE / REGISTER STRATEGY
 * Populates or resets memory registry metrics for a specific strategy string identifier.
 */
export function registerStrategy(strategyName, initialMetrics = {}) {
  if (!strategyName) return false;
  
  strategyRegistry.set(strategyName, {
    ...DEFAULT_STRATEGY_METRICS,
    ...initialMetrics
  });
  
  return true;
}

/**
 * EVALUATE AND GET BEST STRATEGY
 * Invoked by traderlab.js orchestrator loop to parse real-time market conditions 
 * and return the highest scored system framework.
 */
export function getBestStrategy(marketData = {}) {
  // Update internal market situational parameters dynamically
  updateMarketContext(marketData);

  // Auto-seed baseline strategies if registry is empty
  if (strategyRegistry.size === 0) {
    registerStrategy("mean_reversion", { score: 1.2 });
    registerStrategy("trend_following", { score: 1.0 });
    registerStrategy("breakout_momentum", { score: 0.8 });
  }

  let bestStrategy = "mean_reversion"; // Fail-safe default
  let highestScore = -Infinity;

  // Iterate over state maps to calculate context-weighted selection rankings
  for (const [name, metrics] of strategyRegistry.entries()) {
    let contextualScore = calculateContextualScore(name, metrics, currentContext);
    
    if (contextualScore > highestScore) {
      highestScore = contextualScore;
      bestStrategy = name;
    }
  }

  // Update selection audit details inside memory structures
  const selectedRecord = strategyRegistry.get(bestStrategy);
  if (selectedRecord) {
    selectedRecord.lastUsed = Date.now();
  }

  return {
    bestStrategy,
    context: {
      ...currentContext,
      selectionScore: highestScore
    }
  };
}

/**
 * GET STRATEGY MEMORY SNAPSHOT
 * Exports an isolated static visual map snapshot of current performance scores.
 */
export function getStrategyMemory() {
  const snapshot = {};
  for (const [name, metrics] of strategyRegistry.entries()) {
    snapshot[name] = { ...metrics };
  }
  return snapshot;
}

/**
 * UPDATE STRATEGY METRICS
 * Ingests external runtime performance outcomes to calibrate ongoing weight bias.
 */
export function updateStrategyPerformance(strategyName, outcomes = {}) {
  if (!strategyRegistry.has(strategyName)) {
    registerStrategy(strategyName);
  }

  const existing = strategyRegistry.get(strategyName);
  const updated = {
    ...existing,
    ...outcomes,
    totalTrades: (existing.totalTrades || 0) + (outcomes.tradeExecuted ? 1 : 0)
  };

  // Recalculate baseline performance index formula
  updated.score = (updated.winRate * updated.profitFactor * 2);
  
  strategyRegistry.set(strategyName, updated);
}

// ======================================================
// PRIVATE CORE COMPONENT UTILITIES
// ======================================================

function updateMarketContext(marketData) {
  if (!marketData) return;
  
  currentContext.marketPhase = marketData.rsi > 70 ? "overbought" : marketData.rsi < 30 ? "oversold" : "neutral";
  currentContext.volatility = marketData.atrRatio > 1.5 ? "high" : "low";
}

function calculateContextualScore(name, metrics, context) {
  let baseScore = metrics.score || 1.0;

  // Context bias mappings
  if (context.marketPhase === "overbought" && name === "mean_reversion") baseScore += 0.5;
  if (context.marketPhase === "oversold" && name === "mean_reversion") baseScore += 0.5;
  if (context.volatility === "high" && name === "breakout_momentum") baseScore += 0.4;
  if (context.volatility === "low" && name === "trend_following") baseScore -= 0.3;

  return baseScore;
    }
