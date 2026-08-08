import os
import csv
import sys
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

# --- Infrastructure Target Configuration ---
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://qonexai_prod_admin:SecurePassword@prod-db-cluster.internal:5432/qonexai_db")
EXPORT_DIRECTORY = "/etc/qonexai/vault/exports"

def generate_private_accounting_audit():
    print("=================================================================")
    print("🔍 QONEXAI™ CORE LEDGER AUDIT & ACCOUNTING EXTRACTION TOOL")
    print("   Access Mode: SECURE ADMIN CONTEXT ONLY | TARGET ACCOUNT: 0299134895")
    print("=================================================================")

    try:
        # Establish connection to the isolated background database cluster
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        cursor = conn.cursor()

        # 1. Enforce strict single-row governance confirmation check
        cursor.execute("SELECT sole_administrator_title, authorized_settlement_account FROM qonexai_governance WHERE config_id = 1;")
        gov = cursor.fetchone()
        
        if not gov or gov['authorized_settlement_account'] != "0299134895":
            print("🚨 CRITICAL ERROR: Governance routing anomaly detected! Halting audit operations.")
            sys.exit(1)

        print(f"🔒 Identity Verified: Executing as {gov['sole_administrator_title']}")

        # 2. Extract macro structural financial data metrics
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_advertiser_gift), 0) as gross_injected,
                COALESCE(SUM(trader_payout_share), 0) as total_trader_credits,
                COALESCE(SUM(philanthropy_share), 0) as total_philanthropy_allocated,
                COUNT(transaction_id) as total_transaction_count
            FROM qonexai_philanthropy_ledger;
        """)
        totals = cursor.fetchone()

        # 3. Pull total completed settlements targeting your WEMA bank node
        cursor.execute("""
            SELECT COALESCE(SUM(philanthropy_share), 0) as settled_funds 
            FROM qonexai_philanthropy_ledger 
            WHERE settlement_status = 'SETTLED';
        """)
        settled = cursor.fetchone()

        print("\n📈 FINANCIAL SUMMARY REPORT:")
        print(f"   Total Transactions Logged : {totals['total_transaction_count']:,} events")
        print(f"   Gross Advertiser Funding  : {totals['gross_injected']:,.2f} NGN")
        print(f"   Trader Share Pool (90%)   : {totals['total_trader_credits']:,.2f} NGN")
        print(f"   Philanthropy Allocation(10%): {totals['total_philanthropy_allocated']:,.2f} NGN")
        print(f"   Cleared to WEMA Bank Node : {settled['settled_funds']:,.2f} NGN")
        print("-" * 65)

        # 4. Export detailed log history to a secure CSV file for private offline review
        os.makedirs(EXPORT_DIRECTORY, exist_ok=True)
        csv_target_file = os.path.join(EXPORT_DIRECTORY, "qonexai_audit_master.csv")

        cursor.execute("""
            SELECT transaction_id, trader_id, notch_level_triggered, advertiser_id, 
                   philanthropy_share, settlement_status, processed_at 
            FROM qonexai_philanthropy_ledger 
            ORDER BY processed_at DESC;
        """)
        all_records = cursor.fetchall()

        with open(csv_target_file, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            # Write secure audit columns
            writer.writerow(['TX_ID', 'TRADER_ID', 'NOTCH_LEVEL', 'ADVERTISER_ID', 'PHILANTHROPY_AMOUNT_NGN', 'STATUS', 'TIMESTAMP'])
            for row in all_records:
                writer.writerow([
                    row['transaction_id'], row['trader_id'], row['notch_level_triggered'],
                    row['advertiser_id'], row['philanthropy_share'], row['settlement_status'], row['processed_at']
                ])

        print(f"📊 master audit file successfully written to: {csv_target_file}")
        print("================================================================")

        conn.close()

    except Exception as e:
        print(f"❌ DATABASE CONNECTION FAULT: Unable to complete data pull. Error: {str(e)}")

if __name__ == "__main__":
    generate_private_accounting_audit()
      
