-- Make payout.order_id nullable so wallet withdrawals may be initiated without a specific order reference
ALTER TABLE "public"."payouts"
  ALTER COLUMN "order_id" DROP NOT NULL;
