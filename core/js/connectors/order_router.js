 /**
 * ============================================================
 * QuantumTrader-AI (Qonexai)
 * TITLE: ORDER ROUTER
 * Serial 3.6.2 — Order Routing Layer
 * Production Version 1.0
 * ============================================================
 *
 * PURPOSE
 * -------
 * Controlled routing boundary between validated execution
 * requests and the Exchange Gateway.
 *
 * The Order Router does NOT:
 *
 * • generate trading decisions
 * • select trading strategies
 * • calculate risk
 * • authorize trades
 * • override governance decisions
 * • communicate directly with exchanges
 * • execute orders directly
 * • perform paper execution
 * • perform live execution
 * • manage exchange connections
 * • duplicate execution confirmation
 * • duplicate execution failure handling
 *
 * The Order Router is responsible for:
 *
 * 1. Receiving an approved execution-routing request.
 * 2. Validating the routing envelope.
 * 3. Resolving the configured Exchange Gateway.
 * 4. Routing a normalized order to ExchangeGateway.submitOrder().
 * 5. Routing a transport contract to
 *    ExchangeGateway.processTransportContract().
 * 6. Publishing router-level lifecycle events.
 * 7. Returning a standardized routing result.
 * 8. Preserving execution traceability.
 *
 * ============================================================
 * ARCHITECTURAL POSITION
 * ============================================================
 *
 * Strategy / Decision Layer
 *          ↓
 * Risk / Governance Layer
 *          ↓
 * Execution Request / Transport Contract
 *          ↓
 * ------------------------------------------------
 *              ORDER ROUTER
 *                 3.6.2
 * ------------------------------------------------
 *          ↓
 * ExchangeGateway.submitOrder()
 *          OR
 * ExchangeGateway.processTransportContract()
 *          ↓
 * Exchange Gateway Execution
 *          ↓
 * Execution Confirmation
 *          ↓
 * Execution Feedback Layer
 *
 * ============================================================
 * IMPORTANT EXCHANGE GATEWAY CONTRACT
 * ============================================================
 *
 * This router is explicitly aligned with the current
 * ExchangeGateway implementation.
 *
 * Supported gateway methods:
 *
 * • submitOrder(order)
 * • processTransportContract(transport)
 * • acceptTransportContract(transport)
 *
 * Primary routing methods used by this router:
 *
 * • submitOrder(order)
 * • processTransportContract(transport)
 *
 * The router does NOT call:
 *
 * • routeOrder()
 * • executeOrder()
 *
 * because those are not public routing methods exposed by the
 * supplied ExchangeGateway implementation.
 *
 * ============================================================
 * GOVERNANCE BOUNDARY
 * ============================================================
 *
 * Governance approval is owned by ExchangeGateway.
 *
 * ExchangeGateway.submitOrder() internally calls:
 *
 * requestExecutionApproval(order)
 *
 * Therefore this router does NOT:
 *
 * • perform governance approval
 * • duplicate governance approval
 * • override governance approval
 *
 * The router only forwards the request to the gateway.
 *
 * ============================================================
 * EVENT HUB BOUNDARY
 * ============================================================
 *
 * ExchangeGateway already publishes:
 *
 * • execution:confirmed
 * • execution:failed
 *
 * Therefore this router publishes only router lifecycle events.
 *
 * Router events:
 *
 * • order_router:ready
 * • order_router:routing
 * • order_router:routed
 * • order_router:rejected
 * • order_router:failed
 *
 * The router must not duplicate:
 *
 * • execution:confirmed
 * • execution:failed
 *
 * Those remain owned by ExchangeGateway.
 *
 * ============================================================
 */

/* ============================================================
 * SECTION 1 — CONSTANTS & ROUTER CONFIGURATION
 * ============================================================
 */
const ROUTER_NAME = 'QT_AI_ORDER_ROUTER';

