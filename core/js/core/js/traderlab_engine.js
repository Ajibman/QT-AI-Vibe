// core/js/traderlab_engine.js

/**
 * TraderLab Strategy Engine (MVP Upgrade)
 * ---------------------------------------
 * Evaluates market telemetry against strategy layers.
 * Aligned with ES Module system for production runtime environments.
 */

import strategies from "./strategySet.js";
import validator from "./validator.js";

/**
 * Core interface expected by the traderlab_access layer
 */
export async function runEngineCycle({ marketData, qualification, mode }) {
  // If the controller already disqualified the tick, skip execution early
  if (qualification?.skipped) {
    return {
      skipped: true,
      reason: qualification?.reason || "Disqualified by controller"
    };
  }

  try {
    const evaluation = await evaluate(marketData);

    // If no strategies passed validation, skip the cycle gracefully
    if (!evaluation.best) {
      return {
        skipped: true,
        reason: "No validated strategy outputs generated for this tick"
      };
    }

    // Standardize output payload shape for the access layer bank
    return {
      skipped: false,
      guidance: {
        strategyName: evaluation.best.name || "unknown",
        score: evaluation.best.score
      },
      result: {
        pnl: evaluation.best.pnl || 0 // Expected numeric field for cycleBank
      }
    };

  } catch (err) {
    console.error("[Engine Cycle Error]", err);
    return {
      skipped: true,
      reason: `Engine execution crash: ${err.message}`
    };
  }
}

/**
 * Internal logic runner to evaluate strategy matrices
 */
export async function evaluate(marketData) {
  const results = [];

  // Looping with standard safety layers to prevent rogue scripts from killing the app
  for (const strategy of strategies) {
    try {
      // Await processing to handle modern indicator streaming or async rules
      const output = await strategy.run(marketData);

      // Guard against blank or incomplete strategy outputs
      if (!output) continue;

      const isValid = validator.check(output);

      if (isValid) {
        results.push(output);
      }
    } catch (strategyError) {
      // Standard logging to isolate the broken script while keeping the system online
      console.error(`[Engine] Strategy failure isolated:`, strategyError);
    }
  }

  // Sort descending by strategy performance score (highest first)
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    approved: results,
    best: results[0] || null
  };
}
