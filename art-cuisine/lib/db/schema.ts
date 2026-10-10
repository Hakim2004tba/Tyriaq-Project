/**
 * Drizzle schema for the app's real, persistent data store (Postgres via
 * Neon) — Phase 1 of migrating off the in-memory arrays in
 * lib/data/operations.ts, which don't survive across Vercel's serverless
 * instances (see memory: project-art-cuisine-client-demo-plan).
 *
 * Scope of this phase: the core CRM lifecycle that's actively broken —
 * leads → clients → devis → projects → payments, plus the appointments/
 * kitchen-configurator public intake forms, SAV tickets, tasks and the
 * activity log. Production/vernissage/montage workflow detail, documents,
 * messaging, notifications, the catalogue and the public portfolio are
 * deliberately NOT in this phase — they stay on the in-memory arrays for
 * now and get migrated in a later pass.
 *
 * IDs stay as the existing human-readable strings (e.g. "C-0A1B2C3D") rather
 * than switching to DB-generated UUIDs/serials, so every call site that
 * already threads an id as a string keeps working unchanged. Timestamps stay
 * as ISO-8601 text for the same reason — the app's formatting helpers
 * (lib/format.ts) all expect to `new Date(isoString)` a string, not a JS
 * Date object, so storing `timestamp` columns would ripple into every
 * consumer. No foreign-key constraints yet: the existing code resolves
 * relations by matching plain id strings (sometimes nullable, sometimes by
 * name) rather than relying on referential integrity, so constraints would
 * fight the current insert order instead of helping.
 */

import { pgTable, text, integer, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";

// --- Leads ---------------------------------------------------------------

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  commercial: text("commercial").notNull(),
  projectType: text("project_type").notNull(),
  budget: integer("budget").notNull(),
  nextFollowUpAt: text("next_follow_up_at"),
  createdAt: text("created_at").notNull(),
});

export const leadInteractions = pgTable("lead_interactions", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  dueDate: text("due_date"),
  completed: boolean("completed").notNull().default(false),
  outcome: text("outcome"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

// --- Clients ---------------------------------------------------------------

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  commercial: text("commercial").notNull(),
  status: text("status").notNull(),
  since: text("since").notNull(),
});

// --- Devis -------------------------------------------------------------

export const devis = pgTable("devis", {
  id: text("id").primaryKey(),
  ref: text("ref").notNull(),
  clientName: text("client_name").notNull(),
  projectLabel: text("project_label").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  commercial: text("commercial"),
  createdAt: text("created_at").notNull(),
  validUntil: text("valid_until").notNull(),
  clientId: text("client_id"),
  leadId: text("lead_id"),
  projectRef: text("project_ref"),
  version: integer("version").notNull().default(1),
  familyId: text("family_id").notNull(),
  clientNote: text("client_note"),
  decidedAt: text("decided_at"),
  discountType: text("discount_type"),
  discountValue: integer("discount_value").notNull().default(0),
  taxRate: integer("tax_rate").notNull().default(19),
  depositPercent: integer("deposit_percent").notNull().default(30),
});

export const devisVersions = pgTable("devis_versions", {
  id: text("id").primaryKey(),
  devisId: text("devis_id").notNull(),
  version: integer("version").notNull(),
  amount: integer("amount").notNull(),
  projectLabel: text("project_label").notNull(),
  status: text("status").notNull(),
  note: text("note").notNull(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(),
});

export const devisLineItems = pgTable("devis_line_items", {
  id: text("id").primaryKey(),
  devisId: text("devis_id").notNull(),
  catalogueItemId: text("catalogue_item_id"),
  label: text("label").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

// --- Projects ---------------------------------------------------------------

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  ref: text("ref").notNull(),
  name: text("name").notNull(),
  clientId: text("client_id"),
  clientName: text("client_name").notNull(),
  devisId: text("devis_id"),
  commercial: text("commercial"),
  designer: text("designer"),
  productionLead: text("production_lead"),
  vernisseur: text("vernisseur"),
  montageLead: text("montage_lead"),
  stage: text("stage").notNull(),
  priority: text("priority").notNull(),
  amount: integer("amount").notNull(),
  progress: integer("progress").notNull(),
  startDate: text("start_date").notNull(),
  dueDate: text("due_date").notNull(),
  completedAt: text("completed_at"),
  designStatus: text("design_status").notNull(),
  measurements: jsonb("measurements").$type<{ width: number; depth: number; height: number; notes: string } | null>(),
  designerNotes: text("designer_notes").notNull().default(""),
  designClientNote: text("design_client_note"),
  designValidatedAt: text("design_validated_at"),
  materialSelections: jsonb("material_selections").$type<string[]>().notNull().default([]),
});

export const projectIssues = pgTable("project_issues", {
  id: text("id").primaryKey(),
  projectRef: text("project_ref").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull(),
  reportedBy: text("reported_by").notNull(),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

// --- Payments ---------------------------------------------------------------

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  clientId: text("client_id"),
  clientName: text("client_name").notNull(),
  devisId: text("devis_id"),
  projectId: text("project_id"),
  projectRef: text("project_ref"),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  label: text("label").notNull(),
  date: text("date").notNull(),
  notes: text("notes").notNull().default(""),
  recordedBy: text("recorded_by").notNull(),
  createdAt: text("created_at").notNull(),
});

// --- Appointments (public consultation requests + internal scheduling) -----

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  leadId: text("lead_id"),
  clientId: text("client_id"),
  projectRef: text("project_ref"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull(),
  date: text("date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  location: text("location").notNull(),
  commercial: text("commercial"),
  designer: text("designer"),
  status: text("status").notNull(),
  notes: text("notes").notNull().default(""),
  followUpNotes: text("follow_up_notes"),
  reminderMinutesBefore: integer("reminder_minutes_before"),
  createdAt: text("created_at").notNull(),
  source: text("source").notNull(),
});

// --- Kitchen configurator submissions (public) ------------------------------

export const kitchenConfigs = pgTable("kitchen_configs", {
  id: text("id").primaryKey(),
  devisId: text("devis_id").notNull(),
  layout: text("layout").notNull(),
  island: text("island").notNull(),
  depth: text("depth").notNull(),
  hood: text("hood").notNull(),
  oven: text("oven").notNull(),
  fridge: text("fridge").notNull(),
  accessories: jsonb("accessories").$type<string[]>().notNull().default([]),
  budget: text("budget").notNull(),
  floor: text("floor").notNull(),
  dimensions: text("dimensions").notNull(),
  photos: jsonb("photos").$type<{ name: string; sizeLabel: string }[]>().notNull().default([]),
  sketches: jsonb("sketches").$type<{ name: string; sizeLabel: string }[]>().notNull().default([]),
  additionalInfo: text("additional_info").notNull().default(""),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull(),
  createdAt: text("created_at").notNull(),
});

// --- SAV ---------------------------------------------------------------

export const savTickets = pgTable("sav_tickets", {
  id: text("id").primaryKey(),
  ref: text("ref").notNull(),
  clientId: text("client_id"),
  clientName: text("client_name").notNull(),
  projectRef: text("project_ref").notNull(),
  issue: text("issue").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
  assignedTo: text("assigned_to").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

