CREATE TABLE IF NOT EXISTS "public"."orders_temp" AS
SELECT
  "order_id",
  "order_ref",
  "listing_id",
  "farmer_id",
  "buyer_id",
  "quantity",
  "unit_price",
  "total_amount",
  "delivery_method",
  "delivery_address",
  "special_instructions",
  "status",
  "proof_image_url",
  "cancelled_by",
  "cancellation_reason",
  "completed_at",
  "created_at",
  "updated_at"
FROM "public"."orders";

ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_listing_id_fk";
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_farmer_id_fk";
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_buyer_id_fk";
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_cancelled_by_fk";
DROP INDEX IF EXISTS "public"."orders_listing_id_idx";
DROP INDEX IF EXISTS "public"."orders_farmer_id_idx";
DROP INDEX IF EXISTS "public"."orders_buyer_id_idx";
DROP INDEX IF EXISTS "public"."orders_status_idx";
DROP INDEX IF EXISTS "public"."orders_created_at_idx";

DROP TABLE "public"."orders";

CREATE TABLE "public"."orders" (
  "order_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_ref" text UNIQUE NOT NULL,
  "listing_id" uuid NOT NULL,
  "farmer_id" text NOT NULL,
  "buyer_id" text NOT NULL,
  "quantity" numeric(10,2) NOT NULL,
  "unit_price" integer NOT NULL,
  "total_amount" integer NOT NULL,
  "delivery_method" varchar(50) NOT NULL,
  "delivery_address" text,
  "special_instructions" text,
  "status" "order_status" DEFAULT 'pending_payment' NOT NULL,
  "checkout_link" text,
  "nomba_order_reference" text,
  "proof_image_url" text,
  "cancelled_by" text,
  "cancellation_reason" text,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("listing_id") ON DELETE cascade,
  ADD CONSTRAINT "orders_farmer_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  ADD CONSTRAINT "orders_buyer_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  ADD CONSTRAINT "orders_cancelled_by_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id");

CREATE INDEX "orders_listing_id_idx" ON "public"."orders" ("listing_id");
CREATE INDEX "orders_farmer_id_idx" ON "public"."orders" ("farmer_id");
CREATE INDEX "orders_buyer_id_idx" ON "public"."orders" ("buyer_id");
CREATE INDEX "orders_status_idx" ON "public"."orders" ("status");
CREATE INDEX "orders_created_at_idx" ON "public"."orders" ("created_at");
CREATE INDEX "orders_nomba_order_reference_idx" ON "public"."orders" ("nomba_order_reference");

INSERT INTO "public"."orders" SELECT * FROM "public"."orders_temp";
DROP TABLE "public"."orders_temp";

-- Update payments table: remove squad_reference, add nomba_reference
ALTER TABLE "public"."payments" DROP CONSTRAINT IF EXISTS "payments_pkey" CASCADE;
ALTER TABLE "public"."payments" DROP INDEX IF EXISTS "payments_squad_reference_idx";

CREATE TABLE IF NOT EXISTS "public"."payments_temp" AS
SELECT
  "payment_id",
  "order_id",
  "buyer_id",
  "farmer_id",
  "amount",
  "status",
  "payment_method",
  "authorization_url",
  "metadata",
  "paid_at",
  "webhook_received_at",
  "created_at",
  "updated_at"
FROM "public"."payments";

ALTER TABLE "public"."payments" DROP CONSTRAINT IF EXISTS "payments_order_id_fk";
ALTER TABLE "public"."payments" DROP CONSTRAINT IF EXISTS "payments_buyer_id_fk";
ALTER TABLE "public"."payments" DROP CONSTRAINT IF EXISTS "payments_farmer_id_fk";
DROP INDEX IF EXISTS "public"."payments_order_id_idx";
DROP INDEX IF EXISTS "public"."payments_buyer_id_idx";
DROP INDEX IF EXISTS "public"."payments_farmer_id_idx";
DROP INDEX IF EXISTS "public"."payments_status_idx";

DROP TABLE "public"."payments";

CREATE TABLE "public"."payments" (
  "payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "buyer_id" text NOT NULL,
  "farmer_id" text NOT NULL,
  "amount" bigint NOT NULL,
  "nomba_reference" varchar(100) UNIQUE,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "payment_method" varchar(50),
  "authorization_url" text,
  "metadata" jsonb,
  "paid_at" timestamp,
  "webhook_received_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "payments_order_id_idx" ON "public"."payments" ("order_id");
CREATE INDEX "payments_buyer_id_idx" ON "public"."payments" ("buyer_id");
CREATE INDEX "payments_farmer_id_idx" ON "public"."payments" ("farmer_id");
CREATE INDEX "payments_nomba_reference_idx" ON "public"."payments" ("nomba_reference");
CREATE INDEX "payments_status_idx" ON "public"."payments" ("status");

INSERT INTO "public"."payments" SELECT * FROM "public"."payments_temp";
DROP TABLE "public"."payments_temp";

-- Update payouts table: remove squad_reference, add nomba_reference
CREATE TABLE IF NOT EXISTS "public"."payouts_temp" AS
SELECT
  "payout_id",
  "farmer_id",
  "order_id",
  "gross_amount",
  "commission_amount",
  "net_amount",
  "commission_rate",
  "status",
  "failure_reason",
  "processed_at",
  "settled_at",
  "created_at",
  "updated_at"
FROM "public"."payouts";

ALTER TABLE "public"."payouts" DROP CONSTRAINT IF EXISTS "payouts_farmer_id_fk";
ALTER TABLE "public"."payouts" DROP CONSTRAINT IF EXISTS "payouts_order_id_fk";
DROP INDEX IF EXISTS "public"."payouts_farmer_id_idx";
DROP INDEX IF EXISTS "public"."payouts_order_id_idx";
DROP INDEX IF EXISTS "public"."payouts_status_idx";

DROP TABLE "public"."payouts";

CREATE TABLE "public"."payouts" (
  "payout_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "farmer_id" text NOT NULL,
  "order_id" uuid NOT NULL,
  "gross_amount" integer NOT NULL,
  "commission_amount" integer NOT NULL,
  "net_amount" integer NOT NULL,
  "commission_rate" numeric(5,4) NOT NULL,
  "nomba_reference" varchar(100) UNIQUE,
  "status" "payout_status" DEFAULT 'pending' NOT NULL,
  "failure_reason" text,
  "processed_at" timestamp,
  "settled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "payouts_farmer_id_idx" ON "public"."payouts" ("farmer_id");
CREATE INDEX "payouts_order_id_idx" ON "public"."payouts" ("order_id");
CREATE INDEX "payouts_nomba_reference_idx" ON "public"."payouts" ("nomba_reference");
CREATE INDEX "payouts_status_idx" ON "public"."payouts" ("status");

INSERT INTO "public"."payouts" SELECT * FROM "public"."payouts_temp";
DROP TABLE "public"."payouts_temp";
