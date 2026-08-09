// ============================================================
// QuantumTrader-AI™
// Live System State Manager
// Global Runtime Brain Snapshot (READ-ONLY INTELLIGENCE LAYER)
// Version 1.1 - Low-Allocation & Memoized Edition
// ============================================================

export class LiveSystemStateManager {

  constructor({
    runtime,
    engine,
    metrics,
    integrityAuditor,
    healingAuditor,
    registry,
    switcher,
    eventBus
  }) {

    this.runtime = runtime;
    this.engine = engine;
    this.metrics = metrics;
    this.integrityAuditor = integrityAuditor;
    this.healingAuditor = healingAuditor;
    this.registry = registry;
    this.switcher = switcher;
    this.eventBus = eventBus;
    
  }

  // =====================================
  // FULL SYSTEM SNAPSHOT
  // =====================================
  snapshot() {

    // 1. Gather all raw dependency reports inside safe zones exactly ONCE
    const runtimeMetrics = this._safe(() => this.runtime?.getMetrics?.());
    const engineState = this._safe(() => this.engine ? "active" : "missing");
    const metricsReport = this._safe(() => this.metrics?.report?.());
    const integrityAudit = this._safe(() => this.integrityAuditor?.runAudit?.());
    const healingDiagnosis = this._safe(() => this.healingAuditor?.diagnose?.());
    const registrySnap = this._safe(() => this.registry?.snapshot?.());
    const switcherSnap = this._safe(() => this.switcher?.snapshot?.());
    
    // Explicit fallback check matching the EventHub snapshot structure
    const eventBusSnap = this._safe(() => {
        if (!this.eventBus) return null;
        return typeof this.eventBus.snapshot === "function" 
          ? this.eventBus.snapshot() 
          : (this.eventBus.getMetrics?.() || null);
    });

    // 2. Compute health scoring passing the extracted metrics to avoid redundant executions
    const healthSummary = this._computeHealthMemoized(integrityAudit, metricsReport);

    // 3. Assemble and return immutable isolated snapshot
    return {
      timestamp: Date.now(),
      runtime: runtimeMetrics,
      engine: engineState,
      metrics: metricsReport,
      integrity: integrityAudit,
      healing: healingDiagnosis,
      registry: registrySnap,
      environment: switcherSnap,
      eventBus: eventBusSnap,
      health: healthSummary
    };
  }

  // =====================================
  // MEMOIZED HEALTH COMPUTATION
  // =====================================
  _computeHealthMemoized(audit, metrics) {

    let score = 100;

    // Check data integrity flags safely
    if (audit && audit.valid === false) {
        score -= 30;
    }

    // Process metric evaluation scores safely
    if (metrics) {
        if (typeof metrics.failureRate === "number" && metrics.failureRate > 0.2) {
            score -= 20;
        }
        if (typeof metrics.successRate === "number" && metrics.successRate < 0.7) {
            score -= 20;
        }
    }

    // Clamp absolute minimum score floor at 0
    const finalScore = Math.max(0, score);

    return {
      score: finalScore,
      status:
        finalScore > 80 ? "healthy"
        : finalScore > 50 ? "degraded"
        : "critical"
    };
  }

  // =====================================
  // SAFE EXECUTION WRAPPER
  // =====================================
  _safe(fn) {

    try {
      return fn() ?? null;
    } catch (err) {
      return {
        error: err?.message || "Unknown Runtime Execution Error"
      };
    }
  }

  // =====================================
  // LIVE MONITOR STREAM
  // =====================================
  stream(interval = 1000, callback) {

    if (typeof callback !== "function") {
        throw new TypeError("[StateManager] Stream requires a callback function");
    }

    const id = setInterval(() => {
      try {
        callback(this.snapshot());
      } catch (err) {
        console.error("[StateManager Stream Emitting Failure]", err);
      }
    }, interval);

    return () => clearInterval(id);
  }
    }
