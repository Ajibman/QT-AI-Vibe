-- =========================================================================
-- QonexAI™ REAL-TIME TRANSACTION AUTOMATION ENGINE
-- Objective: Automate 90/10 split execution on advertiser gift triggers
-- Scope: Private Cluster Backend Infrastructure Tier
-- =========================================================================

CREATE OR REPLACE FUNCTION process_automated_gift_distribution()
RETURNS TRIGGER AS $$
DECLARE
    calculated_efficiency NUMERIC(36,18);
    calculated_trader_share NUMERIC(36,18);
    calculated_philanthropy_share NUMERIC(36,18);
    target_admin_account VARCHAR(16);
BEGIN
    -- 1. Fetch active sole governance parameters from lock table
    SELECT authorized_settlement_account INTO target_admin_account 
    FROM qonexai_governance 
    WHERE config_id = 1;

    -- Safety Check: Halt execution if primary routing parameters are altered
    IF target_admin_account IS NULL OR target_admin_account != '0299134895' THEN
        RAISE EXCEPTION 'CRITICAL: Security Breach. Unauthorized routing target or missing governance data.';
    END IF;

    -- 2. Execute precision arithmetic for the 0.999999^n efficiency protocol
    calculated_efficiency := (0.999999::NUMERIC(36,18)) ^ NEW.notch_level_triggered;

    -- 3. Enforce the exact revenue distribution split allocations
    calculated_trader_share       := NEW.total_advertiser_gift * 0.90;
    calculated_philanthropy_share := NEW.total_advertiser_gift * 0.10;

    -- 4. Automatically inject calculated fractions back into the insertion payload
    NEW.trader_payout_share   := calculated_trader_share;
    NEW.philanthropy_share     := calculated_philanthropy_share;
    NEW.calculated_efficiency  := calculated_efficiency;
    NEW.destination_account    := target_admin_account;
    NEW.destination_bank       := 'WEMA Bank';
    NEW.destination_country    := 'Nigeria';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Bind trigger directly to the ledger table to process items before insertion
DROP TRIGGER IF EXISTS trigger_execute_qonexai_split ON qonexai_philanthropy_ledger;
CREATE TRIGGER trigger_execute_qonexai_split
    BEFORE INSERT ON qonexai_philanthropy_ledger
    FOR EACH ROW
    EXECUTE FUNCTION process_automated_gift_distribution();
