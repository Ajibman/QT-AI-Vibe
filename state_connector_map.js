‎// ============================================================
‎// QuantumTrader-AI™
‎// System State Connector Map
‎// Version 1.0 - Event-Driven State Hook
‎// ============================================================
‎
‎import eventHub from "./event_hub.js";
‎
‎/**
‎* Binds an active LiveSystemStateManager instance to runtime event topics.
‎* Returns an unbind function to cleanly dismantle listeners and prevent memory leaks.
‎* 
‎* @param {LiveSystemStateManager} stateManager - The active state manager instance
‎* @returns {Function} Teardown closure to unbind all listeners at once
‎*/
‎export function bindStateManagerToEvents(stateManager) {
‎  const disposers = [];
‎
‎  // 1. MONITOR CORE ENGINE BOUNDARY STATUS
‎  disposers.push(
‎    eventHub.on("engine:start", () => {
‎      stateManager.engine = "active";
‎    })
‎  );
‎
‎  disposers.push(
‎    eventHub.on("engine:stop", () => {
‎      stateManager.engine = "missing";
‎    })
‎  );
‎
‎  disposers.push(
‎    eventHub.on("engine:panic", (payload) => {
‎      stateManager.engine = "panic";
‎      // Log critical failure metadata into the healing auditor if present
‎      if (stateManager.healingAuditor && typeof stateManager.healingAuditor.registerFailure === "function") {
‎        stateManager.healingAuditor.registerFailure(payload);
‎      }
‎    })
‎  );
‎
‎  // 2. LIFECYCLE INTERACTION WITH CONNECTORS & SWITCHER
‎  disposers.push(
‎    eventHub.on("environment:changed", (payload) => {
‎      // payload pattern: { mode: "sandbox" | "live", network: "mainnet" }
‎      if (stateManager.switcher && typeof stateManager.switcher.updateEnvironment === "function") {
‎        stateManager.switcher.updateEnvironment(payload.mode, payload.network);
‎      }
‎    })
‎  );
‎
‎  // 3. AUTOMATED METRICS AUDITING AGGREGATION
‎  disposers.push(
‎    eventHub.on("metrics:update", (payload) => {
‎      // Intercept trade execution metric snapshots to dynamically update the internal state
‎      if (stateManager.metrics && typeof stateManager.metrics.ingestTelemetry === "function") {
‎        stateManager.metrics.ingestTelemetry(payload);
‎      }
‎    })
‎  );
‎
‎  // 4. ARCHITECTURAL INTEGRITY STATE ALERTS
‎  disposers.push(
‎    eventHub.on("integrity:violation", (payload) => {
‎      // Instantly degrade system state cache when a data checksum discrepancy occurs
‎      if (stateManager.integrityAuditor && typeof stateManager.integrityAuditor.flagViolation === "function") {
‎        stateManager.integrityAuditor.flagViolation(payload);
‎      }
‎    })
‎  );
‎
‎  // 5. REGISTRY CONNECTIONS AND DISCONNECTIONS
‎  disposers.push(
‎    eventHub.on("registry:module_registered", (payload) => {
‎      if (stateManager.registry && typeof stateManager.registry.register === "function") {
‎        stateManager.registry.register(payload.name, payload.meta);
‎      }
‎    })
‎  );
‎
‎  // Return a single unified teardown hook to avoid stale references on rebuilds
‎  return () => {
‎    for (let i = 0; i < disposers.length; i++) {
‎      disposers[i](); // Executes the unbind closure returned by eventHeventHub.on()ub.on()
‎    }
‎  };
‎}
‎
‎
