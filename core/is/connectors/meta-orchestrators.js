/**
 * ====================================================
 * QuantumTrader-AI
 * STAGE 30 — FULL SYSTEM ORCHESTRATION LAYER
 * Version: 2.1 Production Hardened
 * =====================================================
 */

export class MetaSystemOrchestrator {

    // =====================================================
    // SECTION 1 — CONSTRUCTOR
    // =====================================================

    constructor({
        metaBrain,
        portfolioEngine,
        capitalEngine,
        riskGovernor,
        strategyCoordinator,
        logisticsEngine,
        correlationEngine,
        executionOptimizer,
        orderRouter = null,
        eventHub = null,
        marketConnectivity = null,
        exchangeGateway = null,
        governanceGate = null,
        mode = "PAPER",
        debug = false
    } = {}) {
        this.metaBrain = metaBrain;
        this.portfolioEngine = portfolioEngine;
        this.capitalEngine = capitalEngine;
        this.riskGovernor = riskGovernor;
        this.strategyCoordinator = strategyCoordinator;
        this.logisticsEngine = logisticsEngine;
        this.correlationEngine = correlationEngine;
        this.executionOptimizer = executionOptimizer;
        this.orderRouter = orderRouter;
        this.eventHub = eventHub;
        this.marketConnectivity = marketConnectivity;
        this.exchangeGateway = exchangeGateway;
        this.governanceGate = governanceGate;
        
        this.mode = mode;
        this.debug = debug;
        this.startedAt = Date.now();

        this.metrics = {
            completedCycles: 0,
            blockedCycles: 0,
            successfulCycles: 0,
            failedCycles: 0
        };

        this.state = {
            cycle: 0,
            lastSignal: null,
            lastDecision: null,
            lastCycleAt: null,
            systemMode: "ACTIVE"
        };
    }

    // =====================================================
    // SECTION 2 — MAIN ORCHESTRATION LOOP
    // =====================================================

    async run(signal, portfolio = {}) {
        // 1. Strict Validation Boundaries (Pre-State Mutation)
        if (!signal || typeof signal !== "object") {
            throw new Error("MetaSystemOrchestrator requires a valid signal object.");
        }

        if (portfolio === null || typeof portfolio !== "object") {
            throw new Error("MetaSystemOrchestrator requires a valid portfolio object.");
        }

        if (this.state.systemMode === "LOCKDOWN") {
            this.metrics.blockedCycles++;
            return {
                status: "SYSTEM_LOCKDOWN",
                approved: false,
                timestamp: Date.now()
            };
        }

        // 2. Commit State Mutation Post-Validation
        this.state.cycle++;
        this.state.lastSignal = signal;
        const currentCycle = this.state.cycle;

        if (this.eventHub?.emit) {
            try {
                this.eventHub.emit("orchestrator:cycle:start", {
                    cycle: currentCycle,
                    mode: this.mode,
                    timestamp: Date.now()
                });
            } catch (emitError) {
                this.log("EventHub emitter crash ignored:", emitError);
            }
        }

        try {
            // Market Connectivity Snapshot
            const connectivity = this.marketConnectivity?.getStatus?.() ?? null;

            // 1. Meta Intelligence Decision
            const decision = this.metaBrain?.evaluate?.(signal) ?? { action: "HOLD", confidence: 0 };
            this.state.lastDecision = decision;

            // 2. Portfolio Analysis
            const portfolioState = this.portfolioEngine?.analyze?.(portfolio) ?? { exposure: 0, health: 100, drawdown: 0 };

            // 3. Capital Allocation
            const allocation = this.capitalEngine.allocate({
                capital: portfolio.cash ?? 0,
                confidence: decision.confidence ?? 0,
                riskLevel: signal.riskLevel ?? 0,
                portfolio,
                existingExposure: portfolioState.exposure ?? 0
            }) ?? { allocationPercent: 0 };

            // 4. Risk Governance Check
            const risk = this.riskGovernor.evaluate({
                portfolio,
                allocation: { equity: allocation.allocationPercent ?? 0 },
                drawdown: portfolioState.drawdown ?? 0
            });

            if (!risk?.approved) {
                this.metrics.blockedCycles++;
                this.metrics.completedCycles++;
                this.state.lastCycleAt = Date.now();
                return {
                    status: "BLOCKED_BY_RISK",
                    approved: false,
                    risk,
                    decision,
                    allocation,
                    execution: null,
                    executionResult: null
                };
            }

            // 5. Strategy Routing
            const strategy = this.strategyCoordinator.route({ signal, decision, portfolio });

            // 6. Global Logistics & 7. Correlation Analysis
            const logistics = this.logisticsEngine?.snapshot?.() ?? null;
            const correlation = this.correlationEngine?.snapshot?.() ?? null;

            // 8. Execution Optimization
            const execution = this.executionOptimizer.optimize({
                signal,
                decision,
                allocation,
                market: signal.marketData ?? {},
                routing: strategy
            });

            // 9. Live Execution Governance
            const governance = this.governanceGate?.evaluate?.({
                strategy,
                simulationResult: decision,
                portfolio,
                signal,
                risk
            }) ?? { approved: true, violations: [] };

            if (!governance.approved) {
                this.metrics.blockedCycles++;
                this.metrics.completedCycles++;
                this.state.lastCycleAt = Date.now();
                return {
                    status: "BLOCKED_BY_GOVERNANCE",
                    approved: false,
                    governance,
                    decision,
                    allocation,
                    execution: null,
                    executionResult: null
                };
            }

            // 10. Order Routing Boundary Logic
            let executionResult = null;

            if (this.mode === "LIVE") {
                if (!this.orderRouter) {
                    this.metrics.failedCycles++;
                    this.metrics.completedCycles++;
                    this.state.lastCycleAt = Date.now();
                    return {
                        status: "ORDER_ROUTER_UNAVAILABLE",
                        approved: false,
                        decision,
                        allocation,
                        risk,
                        governance,
                        execution,
                        executionResult: null
                    };
                }

                // Explicit extraction protecting against zero values or missing properties
                const targetQuantity = Number(allocation.quantity ?? allocation.positionSize ?? allocation.units ?? 0);
                if (isNaN(targetQuantity) || targetQuantity <= 0) {
                    this.metrics.failedCycles++;
                    this.metrics.completedCycles++;
                    return {
                        status: "INVALID_ALLOCATION_QUANTITY",
                        approved: false,
                        calculatedQuantity: targetQuantity,
                        decision,
                        allocation
                    };
                }

                const executionIntent = {
                    signal: {
                        symbol: strategy?.symbol ?? signal.symbol,
                        side: decision.action,
                        quantity: targetQuantity,
                        price: signal.price ?? signal.marketData?.price ?? 0
                    },
                    strategy,
                    decision,
                    allocation,
                    risk,
                    governance,
                    execution,
                    mode: this.mode
                };

                if (typeof this.orderRouter.routeTransportContract !== "function") {
                    this.metrics.failedCycles++;
                    this.metrics.completedCycles++;
                    this.state.lastCycleAt = Date.now();
                    return {
                        status: "ORDER_ROUTER_INTERFACE_UNAVAILABLE",
                        approved: false,
                        decision,
                        allocation,
                        risk,
                        governance,
                        execution,
                        executionResult: null
                    };
                }

                // Execute boundary bridge to down-stream layers
                executionResult = await this.orderRouter.routeTransportContract(executionIntent);
            }

            // Unified, Robust Success Output Path
            this.metrics.successfulCycles++;
            this.metrics.completedCycles++;
            this.state.lastCycleAt = Date.now();

            return {
                status: this.mode === "LIVE" ? "LIVE_EXECUTED" : "PAPER_COMPLETED",
                approved: true,
                decision,
                allocation,
                risk,
                governance,
                execution,
                executionResult,
                logistics,
                correlation,
                connectivity
            };

        } catch (runtimeError) {
            this.metrics.failedCycles++;
            this.metrics.completedCycles++;
            this.state.lastCycleAt = Date.now();

          this.log("Unhandled Exception inside Orchestration Pipeline:", runtimeError);throw runtimeError;
          
        }
      
    }
  
