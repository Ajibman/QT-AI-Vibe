// core/js/tradingfloor_orchestrator.js

/**
 * Tradingfloor Orchestrator
 * -------------------------
 * This is the SYSTEM CONTROL CENTER for experiments,
 * configurations, and simulated/live test runs.
 *
 * It bridges your legacy research scripts seamlessly
 * with the new Tradingfloor access layer.
 */

// Upgraded import points to the new Tradingfloor platform gateway
import { startTradingFloor, stopTradingFloor, triggerSingleCycle } from "./tradingfloor_access.js";
import { resetMemory } from "../cpilot/cpilot_memory.js";
import { resetStrategyMemory } from "./strategy_memory.js";

const orchestratorState = {
  activeSession: null,
  sessions: new Map() // Upgraded to Map for optimal O(1) memory lookup speeds
};

/**
 * 🧪 CREATE NEW EXPERIMENT SESSION
 */
export function createSession({
  name = "default-session",
  mode = "simulation", // Accepts 'simulation', 'backtest', or 'production'
  interval = 5000,
  config = {}
}) {
  const sessionId = `${name}-${Date.now()}`;

  orchestratorState.sessions.set(sessionId, {
    id: sessionId,
    name,
    mode,
    interval,
    config,
    status: "created",
    results: [],
    startedAt: null,
    endedAt: null
  });

  return sessionId;
}

/**
 * ▶️ START SESSION
 */
export function startSession(sessionId, { getMarketData }) {
  const session = orchestratorState.sessions.get(sessionId);
  if (!session) throw new Error(`[Orchestrator] Session ${sessionId} not found`);

  orchestratorState.activeSession = sessionId;
  session.status = "running";
  session.startedAt = Date.now();

  // Hands off processing execution context to the new gateway
  startTradingFloor({
    getMarketData,
    interval: session.interval,
    mode: session.mode
  });

  return session;
}

/**
 * ⏹ STOP SESSION
 */
export function stopSession() {
  const sessionId = orchestratorState.activeSession;
  if (!sessionId) return;

  const session = orchestratorState.sessions.get(sessionId);
  if (!session) return;

  stopTradingFloor();

  session.status = "stopped";
  session.endedAt = Date.now();

  orchestratorState.activeSession = null;
  return session;
}

/**
 * 🧪 RUN SINGLE EXPERIMENT CYCLE
 */
export async function runExperimentCycle(sessionId, getMarketData) {
  const session = orchestratorState.sessions.get(sessionId);
  if (!session) throw new Error(`[Orchestrator] Session ${sessionId} not found`);

  // Evaluates exactly one standalone tick inside the engine wrapper
  const result = await triggerSingleCycle(getMarketData, session.mode);
  session.results.push(result);

  return result;
}

/**
 * 🔁 RESET ENTIRE LAB (CLEAN STATE)
 */
export function resetLab() {
  stopSession();

  resetMemory();
  resetStrategyMemory();

  orchestratorState.activeSession = null;
  orchestratorState.sessions.clear(); // Safe garbage collection collection point
}

/**
 * 📊 GET SESSION REPORT
 */
export function getSessionReport(sessionId) {
  const session = orchestratorState.sessions.get(sessionId);
  if (!session) return null;

  const executed = session.results.filter(r => r && r.status !== "skipped");

  const totalPnL = executed.reduce((sum, r) => {
    return sum + (r?.cycleResult?.result?.pnl || 0);
  }, 0);

  const wins = executed.filter(r => (r?.cycleResult?.result?.pnl || 0) > 0).length;
  const losses = executed.filter(r => (r?.cycleResult?.result?.pnl || 0) <= 0).length;

  return {
    sessionId,
    name: session.name,
    status: session.status,
    duration: session.endedAt
      ? session.endedAt - session.startedAt
      : Date.now() - session.startedAt,
    trades: executed.length,
    wins,
    losses,
    winRate: executed.length ? wins / executed.length : 0,
    totalPnL
  };
}

/**
 * 📚 LIST ALL SESSIONS
 */
export function listSessions() {
  return Array.from(orchestratorState.sessions.values());
}
