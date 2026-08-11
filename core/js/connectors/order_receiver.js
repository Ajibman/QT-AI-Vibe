/* ============================================================
 * SECTION 2 — CONNECTORS & INGESTION LAYER
 * ============================================================
 */

// Import the freshly fixed order router
const { OrderRouter, ROUTER_NAME } = require('../order_router');

const OrderReceiver = {
    name: 'QT_AI_ORDER_RECEIVER',
    isListening: false,

    /**
     * Initializes the receiver layer and hooks into the router
     */
    init() {
        console.log(`[${this.name}] Ingestion layer initializing...`);
        OrderRouter.initialize();
        this.isListening = true;
        return this;
    },

    /**
     * Ingests raw data from external connectors (HTTP, Webhooks, MQ)
     * @param {Object} rawPayload - Unsanitized input data
     * @returns {Object} Router distribution result
     */
    handleIncomingOrder(rawPayload) {
        if (!this.isListening) {
            return { success: false, error: 'Receiver is offline or uninitialized' };
        }

        console.log(`[${this.name}] Raw payload received via ${ROUTER_NAME}. Sanitizing...`);

        try {
            // Standardize raw incoming data structure before routing
            const normalizedOrder = this.sanitizePayload(rawPayload);

            // Hand off execution responsibility to the OrderRouter state machine
            const routeResult = OrderRouter.routeOrder(normalizedOrder);

            if (!routeResult.success) {
                console.error(`[${this.name}] Routing rejected: ${routeResult.error}`);
                return routeResult;
            }

            console.log(`[${this.name}] Order accepted successfully into router state memory.`);
            return routeResult;

        } catch (error) {
            console.error(`[${this.name}] Critical ingestion crash:`, error.message);
            return { success: false, error: `Ingestion Exception: ${error.message}` };
        }
    },

    /**
     * Extracts and safeguards necessary fields to fulfill OrderRouter's structural constraints
     */
    sanitizePayload(payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload structure missing or malformed');
        }

        return {
            id: payload.external_id || payload.uuid || payload.id || null,
            items: Array.isArray(payload.line_items) ? payload.line_items : (payload.items || []),
            total: Number(payload.order_total || payload.total) || 0
        };
    }
};

// Exporting module safely
module.exports = { OrderReceiver };