const OrderRouter = {
    // Safely look up existing maps or initialize them once to prevent data wiping
    activeOrders: null,
    statusCallbacks: null,

    initialize() {
        if (!this.activeOrders) {
            this.activeOrders = new Map();
        }
        if (!this.statusCallbacks) {
            this.statusCallbacks = new Set();
        }
        return this;
    },

    routeOrder(orderData) {
        // Enforce initialization check
        if (!this.activeOrders) {
            this.initialize();
        }

        if (!this.isValidOrder(orderData)) {
            return { success: false, error: 'Invalid order structure' };
        }

        // Generate robust unique internal ID
        const cryptoId = Math.random().toString(36).substring(2, 11);
        const internalId = `OR-${Date.now()}-${cryptoId}`;
        
        const processedOrder = {
            id: internalId,
            externalId: orderData.id || null,
            items: orderData.items || [],
            total: orderData.total || 0,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };

        this.activeOrders.set(internalId, processedOrder);
        return { success: true, orderId: internalId };
    },

    isValidOrder(order) {
        return !!(order && typeof order === 'object' && Array.isArray(order.items));
    }
};

// Export the module if using Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OrderRouter, ROUTER_NAME };
}

 
‎// =====================================================
‎// SECTION 2 — MAIN ORCHESTRATION LOOP (CONCLUSION)
‎// =====================================================
‎            let executionResult = null;
‎
‎            if (this.mode === "LIVE") {
‎                if (!this.orderRouter) {
‎                    this.metrics.failedCycles++;
‎                    this.metrics.completedCycles++;
‎                    this.state.lastCycleAt = Date.now();
‎                    return {
‎                        status: "ORDER_ROUTER_UNAVAILABLE",
‎                        approved: false,
‎                        decision,
‎                        allocation,
‎                        risk,
‎                        governance,
‎                        execution,
‎                        executionResult: null
‎                    };
‎                }
‎
‎                const targetQuantity = Number(
‎                    allocation.quantity !== undefined && allocation.quantity !== null ? allocation.quantity :
‎                    (allocation.positionSize !== undefined && allocation.positionSize !== null ? allocation.positionSize :
‎                    (allocation.units !== undefined && allocation.units !== null ? allocation.units : 0))
‎                );
‎
‎                if (isNaN(targetQuantity) || targetQuantity <= 0) {
‎                    this.metrics.failedCycles++;
‎                    this.metrics.completedCycles++;
‎                    return {
‎                        status: "INVALID_ALLOCATION_QUANTITY",
‎                        approved: false,
‎                        calculatedQuantity: targetQuantity,
‎                        decision,
‎                        allocation
‎                    };
‎                }
‎
‎                const executionIntent = {
‎                    signal: {
‎                        symbol: (strategy && strategy.symbol) ? strategy.symbol : signal.symbol,
‎                        side: decision.action,
‎                        quantity: targetQuantity,
‎                        price: signal.price !== undefined ? signal.price : ((signal.marketData && signal.marketData.price) ? signal.marketData.price : 0)
‎                    },
‎                    strategy,
‎                    decision,
‎                    allocation,
‎                    risk,
‎                    governance,
‎                    execution,
‎                    mode: this.mode
‎                };
‎
‎                if (typeof this.orderRouter.routeTransportContract !== "function") {
‎                    this.metrics.failedCycles++;
‎                    this.metrics.completedCycles++;
‎                    this.state.lastCycleAt = Date.now();
‎                    return {
‎                        status: "ORDER_ROUTER_INTERFACE_UNAVAILABLE",
‎                        approved: false,
‎                        decision,
‎                        allocation,
‎                        risk,
‎                        governance,
‎                        execution,
‎                        executionResult: null
‎                    };
‎                }
‎
‎                executionResult = await this.orderRouter.routeTransportContract(executionIntent);
‎            }
‎
‎            this.metrics.successfulCycles++;
‎            this.metrics.completedCycles++;
‎            this.state.lastCycleAt = Date.now();
‎
‎            return {
‎                status: this.mode === "LIVE" ? "LIVE_EXECUTED" : "PAPER_COMPLETED",
‎                approved: true,
‎                decision,
‎                allocation,
‎                risk,
‎                governance,
‎                execution,
‎                executionResult,
‎                logistics,
‎                correlation,
‎                connectivity
‎            };
‎
‎        } catch (runtimeError) {
‎            this.metrics.failedCycles++;
‎            this.metrics.completedCycles++;
‎            this.state.lastCycleAt = Date.now();
‎            this.log("Unhandled Exception inside Orchestration Pipeline:", runtimeError);
‎            throw runtimeError;
‎        }
‎    }
‎
‎    // =====================================================
‎    // SECTION 3 — SYSTEM HEALTH & DIAGNOSTICS
‎    // =====================================================
‎    getSystemStatus() {
‎        return {
‎            mode: this.mode,
‎            systemMode: this.state.systemMode,
‎            uptime: Date.now() - this.startedAt,
‎            cycle: this.state.cycle,
‎            lastSignal: this.state.lastSignal,
‎            lastDecision: this.state.lastDecision,
‎            lastCycleAt: this.state.lastCycleAt,
‎            metrics: {
‎                completedCycles: this.metrics.completedCycles,
‎                blockedCycles: this.metrics.blockedCycles,
‎                successfulCycles: this.metrics.successfulCycles,
‎                failedCycles: this.metrics.failedCycles
‎            },
‎            connectivity: (this.marketConnectivity && typeof this.marketConnectivity.getStatus === "function") ? this.marketConnectivity.getStatus() : null,
‎            orderRouter: (this.orderRouter && typeof this.orderRouter.getOrderRouterStatus === "function") ? this.orderRouter.getOrderRouterStatus() : null,
‎            exchangeGateway: (this.exchangeGateway && typeof this.exchangeGateway.getGatewayStatus === "function") ? this.exchangeGateway.getGatewayStatus() : null,
‎            governance: (this.governanceGate && typeof this.governanceGate.status === "function") ? this.governanceGate.status() : null,
‎            debug: this.debug
‎        };
‎    }
‎
‎    isHealthy() {
‎        const routerHealthy = this.orderRouter ? (typeof this.orderRouter.getOrderRouterStatus === "function" ? this.orderRouter.getOrderRouterStatus() !== null : false) : true;
‎        const gatewayHealthy = this.exchangeGateway ? (typeof this.exchangeGateway.getGatewayStatus === "function" ? this.exchangeGateway.getGatewayStatus() !== null : false) : true;
‎        const governanceHealthy = this.governanceGate ? (typeof this.governanceGate.status === "function" ? this.governanceGate.status() !== null : false) : true;
‎        return (routerHealthy && gatewayHealthy && governanceHealthy && this.state.systemMode !== "LOCKDOWN");
‎    }
‎
‎    log() {
‎        if (!this.debug) return;
‎        var args = Array.prototype.slice.call(arguments);
‎        args.unshift("[MetaSystemOrchestrator]");
‎        console.log.apply(console, args);
‎    }
‎
‎    // =====================================================
‎    // SECTION 4 — LIFECYCLE MANAGEMENT
‎    // =====================================================
‎    setMode(mode) {
‎        this.mode = mode !== undefined && mode !== null ? mode : "PAPER";
‎        return this;
‎    }
‎
‎    enableDebug() {
‎        this.debug = true;
‎        return this;
‎    }
‎
‎    disableDebug() {
‎        this.debug = false;
‎        return this;
‎    }
‎
‎    reset() {
‎        this.metrics = {
‎            completedCycles: 0,
‎            blockedCycles: 0,
‎            successfulCycles: 0,
‎            failedCycles: 0
‎        };
‎        this.state = {
‎            cycle: 0,
‎            lastSignal: null,
‎            lastDecision: null,
‎            lastCycleAt: null,
‎            systemMode: "ACTIVE"
‎        };
‎        this.startedAt = Date.now();
‎        return this;
‎    }
‎
‎    destroy() {
‎        this.reset();
‎        this.metaBrain = null;
‎        this.portfolioEngine = null;
‎        this.capitalEngine = null;
‎        this.riskGovernor = null;
‎        this.strategyCoordinator = null;
‎        this.logisticsEngine = null;
‎        this.correlationEngine = null;
‎        this.executionOptimizer = null;
‎        this.orderRouter = null;
‎        this.marketConnectivity = null;
‎        this.exchangeGateway = null;
‎        this.governanceGate = null;
‎        this.eventHub = null;
‎        return this;
‎    }
‎}

