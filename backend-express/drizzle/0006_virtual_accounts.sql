-- Phase 6: Virtual accounts table
-- Creates the virtual_accounts table and supporting enum for wallet funding via Nomba virtual accounts.

-- 1. Create enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'virtual_account_status') THEN
    CREATE TYPE "public"."virtual_account_status" AS ENUM ('active', 'suspended', 'expired');
  END IF;
END$$;

-- 2. Create table
CREATE TABLE IF NOT EXISTS "public"."virtual_accounts" (
  "virtual_account_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"            text NOT NULL UNIQUE REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "account_ref"        varchar(100) NOT NULL UNIQUE,
  "account_name"       varchar(100) NOT NULL,
  "bank_account_number" varchar(20) NOT NULL,
  "bank_account_name"  varchar(150) NOT NULL,
  "bank_name"          varchar(100) NOT NULL,
  "currency"           varchar(3) NOT NULL DEFAULT 'NGN',
  "bvn"                varchar(20),
  "expected_amount"    integer,
  "expiry_date"        timestamp,
  "status"             "public"."virtual_account_status" NOT NULL DEFAULT 'active',
  "is_dynamic"         boolean NOT NULL DEFAULT false,
  "nomba_account_id"   varchar(100),
  "metadata"           jsonb,
  "created_at"         timestamp NOT NULL DEFAULT now(),
  "updated_at"         timestamp NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS "virtual_accounts_user_id_idx"
  ON "public"."virtual_accounts" ("user_id");

CREATE INDEX IF NOT EXISTS "virtual_accounts_account_ref_idx"
  ON "public"."virtual_accounts" ("account_ref");

CREATE INDEX IF NOT EXISTS "virtual_accounts_bank_account_number_idx"
  ON "public"."virtual_accounts" ("bank_account_number");

CREATE INDEX IF NOT EXISTS "virtual_accounts_status_idx"
  ON "public"."virtual_accounts" ("status");
