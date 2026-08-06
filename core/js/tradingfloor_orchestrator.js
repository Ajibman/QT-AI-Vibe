 // TraderLab Orchestrator — System Coordinator Layer

import { getBestStrategy } from "./strategy_memory.js";
import { getStrategyMemory } from "./strategy_memory.js";
import { getMemorySnapshot } from "../cpilot/cpilot_memory.js";
import eventHub from "../brain/meta_brain/engines/event_hub.js";
import { buildSessionConfig } from "./meta_brain.js";

let activeSession = null;
let sessions = [];

// ======================================================
// RUNTIME REGISTRATION
// ======================================================
eventHub.registerModule("traderlab_orchestrator", {
  role: "runtime_orchestrator",
  runtime: "production"
});

// ======================================================
// RUNTIME EVENT SUBSCRIPTIONS
// ======================================================
eventHub.subscribe("trade:signal", () => {
  try {
    buildSessionConfig();
  } catch (error) {
    console.error("[TraderLab] Meta-Brain refresh failed", error);
  }
});

/**
 * CREATE SESSION
 */
export function createSession({
  name = "session",
  mode = "simulation",
  interval = 5000,
  config = {},
  onCycle = null // Added direct callback registration
}) {
  const sessionId = `${name}_${Date.now()}`;

  const session = {
    id: sessionId,
    name,
    mode,
    interval,
    config,
    onCycle, // Bound to the session object
    status: "created",
    createdAt: Date.now(),
    loop: null
  };

  sessions.push(session);
  activeSession = session;

  return sessionId;
}

/**
 * START SESSION
 */
export function startSession(sessionId, { getMarketData } = {}) {
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    throw new Error(`[TraderLab] Session not found: ${sessionId}`);
  }

  if (session.status === "running") {
    return session;
  }

  session.status = "running";

  eventHub.emit({
    type: "session:started",
    source: "traderlab_orchestrator",
    target: "runtime",
    priority: "normal",
    payload: {
      sessionId: session.id,
      mode: session.mode
    }
  });

  const marketDataProvider = getMarketData || (() => ({}));

  const loop = setInterval(() => {
    try {
      const marketData = marketDataProvider() || {};

      // Defensive execution: safely handle potential failures in downstream modules
      const best = getBestStrategy(marketData) || { bestStrategy: "default", context: {} };
      const cpilotMemory = getMemorySnapshot() || {};
      const strategyMemory = getStrategyMemory() || {};

      /**
       * ORCHESTRATION DECISION
       */
      const orchestration = {
        sessionId: session.id,
        strategy: best.bestStrategy || "default",
        context: best.context || {},
        cpilotSnapshot: cpilotMemory,
        strategySnapshot: strategyMemory,
        marketData,
        timestamp: Date.now()
      };

      // RUNTIME CYCLE EVENT
      eventHub.emit({
        type: "traderlab:cycle",
        source: "traderlab_orchestrator",
        target: "runtime",
        priority: "normal",
        payload: orchestration
      });

      // Safe evaluation of the lifecycle callback
      if (typeof session.onCycle === "function") {
        session.onCycle(orchestration);
      }
    } catch (cycleError) {
      console.error(`[TraderLab] Critical error during session loop cycle ${session.id}:`, cycleError);
    }
  }, session.interval);

  session.loop = loop;
  return session;
}

/**
 * STOP SESSION
 */
export function stopSession(sessionId) {
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return;

  const session = sessions[sessionIndex];

  if (session.loop) {
    clearInterval(session.loop);
    session.loop = null;
  }

  session.status = "stopped";

  eventHub.emit({
    type: "session:stopped",
    source: "traderlab_orchestrator",
    target: "runtime",
    priority: "normal",
    payload: { sessionId: session.id }
  });

  // Memory Management: Remove from active array to prevent memory leaks
  sessions.splice(sessionIndex, 1);

  if (activeSession && activeSession.id === sessionId) {
    activeSession = sessions[sessions.length - 1] || null;
  }
}

/**
 * GET ACTIVE SESSION
 */
export function getActiveSession() {
  return activeSession;
}

/**
 * LIST ALL SESSIONS
 */
export function listSessions() {
  return sessions;
}