/* ============================================================
 * SECTION 5 — REQUEST VALIDATION
 * ============================================================
 */

/**
 * Validate a normalized order-routing request.
 *
 * This validation checks only routing integrity.
 *
 * It does NOT replace ExchangeGateway.validateOrder().
 *
 * ExchangeGateway remains responsible for actual order
 * validation before execution.
 *
 * @param {Object} order
 * @returns {Object}
 */
function validateOrderRoute(
    order
) {

    if (
        !order ||
        typeof order !== "object"
    ) {

        return {

            valid:
                false,

            reason:
                "INVALID_ORDER_REQUEST"

        };

    }

    if (
        !isNonEmptyString(
            order.symbol
        )
    ) {

        return {

            valid:
                false,

            reason:
                "MISSING_ORDER_SYMBOL"

        };

    }

    if (
        !isNonEmptyString(
            order.side
        )
    ) {

        return {

            valid:
                false,

            reason:
                "MISSING_ORDER_SIDE"

        };

    }

    if (
        typeof order.quantity !==
        "number"
        ||
        order.quantity <=
        0
    ) {

        return {

            valid:
                false,

            reason:
                "INVALID_ORDER_QUANTITY"

        };

    }

    return {

        valid:
            true

    };

}

/**
 * Validate an ExchangeGateway transport contract.
 *
 * The gateway itself performs the definitive transport
 * contract validation through acceptTransportContract().
 *
 * This router performs only enough validation to prevent
 * obviously malformed routing requests.
 *
 * @param {Object} transport
 * @returns {Object}
 */
