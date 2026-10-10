"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  APPOINTMENTS,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
} from "@/lib/data/operations";
import { COMMERCIALS, DESIGNERS, getAppointmentById } from "@/lib/data/appointments";
import { getOwnerScope } from "@/lib/data/scope";
import { notifyAdmins, notifyByRole } from "@/lib/notify";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function canManage(scope: string | null, commercial: string | null): boolean {
  return !scope || commercial === null || commercial === scope;
}

// --- Public consultation requests -------------------------------------------

const FORMAT_TO_LOCATION: Record<string, string> = {
  atelier: "Atelier ART Cuisine — Alger",
  domicile: "À définir avec le client",
  visio: "Visioconférence",
};

const SLOT_TO_HOUR: Record<string, number> = {
  matin: 9,
  "apres-midi": 14,
  soir: 17,
};

const consultationRequestSchema = z.object({
  name: z.string().trim().min(2, "Votre nom est requis."),
  phone: z.string().trim().min(6, "Numéro de téléphone invalide."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  format: z.enum(["atelier", "domicile", "visio"]).default("atelier"),
  date: z.string().trim().optional(),
  slot: z.enum(["matin", "apres-midi", "soir"]).optional(),
  message: z.string().trim().optional(),
});

/** Public-facing — called from the marketing site's consultation form. No auth required. */
export async function requestConsultation(input: unknown): Promise<ActionResult> {
  const parsed = consultationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { name, phone, email, format, date, slot, message } = parsed.data;

  let isoDate: string;
  if (date) {
    const hour = SLOT_TO_HOUR[slot ?? "matin"];
    const parsedDate = new Date(`${date}T00:00:00`);
    parsedDate.setHours(hour, 0, 0, 0);
    isoDate = parsedDate.toISOString();
  } else {
    // No preferred date given — default to a week out, staff will confirm a slot.
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    fallback.setHours(10, 0, 0, 0);
    isoDate = fallback.toISOString();
  }

  APPOINTMENTS.unshift({
    id: `RDV-${randomUUID().slice(0, 8).toUpperCase()}`,
    type: "Consultation",
    title: `Demande de consultation — ${name}`,
    leadId: null,
    clientId: null,
    projectRef: null,
    contactName: name,
    contactPhone: phone,
    contactEmail: email,
    date: isoDate,
    durationMinutes: 45,
    location: FORMAT_TO_LOCATION[format],
    commercial: null,
    designer: null,
    status: "Demandé",
    notes: message?.trim() || "Demande envoyée depuis le site.",
    followUpNotes: null,
    reminderMinutesBefore: null,
    createdAt: new Date().toISOString(),
    source: "Public",
  });

  const description = `${name} — ${FORMAT_TO_LOCATION[format]} (${phone})`;
  notifyAdmins({ type: "new_lead", title: "Nouvelle demande de consultation", description, link: "/dashboard/rendez-vous" });
  notifyByRole("commercial", { type: "new_lead", title: "Nouvelle demande de consultation", description, link: "/dashboard/rendez-vous" });

  revalidatePath("/dashboard/rendez-vous");
  return { ok: true, data: undefined };
}

// --- Internal management -----------------------------------------------------

const appointmentSchema = z.object({
  type: z.enum(APPOINTMENT_TYPES),
  title: z.string().trim().min(2, "Le titre est requis."),
  leadId: z.string().trim().optional().nullable(),
  clientId: z.string().trim().optional().nullable(),
  projectRef: z.string().trim().optional().nullable(),
  contactName: z.string().trim().min(2, "Le nom du contact est requis."),
  contactPhone: z.string().trim().min(6, "Numéro de téléphone invalide."),
  contactEmail: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  date: z.string().trim().min(1, "La date est requise."),
  durationMinutes: z.coerce.number().min(5).max(480),
  location: z.string().trim().min(2, "Le lieu est requis."),
  commercial: z.enum(COMMERCIALS),
  designer: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().default(""),
  reminderMinutesBefore: z.coerce.number().optional().nullable(),
});

function normalizeLinks<T extends { leadId?: string | null; clientId?: string | null; projectRef?: string | null; designer?: string | null }>(
  data: T,
) {
  return {
    leadId: data.leadId || null,
    clientId: data.clientId || null,
    projectRef: data.projectRef || null,
    designer: data.designer && DESIGNERS.includes(data.designer as (typeof DESIGNERS)[number]) ? data.designer : null,
  };
}

export async function createAppointment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const links = normalizeLinks(parsed.data);
  const id = `RDV-${randomUUID().slice(0, 8).toUpperCase()}`;

  APPOINTMENTS.unshift({
    id,
    type: parsed.data.type,
    title: parsed.data.title,
    ...links,
    contactName: parsed.data.contactName,
    contactPhone: parsed.data.contactPhone,
    contactEmail: parsed.data.contactEmail,
    date: new Date(parsed.data.date).toISOString(),
    durationMinutes: parsed.data.durationMinutes,
    location: parsed.data.location,
    // A commercial can only ever create appointments assigned to themselves.
    commercial: scope ?? parsed.data.commercial,
    status: "Confirmé",
    notes: parsed.data.notes ?? "",
    followUpNotes: null,
    reminderMinutesBefore: parsed.data.reminderMinutesBefore ?? null,
    createdAt: new Date().toISOString(),
    source: "Interne",
  });

  revalidatePath("/dashboard/rendez-vous");
  return { ok: true, data: { id } };
}

