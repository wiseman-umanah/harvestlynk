-- Phase 3 & 4: Order/Escrow State Machine and Refund/Dispute Handling
-- Adds new order statuses, dispute resolution enum, and order table columns.

-- 1. New order status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancellation_requested'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE "public"."order_status" ADD VALUE 'cancellation_requested';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'refund_pending'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE "public"."order_status" ADD VALUE 'refund_pending';
  END IF;
END$$;

-- 2. New dispute_resolution enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_resolution') THEN
    CREATE TYPE "public"."dispute_resolution" AS ENUM (
      'pending',
      'released_to_farmer',
      'refunded_to_buyer',
      'partial_refund'
    );
  END IF;
END$$;

-- 3. New columns on orders table
ALTER TABLE "public"."orders"
  ADD COLUMN IF NOT EXISTS "cancellation_requested_at" timestamp,
  ADD COLUMN IF NOT EXISTS "farmer_cancellation_accepted" boolean,
  ADD COLUMN IF NOT EXISTS "dispute_resolution" "public"."dispute_resolution",
  ADD COLUMN IF NOT EXISTS "dispute_refund_amount" integer;