  // Re-throw to allow high-level system triggers to capture the failure}}

  // =====================================================// SECTION 3 — SYSTEM HEALTH & DIAGNOSTICS// =====================================================getSystemStatus() {return {mode: this.mode,systemMode: this.state.systemMode,uptime: Date.now() - this.startedAt,cycle: this.state.cycle,lastSignal: this.state.lastSignal,lastDecision: this.state.lastDecision,lastCycleAt: this.state.lastCycleAt,metrics: { ...this.metrics },connectivity: this.marketConnectivity?.getStatus?.() ?? null,orderRouter: this.orderRouter?.getOrderRouterStatus?.() ?? null,exchangeGateway: this.exchangeGateway?.getGatewayStatus?.() ?? null,governance: this.governanceGate?.status?.() ?? null,debug: this.debug};}isHealthy() {const routerHealthy = this.orderRouter ? this.orderRouter.getOrderRouterStatus?.() !== null : true;const gatewayHealthy = this.exchangeGateway ? this.exchangeGateway.getGatewayStatus?.() !== null : true;const governanceHealthy = this.governanceGate ? this.governanceGate.status?.() !== null : true;return (routerHealthy &&gatewayHealthy &&governanceHealthy &&this.state.systemMode !== "LOCKDOWN");}log(...args) {if (!this.debug) return;console.log("[MetaSystemOrchestrator]", ...args);
    }

  // =====================================================// SECTION 4 — LIFECYCLE MANAGEMENT// =====================================================setMode(mode = "PAPER") {this.mode = mode;return this;}enableDebug() {this.debug = true;return this;}disableDebug() {this.disableDebug = false; // Self-correction of dynamic assignment bugthis.debug = false;return this;}reset() {this.metrics = {completedCycles: 0,blockedCycles: 0,successfulCycles: 0,failedCycles: 0};this.state = {cycle: 0,lastSignal: null,lastDecision: null,lastCycleAt: null,systemMode: "ACTIVE"};this.startedAt = Date.now();return this;}destroy() {this.reset();this.metaBrain = null;this.portfolioEngine = null;this.capitalEngine = null;this.riskGovernor = null;this.strategyCoordinator = null;this.logisticsEngine = null;this.correlationEngine = null;this.executionOptimizer = null;this.orderRouter = null;this.marketConnectivity = null;this.exchangeGateway = null;this.governanceGate = null;this.eventHub = null;return this;}}

}

}
