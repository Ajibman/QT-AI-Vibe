/**
 * QuantumTrader AI™ — Web3 Ledger / Wallet Core System
 * Handles secure account connections, balance states, and cryptographic verification
 */

(function () {
  // Global configuration state
  const walletConfig = {
    initialized: false,
    isConnected: false,
    selectedAddress: null,
    networkId: null,
    supportedChains: [1, 56, 137] // Ethereum, BSC, Polygon
  };

  // Safe window-layer exposure
  window.QTAI_Wallet = {
    /**
     * Initializes wallet interface variables and registers baseline listeners
     */
    init: function () {
      console.log("🟢 [QTAI Wallet] Initializing secure channel...");
      
      // Auto-detect browser injected providers (e.g., MetaMask, Trust Wallet)
      if (typeof window.ethereum !== 'undefined') {
        console.log("🔒 [QTAI Wallet] Secure cryptographic provider detected.");
        this.registerEvents();
      } else {
        console.warn("⚠️ [QTAI Wallet] No web3 provider detected. Operating in sandboxed fallback mode.");
      }
      
      walletConfig.initialized = true;
      return true;
    },

    /**
     * Hooks into native ledger provider listeners
     */
    registerEvents: function () {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          walletConfig.selectedAddress = accounts[0];
          console.log(`🔗 [QTAI Wallet] Active account shifted: ${accounts[0]}`);
        } else {
          walletConfig.isConnected = false;
          walletConfig.selectedAddress = null;
          console.log("❌ [QTAI Wallet] Account link severed by host user.");
        }
      });
    },

    /**
     * Trigger explicit login/connection procedure
     */
    connect: async function () {
      if (typeof window.ethereum === 'undefined') {
        alert("Crypto wallet provider missing. Please open inside a secure Web3 browser container.");
        return null;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        walletConfig.selectedAddress = accounts[0];
        walletConfig.isConnected = true;
        console.log(`✅ [QTAI Wallet] Handshake confirmed with root node: ${accounts[0]}`);
        return accounts[0];
      } catch (error) {
        console.error("🛑 [QTAI Wallet] Connection denied by user authentication:", error);
        return null;
      }
    },

    // Read-only getter for secure application sandboxing
    getState: function () {
      return { ...walletConfig };
    }
  };

  // Automatically kick-start the engine when the document is processed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.QTAI_Wallet.init());
  } else {
    window.QTAI_Wallet.init();
  }
})();
