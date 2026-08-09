// ============================================================
// QuantumTrader-AI™
// Event Hub
// Central Runtime Event Bus
// Version 1.1 - Hardened & Polished Production Edition
// ============================================================

class EventHub {

    constructor() {

        this.events = new Map();
        this.history = [];
        this.maxHistory = 250;

        // Registered runtime modules
        this.modules = new Map();

    }

    // --------------------------------------------------------
    // Subscribe
    // --------------------------------------------------------
    on(eventName, listener) {

        if (typeof listener !== "function") {
            throw new TypeError("[EventHub] Listener must be a function");
        }

        if (!eventName) return () => {};

        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }

        this.events.get(eventName).add(listener);

        return () => this.off(eventName, listener);

    }

    // --------------------------------------------------------
    // Subscribe Once
    // --------------------------------------------------------
    once(eventName, listener) {

        if (typeof listener !== "function") {
            throw new TypeError("[EventHub] Listener must be a function");
        }

        const wrapper = (payload) => {

            this.off(eventName, wrapper);
            listener(payload);

        };

        // Expose original reference to allow explicit early unbinding
        wrapper.originalListener = listener;

        return this.on(eventName, wrapper);

    }

    // --------------------------------------------------------
    // Remove Listener
    // --------------------------------------------------------
    off(eventName, listener) {

        if (!eventName || !this.events.has(eventName)) return;

        const listeners = this.events.get(eventName);

        // Delete direct match
        if (listeners.delete(listener)) {
            if (listeners.size === 0) this.events.delete(eventName);
            return;
        }

        // Delete via once() wrapper mapping lookups
        for (const item of listeners) {
            if (item.originalListener === listener) {
                listeners.delete(item);
                break;
            }
        }

        if (listeners.size === 0) {
            this.events.delete(eventName);
        }

    }

    // --------------------------------------------------------
    // Register Module
    // --------------------------------------------------------
    registerModule(name, metadata = {}) {

        if (!name) throw new Error("[EventHub] Module name is required");

        this.modules.set(name, {
            ...metadata,
            registeredAt: Date.now()
        });

    }

    // --------------------------------------------------------
    // Emit Event
    // Supports:
    // emit("event", payload)
    // emit({ type, payload })
    // --------------------------------------------------------
    emit(eventName, payload = {}) {

        let finalPayload = payload;

        if (
            typeof eventName === "object" &&
            eventName !== null
        ) {

            finalPayload = eventName.payload !== undefined ? eventName.payload : {};
            eventName = eventName.type;

        }

        if (!eventName || typeof eventName !== "string") return;

        // Clone payload for history tracking to isolate data states
        const historyPayload = typeof finalPayload === "object" && finalPayload !== null
            ? { ...finalPayload }
            : finalPayload;

        const event = {
            name: eventName,
            payload: historyPayload,
            timestamp: Date.now()
        };

        this.history.push(event);

        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        const listeners = this.events.get(eventName);

        if (!listeners || listeners.size === 0) return;

        // Static loop snapshot array prevents infinite loops 
        // if a listener attaches a new callback during an active emit.
        const snapshot = [...listeners];

        for (let i = 0; i < snapshot.length; i++) {
            try {
                snapshot[i](finalPayload);
            } catch (err) {
                console.error(
                    "[EventHub Exec Error]",
                    `[${eventName}]`,
                    err
                );
            }
        }

    }

    // --------------------------------------------------------
    // Clear Event
    // --------------------------------------------------------
    clear(eventName) {

        this.events.delete(eventName);

    }

    // --------------------------------------------------------
    // Reset Hub
    // --------------------------------------------------------
    reset() {

        this.events.clear();
        this.history = [];
        this.modules.clear();

    }

    // --------------------------------------------------------
    // Diagnostics
    // --------------------------------------------------------
    getHistory() {

        // Returns shallow-copied logs to prevent direct reference mutations
        return this.history.map(item => ({ ...item }));

    }

    getListenerCount(eventName) {

        const listeners = this.events.get(eventName);
        return listeners ? listeners.size : 0;

    }

    getRegisteredModules() {

        return Array.from(this.modules.entries()).map(([name, meta]) => [
            name,
            { ...meta }
        ]);

    }

}

const eventHub = new EventHub();

export default eventHub;
export { eventHub };

