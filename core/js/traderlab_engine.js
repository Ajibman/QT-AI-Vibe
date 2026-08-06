/**
 * TraderLab Strategy Engine (Production-Ready)
 * -------------------------------------------
 * Evaluates real-time market data against active strategy sets.
 * Cleared for modern JavaScript deployment engines.
 */

import strategies from "./strategySet.js";
import validator from "./validator.js";

/**
 * Main execution portal consumed by traderlab_access.js loop
 */
export async function runEngineCycle({ marketData, qualification, mode }) {
  // Gracefully drop cycle if pre-qualification parameters are not met
  if (qualification?.skipped) {
    return {
      skipped: true,
      reason: qualification?.reason || "Disqualified by controller metrics"
    };
  }

  try {
    const evaluation = await evaluate(marketData);

    // If no active strategy passes validation checks, pass the tick safely
    if (!evaluation.best) {
      return {
        skipped: true,
        reason: "Zero strategies cleared structural validation for this tick"
      };
    }

    // Format output exactly as expected by the access layer cycleBank
    return {
      skipped: false,
      guidance: {
        strategyName: evaluation.best.name || "unnamed_strategy",
        score: evaluation.best.score || 0
      },
      result: {
        pnl: typeof evaluation.best.pnl === "number" ? evaluation.best.pnl : 0
      }
    };

  } catch (err) {
    console.error("[TraderLab Engine Error]", err);
    return {
      skipped: true,
      reason: `System runtime error isolated: ${err.message}`
    };
  }
}

/**
 * Internally iterates, screens, and ranks active strategy performance
 */
export async function evaluate(marketData) {
  const results = [];

  // Safe loop iteration prevents a breakdown in one strategy file from freezing the app
  for (const strategy of strategies) {
    try {
      // Async evaluation prevents thread blocking during deep calculations
      const output = await strategy.run(marketData);

      if (!output) continue;

      // Ensure the strategy data conforms to structural rules
      const isValid = validator.check(output);

      if (isValid) {
        results.push(output);
      }
    } catch (strategyError) {
      console.error(`[Engine Core] Isolated strategy failure:`, strategyError);
    }
  }

  // Sort metrics descending based on score value (highest performance first)
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    approved: results,
    best: results[0] || null
  };
}