export async function updateAppointment(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const appointment = getAppointmentById(id);
  if (!appointment) {
    return { ok: false, error: "Rendez-vous introuvable." };
  }
  if (!canManage(scope, appointment.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce rendez-vous." };
  }

  const parsed = appointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const links = normalizeLinks(parsed.data);

  appointment.type = parsed.data.type;
  appointment.title = parsed.data.title;
  appointment.leadId = links.leadId;
  appointment.clientId = links.clientId;
  appointment.projectRef = links.projectRef;
  appointment.contactName = parsed.data.contactName;
  appointment.contactPhone = parsed.data.contactPhone;
  appointment.contactEmail = parsed.data.contactEmail;
  appointment.date = new Date(parsed.data.date).toISOString();
  appointment.durationMinutes = parsed.data.durationMinutes;
  appointment.location = parsed.data.location;
  // Claiming an unowned request, or a commercial editing their own, both keep it theirs.
  appointment.commercial = scope ?? parsed.data.commercial;
  appointment.designer = links.designer;
  appointment.notes = parsed.data.notes ?? "";
  appointment.reminderMinutesBefore = parsed.data.reminderMinutesBefore ?? null;

  revalidatePath("/dashboard/rendez-vous");
  revalidatePath(`/dashboard/rendez-vous/${id}`);
  return { ok: true, data: undefined };
}

const statusSchema = z.object({ status: z.enum(APPOINTMENT_STATUSES) });

export async function updateAppointmentStatus(id: string, status: unknown): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const appointment = getAppointmentById(id);
  if (!appointment) {
    return { ok: false, error: "Rendez-vous introuvable." };
  }
  if (!canManage(scope, appointment.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce rendez-vous." };
  }

  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "Statut invalide." };
  }

  appointment.status = parsed.data.status;
  // Confirming an unclaimed public request assigns it to whoever confirms it.
  if (scope && appointment.commercial === null) {
    appointment.commercial = scope;
  }

  revalidatePath("/dashboard/rendez-vous");
  revalidatePath(`/dashboard/rendez-vous/${id}`);
  return { ok: true, data: undefined };
}

const followUpSchema = z.object({
  followUpNotes: z.string().trim().min(2, "Le compte-rendu ne peut pas être vide."),
});

export async function addFollowUpNotes(id: string, input: unknown): Promise<ActionResult> {
  const user = await requirePermission("leads.manage");
  const scope = getOwnerScope(user);

  const appointment = getAppointmentById(id);
  if (!appointment) {
    return { ok: false, error: "Rendez-vous introuvable." };
  }
  if (!canManage(scope, appointment.commercial)) {
    return { ok: false, error: "Vous n'avez pas accès à ce rendez-vous." };
  }

  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  appointment.followUpNotes = parsed.data.followUpNotes;
  appointment.status = "Terminé";

  revalidatePath("/dashboard/rendez-vous");
  revalidatePath(`/dashboard/rendez-vous/${id}`);
  return { ok: true, data: undefined };
}