function validateTransportRoute(
    transport
) {

    if (
        !transport ||
        typeof transport !== "object"
    ) {

        return {

            valid:
                false,

            reason:
                "INVALID_TRANSPORT_CONTRACT"

        };

    }

    if (
        !transport.route
    ) {

        return {

            valid:
                false,

            reason:
                "MISSING_TRANSPORT_ROUTE"

        };

    }

    if (
        !transport.route.execution
    ) {

        return {

            valid:
                false,

            reason:
                "MISSING_EXECUTION_PACKAGE"

        };

    }

    return {

        valid:
            true

    };

}

/* ============================================================
 * SECTION 6 — ROUTER CONFIGURATION
 * ============================================================
 */

/**
 * Configure the Order Router.
 *
 * Expected configuration:
 *
 * {
 *     eventHub,
 *     exchangeGateway
 * }
 *
 * @param {Object} config
 * @returns {Object}
 */
function configureOrderRouter(
    config = {}
) {

    if (
        !config ||
        typeof config !== "object"
    ) {

        return {

            success:
                false,

            status:
                ROUTER_STATUS.UNAVAILABLE,

            reason:
                "INVALID_ROUTER_CONFIGURATION"

        };

    }

    if (
        config.eventHub
    ) {

        if (
            typeof config.eventHub.emit !==
            "function"
        ) {

            return {

                success:
                    false,

                status:
                    ROUTER_STATUS.UNAVAILABLE,

                reason:
                    "INVALID_EVENT_HUB"

            };

        }

        routerState.eventHub =
            config.eventHub;

    }

    if (
        config.exchangeGateway
    ) {

        const contract =
            validateGatewayContract(
                config.exchangeGateway
            );

        if (
            !contract.valid
        ) {

            return {

                success:
                    false,

                status:
                    ROUTER_STATUS.UNAVAILABLE,

                reason:
                    contract.reason

            };

        }

        routerState.exchangeGateway =
            config.exchangeGateway;

    }

    if (
        !routerState.exchangeGateway
    ) {

        routerState.initialized =
            false;

        routerState.status =
            ROUTER_STATUS.UNAVAILABLE;

        return {

            success:
                false,

            status:
                ROUTER_STATUS.UNAVAILABLE,

            reason:
                "EXCHANGE_GATEWAY_NOT_CONFIGURED"

        };

    }

    routerState.initialized =
        true;

    routerState.status =
        ROUTER_STATUS.READY;

    routerState.updatedAt =
        now();

    publishEvent(

        "order_router:ready",

        {

            router:
                ROUTER_NAME,

            version:
                ROUTER_VERSION,

            timestamp:
                routerState.updatedAt

        }

    );

    return {

        success:
            true,

        status:
            ROUTER_STATUS.READY,

        router:
            ROUTER_NAME,

        version:
            ROUTER_VERSION,

        timestamp:
            routerState.updatedAt

    };

}

