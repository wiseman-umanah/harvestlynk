-- Phase 1 & 2: Money and ledger foundation fixes
-- 1. wallets.total_paid_out: integer -> bigint (consistent with other wallet money columns)
ALTER TABLE "public"."wallets"
  ALTER COLUMN "total_paid_out" TYPE bigint USING "total_paid_out"::bigint;

-- 2. payouts money columns: integer -> bigint
ALTER TABLE "public"."payouts"
  ALTER COLUMN "gross_amount" TYPE bigint USING "gross_amount"::bigint,
  ALTER COLUMN "commission_amount" TYPE bigint USING "commission_amount"::bigint,
  ALTER COLUMN "net_amount" TYPE bigint USING "net_amount"::bigint;

-- 3. payouts.nomba_reference: extend to varchar(120) to match new length
ALTER TABLE "public"."payouts"
  ALTER COLUMN "nomba_reference" TYPE varchar(120);

-- 4. Add payouts.merchant_tx_ref column for matching inbound Nomba payout webhooks.
--    nomba_reference holds our internal transferRef; merchant_tx_ref mirrors it and
--    can later be updated to hold the actual Nomba transaction reference if they differ.
ALTER TABLE "public"."payouts"
  ADD COLUMN IF NOT EXISTS "merchant_tx_ref" varchar(120);

ALTER TABLE "public"."payouts"
  ADD CONSTRAINT "payouts_merchant_tx_ref_unique" UNIQUE ("merchant_tx_ref");

CREATE INDEX IF NOT EXISTS "payouts_merchant_tx_ref_idx"
  ON "public"."payouts" ("merchant_tx_ref");

-- 5. Back-fill merchant_tx_ref from nomba_reference for existing rows
UPDATE "public"."payouts"
  SET "merchant_tx_ref" = "nomba_reference"
  WHERE "merchant_tx_ref" IS NULL AND "nomba_reference" IS NOT NULL;
