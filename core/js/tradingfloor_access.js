// core/js/tradingfloor_access.js

/**
 * Platform Gateway Adapter
 * Bridges the Tradingfloor Orchestrator calls to the legacy TraderLab Engine
 */
import { 
  startTraderLab, 
  stopTraderLab, 
  triggerSingleCycle as legacyTriggerSingleCycle,
  scoopAndResetCycle
} from "./traderlab_access.js";

/**
 * Gateway mappings to align runtime execution
 */
export function startTradingFloor({ getMarketData, interval, mode }) {
  return startTraderLab({ getMarketData, interval, mode });
}

export function stopTradingFloor() {
  return stopTraderLab();
}

export async function triggerSingleCycle(getMarketData, mode) {
  return await legacyTriggerSingleCycle(getMarketData, mode);
}

/**
 * Exposes metrics pooling for upper management dashboard modules
 */
export function collectPlatformMetrics() {
  return scoopAndResetCycle();
}