/* ============================================================
 * SECTION 7 — GATEWAY ACCESS
 * ============================================================
 */

/**
 * Attach or replace the ExchangeGateway instance.
 *
 * @param {Object} exchangeGateway
 * @returns {Object}
 */
function attachExchangeGateway(
function attachExchangeGateway(
    exchangeGateway
) {

    const contract =
        validateGatewayContract(
            exchangeGateway
        );

    if (
        !contract.valid
    ) {

        return {

            success:
                false,

            attached:
                false,

            reason:
                contract.reason

        };

    }

    routerState.exchangeGateway =
        exchangeGateway;

    routerState.initialized =
        true;

    routerState.status =
        ROUTER_STATUS.READY;

    routerState.updatedAt =
        now();

    return {

        success:
            true,

        attached:
            true,

        status:
            ROUTER_STATUS.READY,

        timestamp:
            routerState.updatedAt

    };

}

function getExchangeGateway() {

    return (
        routerState.exchangeGateway !== undefined && routerState.exchangeGateway !== null
            ? routerState.exchangeGateway
            : null
    );

}

/* ============================================================
 * SECTION 8 — STANDARDIZED ROUTING RESULT
 * ============================================================
 */

/**
 * Build a standardized routing result.
 *
 * @param {Object} data
 * @returns {Object}
 */
function buildRoutingResult(
    data = {}
) {

    return {

        success:
            data.success !== undefined && data.success !== null ? data.success : false,

        decision:
            data.decision !== undefined && data.decision !== null ? data.decision : ROUTING_DECISION.REJECT,

        routed:
            data.routed !== undefined && data.routed !== null ? data.routed : false,

        status:
            data.status !== undefined && data.status !== null ? data.status : ROUTER_STATUS.FAILED,

        router:
            ROUTER_NAME,

        version:
            ROUTER_VERSION,

        routingType:
            data.routingType !== undefined && data.routingType !== null ? data.routingType : null,

        routingId:
            data.routingId !== undefined && data.routingId !== null ? data.routingId : null,

        orderId:
            data.orderId !== undefined && data.orderId !== null ? data.orderId : null,

        transportId:
            data.transportId !== undefined && data.transportId !== null ? data.transportId : null,

        executionId:
            data.executionId !== undefined && data.executionId !== null ? data.executionId : null,

        gateway:
            "ExchangeGateway",

        gatewayResult:
            data.gatewayResult !== undefined && data.gatewayResult !== null ? data.gatewayResult : null,

        reason:
            data.reason !== undefined && data.reason !== null ? data.reason : null,

        error:
            data.error !== undefined && data.error !== null ? data.error : null,

        timestamp:
            data.timestamp !== undefined && data.timestamp !== null ? data.timestamp : now()

    };

}

 /* ============================================================
 * SECTION 9 — ORDER ROUTING
 * ============================================================
 */

/**
 * Route a normalized order through the actual
 * ExchangeGateway.submitOrder(order) contract.
 *
 * The ExchangeGateway remains responsible for:
 *
 * • Order validation
 * • Governance approval
 * • Paper execution
 * • Live execution
 * • Exchange interaction
 * • Execution statistics
 * • Execution confirmation events
 * • Execution failure events
 *
 * @param {Object} order
 * @returns {Promise<Object>}
 */
async function routeOrder(
    order
) {

    routerState.totalRequests++;

    const routingId =
        generateRoutingId();

    const validation =
        validateOrderRoute(
            order
        );

    if (
        !validation.valid
    ) {

        routerState.rejectedRequests++;

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.ORDER,

                routingId,

                orderId:
                    resolveOrderId(
                        order
                    ),

                reason:
                    validation.reason

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:rejected",

            result

        );

        return result;

    }

    if (
        !routerState.exchangeGateway
    ) {

        routerState.rejectedRequests++;

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.ORDER,

                routingId,

                orderId:
                    resolveOrderId(
                        order
                    ),

                reason:
                    "EXCHANGE_GATEWAY_NOT_CONFIGURED"

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:rejected",

            result

        );

        return result;

    }

    if (
        typeof routerState.exchangeGateway.submitOrder !==
        "function"
    ) {

        routerState.rejectedRequests++;

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

   routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.ORDER,

                routingId,

                orderId:
                    resolveOrderId(
                        order
                    ),

                reason:
                    "EXCHANGE_GATEWAY_SUBMIT_ORDER_UNAVAILABLE"

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:rejected",

            result

        );

        return result;

    }

    routerState.status =
        ROUTER_STATUS.ROUTING;

    routerState.lastRoutingId =
        routingId;

    routerState.lastOrderId =
        resolveOrderId(
            order
        );

    routerState.lastRoute = {

        routingId,

        routingType:
            ROUTING_TYPE.ORDER,

        orderId:
            routerState.lastOrderId,

        startedAt:
            now()

    };

    publishEvent(

        "order_router:routing",

        {

            router:
                ROUTER_NAME,

            routingId,

            routingType:
                ROUTING_TYPE.ORDER,

            orderId:
                routerState.lastOrderId,

            timestamp:
                now()

        }

    );

    try {

        /*
         * EXACT EXCHANGE GATEWAY CONTRACT
         *
         * ExchangeGateway.submitOrder(order)
         */

        const gatewayResult =
            await routerState.exchangeGateway.submitOrder(
                order
            );

        routerState.successfulRoutes++;

        routerState.status =
            ROUTER_STATUS.COMPLETED;

        const result =
            buildRoutingResult({

                success:
                    true,

                decision:
                    ROUTING_DECISION.ROUTE,

                routed:
                    true,

                status:
                    ROUTER_STATUS.COMPLETED,

                routingType:
                    ROUTING_TYPE.ORDER,

                routingId,

                orderId:
                    resolveOrderId(
                        order
                    ),

                executionId:
                    gatewayResult?.orderId ??
                    null,

                gatewayResult

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:routed",

            result

        );

        return result;

    } catch (error) {

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.ORDER,

                routingId,

                orderId:
                    resolveOrderId(
                        order
                    ),

                reason:
                    "EXCHANGE_GATEWAY_SUBMISSION_FAILED",

                error:
                    error.message ??
                    String(error)

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:failed",

            result

        );

        return result;

    }

     }

