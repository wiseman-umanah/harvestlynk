CREATE TYPE "public"."listing_status" AS ENUM('active', 'sold', 'expired', 'paused');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order', 'payment', 'system');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'payment_confirmed', 'processing', 'ready_for_pickup', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('farmer', 'buyer');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TABLE "ai_predictions" (
	"prediction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid,
	"input_image_url" text NOT NULL,
	"top_disease" varchar(100) NOT NULL,
	"top_confidence" numeric(5, 4) NOT NULL,
	"all_predictions" jsonb NOT NULL,
	"model_version" varchar(20) NOT NULL,
	"inference_time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmer_crops" (
	"crop_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"crop_type" varchar(50) NOT NULL,
	"variety" varchar(50),
	"planting_date" timestamp,
	"expected_harvest_date" timestamp,
	"field_size_hectares" numeric(8, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmer_ratings" (
	"rating_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"quality_rating" integer,
	"communication_rating" integer,
	"delivery_rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "farmer_ratings_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "input_verifications" (
	"verification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"qr_code" varchar(100) NOT NULL,
	"product_type" varchar(50) NOT NULL,
	"verified" boolean NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"product_details" jsonb,
	"verification_method" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_views" (
	"view_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"user_id" text,
	"ip_address" text,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"listing_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" text NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"price_per_unit" integer NOT NULL,
	"total_price" integer NOT NULL,
	"harvest_date" timestamp,
	"location_state" varchar(50) NOT NULL,
	"location_lga" varchar(50),
	"pickup_address" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"images" jsonb,
	"delivery_options" jsonb DEFAULT '["pickup"]'::jsonb,
	"description" text,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"inquiries" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liveness_checks" (
	"check_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"selfie_image_url" text NOT NULL,
	"voice_note_url" text,
	"liveness_score" numeric(5, 4) NOT NULL,
	"face_match_confidence" numeric(5, 4),
	"is_live" boolean NOT NULL,
	"spoof_detected" boolean DEFAULT false NOT NULL,
	"passed" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"reference_id" text,
	"reference_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_ref" text NOT NULL,
	"listing_id" uuid NOT NULL,
	"farmer_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"delivery_method" varchar(50) NOT NULL,
	"delivery_address" text,
	"special_instructions" text,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"proof_image_url" text,
	"cancelled_by" text,
	"cancellation_reason" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_ref_unique" UNIQUE("order_ref")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"buyer_id" text NOT NULL,
	"farmer_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"squad_reference" varchar(100),
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(50),
	"authorization_url" text,
	"metadata" jsonb,
	"paid_at" timestamp,
	"webhook_received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_squad_reference_unique" UNIQUE("squad_reference")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"payout_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farmer_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"gross_amount" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"net_amount" integer NOT NULL,
	"commission_rate" numeric(5, 4) NOT NULL,
	"squad_reference" varchar(100),
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"processed_at" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_squad_reference_unique" UNIQUE("squad_reference")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"scan_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"crop_type" varchar(50) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"farmer_notes" text,
	"status" "scan_status" DEFAULT 'pending' NOT NULL,
	"result_disease" varchar(100),
	"result_confidence" numeric(5, 4),
	"result_severity" "severity",
	"result_recommendations" jsonb,
	"processing_time_ms" integer,
	"model_version" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"transaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" bigint NOT NULL,
	"balance_before" bigint NOT NULL,
	"balance_after" bigint NOT NULL,
	"reference_id" uuid,
	"reference_type" varchar(50),
	"description" text,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_score_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"previous_score" integer NOT NULL,
	"new_score" integer NOT NULL,
	"change_amount" integer NOT NULL,
	"reason" varchar(255) NOT NULL,
	"reference_id" uuid,
	"reference_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false,
	"image" text,
	"trust_score" integer DEFAULT 0 NOT NULL,
	"location_state" varchar(50),
	"location_lga" varchar(50),
	"location_village" varchar(100),
	"location" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"preferred_language" varchar(20) DEFAULT 'English',
	"bank_name" varchar(50),
	"bank_account_number" varchar(20),
	"bank_account_name" varchar(100),
	"liveness_verified" boolean DEFAULT false NOT NULL,
	"farm_name" text,
	"bio" text,
	"nin_document_url" text,
	"ownership_document_url" text,
	"accepted_terms" boolean DEFAULT false NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"wallet_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"available_balance" bigint NOT NULL,
	"pending_balance" bigint NOT NULL,
	"total_paid_in" bigint NOT NULL,
	"total_paid_out" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_scan_id_scans_scan_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("scan_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_ratings" ADD CONSTRAINT "farmer_ratings_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_ratings" ADD CONSTRAINT "farmer_ratings_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_verifications" ADD CONSTRAINT "input_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_listing_id_listings_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("listing_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_views" ADD CONSTRAINT "listing_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liveness_checks" ADD CONSTRAINT "liveness_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listings_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("listing_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("wallet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_score_history" ADD CONSTRAINT "trust_score_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_predictions_scan_id_idx" ON "ai_predictions" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "ai_predictions_top_disease_idx" ON "ai_predictions" USING btree ("top_disease");--> statement-breakpoint
CREATE INDEX "ai_predictions_created_at_idx" ON "ai_predictions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "farmer_crops_user_id_idx" ON "farmer_crops" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "farmer_crops_is_active_idx" ON "farmer_crops" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "farmer_ratings_farmer_id_idx" ON "farmer_ratings" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "farmer_ratings_buyer_id_idx" ON "farmer_ratings" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "farmer_ratings_order_id_idx" ON "farmer_ratings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "input_verifications_user_id_idx" ON "input_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "input_verifications_qr_code_idx" ON "input_verifications" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX "input_verifications_verified_idx" ON "input_verifications" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "listing_views_listing_id_idx" ON "listing_views" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_views_user_id_idx" ON "listing_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listings_farmer_id_idx" ON "listings" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "listings_location_state_idx" ON "listings" USING btree ("location_state");--> statement-breakpoint
CREATE INDEX "listings_created_at_idx" ON "listings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "liveness_checks_user_id_idx" ON "liveness_checks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "liveness_checks_passed_idx" ON "liveness_checks" USING btree ("passed");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_listing_id_idx" ON "orders" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "orders_farmer_id_idx" ON "orders" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "orders_buyer_id_idx" ON "orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_buyer_id_idx" ON "payments" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "payments_farmer_id_idx" ON "payments" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "payments_squad_reference_idx" ON "payments" USING btree ("squad_reference");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payouts_farmer_id_idx" ON "payouts" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "payouts_order_id_idx" ON "payouts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scans_user_id_idx" ON "scans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scans_status_idx" ON "scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scans_crop_type_idx" ON "scans" USING btree ("crop_type");--> statement-breakpoint
CREATE INDEX "scans_created_at_idx" ON "scans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_wallet_id_idx" ON "transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_reference_id_idx" ON "transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trust_score_history_user_id_idx" ON "trust_score_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trust_score_history_created_at_idx" ON "trust_score_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");