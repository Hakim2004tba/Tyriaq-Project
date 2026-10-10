CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"lead_id" text,
	"client_id" text,
	"project_ref" text,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"date" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"location" text NOT NULL,
	"commercial" text,
	"designer" text,
	"status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"follow_up_notes" text,
	"reminder_minutes_before" integer,
	"created_at" text NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"commercial" text NOT NULL,
	"status" text NOT NULL,
	"since" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devis" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"client_name" text NOT NULL,
	"project_label" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"commercial" text,
	"created_at" text NOT NULL,
	"valid_until" text NOT NULL,
	"client_id" text,
	"lead_id" text,
	"project_ref" text,
	"version" integer DEFAULT 1 NOT NULL,
	"family_id" text NOT NULL,
	"client_note" text,
	"decided_at" text,
	"discount_type" text,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"tax_rate" integer DEFAULT 19 NOT NULL,
	"deposit_percent" integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devis_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"devis_id" text NOT NULL,
	"catalogue_item_id" text,
	"label" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devis_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"devis_id" text NOT NULL,
	"version" integer NOT NULL,
	"amount" integer NOT NULL,
	"project_label" text NOT NULL,
	"status" text NOT NULL,
	"note" text NOT NULL,
	"created_at" text NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"devis_id" text NOT NULL,
	"layout" text NOT NULL,
	"island" text NOT NULL,
	"depth" text NOT NULL,
	"hood" text NOT NULL,
	"oven" text NOT NULL,
	"fridge" text NOT NULL,
	"accessories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"budget" text NOT NULL,
	"floor" text NOT NULL,
	"dimensions" text NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sketches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"additional_info" text DEFAULT '' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"due_date" text,
	"completed" boolean DEFAULT false NOT NULL,
	"outcome" text,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"city" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"commercial" text NOT NULL,
	"project_type" text NOT NULL,
	"budget" integer NOT NULL,
	"next_follow_up_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text NOT NULL,
	"devis_id" text,
	"project_id" text,
	"project_ref" text,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"status" text NOT NULL,
	"label" text NOT NULL,
	"date" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"project_ref" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"reported_by" text NOT NULL,
	"created_at" text NOT NULL,
	"resolved_at" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"name" text NOT NULL,
	"client_id" text,
	"client_name" text NOT NULL,
	"devis_id" text,
	"commercial" text,
	"designer" text,
	"production_lead" text,
	"vernisseur" text,
	"montage_lead" text,
	"stage" text NOT NULL,
	"priority" text NOT NULL,
	"amount" integer NOT NULL,
	"progress" integer NOT NULL,
	"start_date" text NOT NULL,
	"due_date" text NOT NULL,
	"completed_at" text,
	"design_status" text NOT NULL,
	"measurements" jsonb,
	"designer_notes" text DEFAULT '' NOT NULL,
	"design_client_note" text,
	"design_validated_at" text,
	"material_selections" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sav_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"client_id" text,
	"client_name" text NOT NULL,
	"project_ref" text NOT NULL,
	"issue" text NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"assigned_to" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