/* ============================================================
 * SECTION 10 — TRANSPORT CONTRACT ROUTING
 * ============================================================
 */

/**
 * Route an ExchangeGateway transport contract.
 *
 * This method uses the actual gateway contract:
 *
 * ExchangeGateway.processTransportContract(transport)
 *
 * The ExchangeGateway then:
 *
 * 1. accepts the transport contract
 * 2. extracts the execution package
 * 3. creates the normalized order
 * 4. calls submitOrder(order)
 *
 * @param {Object} transport
 * @returns {Promise<Object>}
 */
async function routeTransportContract(
    transport
) {

    routerState.totalRequests++;

    const routingId =
        generateRoutingId();

    const validation =
        validateTransportRoute(
            transport
        );

    const transportId =
        resolveTransportId(
            transport
        );

    if (
        !validation.valid
    ) {

        routerState.rejectedRequests++;

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.TRANSPORT,

                routingId,

                transportId,

                reason:
                    validation.reason

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:rejected",

            result

        );

        return result;

    }

    if (
        !routerState.exchangeGateway
    ) {

        routerState.rejectedRequests++;

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.TRANSPORT,

                routingId,

                transportId,

                reason:
                    "EXCHANGE_GATEWAY_NOT_CONFIGURED"

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:rejected",

            result

        );

        return result;

    }

    if (
        typeof routerState.exchangeGateway.processTransportContract !==
        "function"
    ) {

        routerState.rejectedRequests++;

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.TRANSPORT,

                routingId,

                transportId,

                reason:
                    "EXCHANGE_GATEWAY_TRANSPORT_CONTRACT_UNAVAILABLE"

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:rejected",

            result

        );

        return result;

    }

    routerState.status =
        ROUTER_STATUS.ROUTING;

    routerState.lastRoutingId =
        routingId;

    routerState.lastRoute = {

        routingId,

        routingType:
            ROUTING_TYPE.TRANSPORT,

        transportId,

        startedAt:
            now()

    };

    publishEvent(

        "order_router:routing",

        {

            router:
                ROUTER_NAME,

            routingId,

            routingType:
                ROUTING_TYPE.TRANSPORT,

            transportId,

            timestamp:
                now()

        }

    );

    try {

        /*
         * EXACT EXCHANGE GATEWAY CONTRACT
         *
         * ExchangeGateway.processTransportContract(
         *     transport
         * )
         */

        const gatewayResult =
            await routerState.exchangeGateway.processTransportContract(
                transport
            );

        routerState.successfulRoutes++;

        routerState.status =
            ROUTER_STATUS.COMPLETED;

        const result =
            buildRoutingResult({

                success:
                    true,

                decision:
                    ROUTING_DECISION.ROUTE,

                routed:
                    true,

                status:
                    ROUTER_STATUS.COMPLETED,

                routingType:
                    ROUTING_TYPE.TRANSPORT,

                routingId,

                transportId,

                executionId:
                    gatewayResult?.orderId ??
                    null,

                gatewayResult

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:routed",

            result

        );

        return result;

    } catch (error) {

        routerState.failedRoutes++;

        routerState.status =
            ROUTER_STATUS.FAILED;

        const result =
            buildRoutingResult({

                success:
                    false,

                decision:
                    ROUTING_DECISION.REJECT,

                routed:
                    false,

                status:
                    ROUTER_STATUS.FAILED,

                routingType:
                    ROUTING_TYPE.TRANSPORT,

                routingId,

                transportId,

                reason:
                    "EXCHANGE_GATEWAY_TRANSPORT_ROUTING_FAILED",

                error:
                    error.message ??
                    String(error)

            });

        routerState.lastResult =
            result;

        routerState.updatedAt =
            result.timestamp;

        publishEvent(

            "order_router:failed",

            result

        );

        return result;

    }

}

/* ============================================================
 * SECTION 11 — UNIFIED ROUTING ENTRY
 * ============================================================
 */

/**
 * Unified routing entry point.
 *
 * Supported request types:
 *
 * {
 *     type: "ORDER",
 *     order: {...}
 * }
 *
 * OR
 *
 * {
 *     type: "TRANSPORT",
 *     transport: {...}
 * }
 *
 * @param {Object} request
 * @returns {Promise<Object>}
 */
 async function route(
    request = {}
) {

    try {
        if (
            !request ||
            typeof request !== "object"
        ) {

            return buildRoutingResult({

                reason:
                    "INVALID_ROUTING_REQUEST"

            });

        }

        const type =
            request.type !== undefined && request.type !== null ? request.type : ROUTING_TYPE.ORDER;

        if (
            type ===
            ROUTING_TYPE.TRANSPORT
        ) {

            return await routeTransportContract(

                request.transport

            );

        }

        if (
            type ===
            ROUTING_TYPE.ORDER
        ) {

            return await routeOrder(

                request.order

            );

        }

        return buildRoutingResult({

            reason:
                "UNSUPPORTED_ROUTING_TYPE"

        });
    } catch (criticalError) {
        return buildRoutingResult({
            success: false,
            reason: "CRITICAL_ROUTE_EXCEPTION",
            error: criticalError.message || String(criticalError)
        });
    }

 }
     
/* ============================================================
 * SECTION 12 — ROUTER STATUS
 * ============================================================
 */

/**
 * Return current Order Router status.
 *
 * @returns {Object}
 */
function getOrderRouterStatus() {

    return {

        router:
            ROUTER_NAME,

        version:
            ROUTER_VERSION,

        initialized:
            routerState.initialized,

        status:
            routerState.status,

        exchangeGatewayAttached:
            Boolean(
                routerState.exchangeGateway
            ),

        gatewayContract: {

            submitOrder:
                Boolean(

                    routerState.exchangeGateway &&

                    typeof routerState.exchangeGateway
                        .submitOrder ===
                        "function"

                ),

            processTransportContract:
                Boolean(

                    routerState.exchangeGateway &&

                    typeof routerState.exchangeGateway
                        .processTransportContract ===
                        "function"

                ),

            acceptTransportContract:
                Boolean(

                    routerState.exchangeGateway &&

                    typeof routerState.exchangeGateway
                        .acceptTransportContract ===
                        "function"

                )

        },

        totalRequests:
            routerState.totalRequests,

        successfulRoutes:
            routerState.successfulRoutes,

        failedRoutes:
            routerState.failedRoutes,

        rejectedRequests:
            routerState.rejectedRequests,

        lastRoutingId:
            routerState.lastRoutingId,

        lastOrderId:
            routerState.lastOrderId,

        lastRoute:
            routerState.lastRoute,

        lastResult:
            routerState.lastResult,

        updatedAt:
            routerState.updatedAt

    };

}

/* ============================================================
 * SECTION 13 — RESET
 * ============================================================
 */

/**
 * Reset router runtime state.
 *
 * The attached Event Hub and ExchangeGateway references are
 * preserved because they represent runtime configuration.
 *
 * @returns {Object}
 */
 function resetOrderRouter() {

    routerState.totalRequests =
        0;

    routerState.successfulRoutes =
        0;

    routerState.failedRoutes =
        0;

    routerState.rejectedRequests =
        0;

    routerState.lastRoutingId =
        null;

    routerState.lastOrderId =
        null;

    routerState.lastRoute =
        null;

    routerState.lastResult =
        null;

    routerState.updatedAt =
        now();

    routerState.status =

        routerState.exchangeGateway

            ?

        ROUTER_STATUS.READY

            :

        ROUTER_STATUS.UNAVAILABLE;

    routerState.initialized =
        Boolean(
            routerState.exchangeGateway
        );

    return {

        success:
            true,

        status:
            routerState.status,

        router:
            ROUTER_NAME,

        timestamp:
            routerState.updatedAt

    };

}

/* ============================================================
 * SECTION 14 — PUBLIC API
 * ============================================================
 */

export {

    ROUTER_NAME,

    ROUTER_VERSION,

    ROUTER_STATUS,

    ROUTING_DECISION,

    ROUTING_TYPE,

    configureOrderRouter,

    attachExchangeGateway,

    getExchangeGateway,

    routeOrder,

    routeTransportContract,

    route,

    getOrderRouterStatus,

    resetOrderRouter

};
