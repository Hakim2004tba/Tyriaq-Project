"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
  updateUserRole,
  setUserActive,
  deleteAllSessionsForUser,
} from "@/lib/auth/queries";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/tokens";
import { ROLES, STAFF_ROLES, type Role } from "@/lib/auth/roles";
import { EMPLOYEE_PROFILES, AVAILABILITY_STATUSES } from "@/lib/data/operations";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const STAFF_ROLE_VALUES = ROLES.filter((r): r is Role => STAFF_ROLES.includes(r));

function revalidateTeam(id?: string): void {
  revalidatePath("/dashboard/equipe");
  if (id) revalidatePath(`/dashboard/equipe/${id}`);
}

/** Upserts the EMPLOYEE_PROFILES entry for this email, creating one from defaults if none exists yet. */
function upsertProfile(email: string, patch: Partial<Omit<(typeof EMPLOYEE_PROFILES)[number], "email">>): void {
  const existing = EMPLOYEE_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    Object.assign(existing, patch);
    return;
  }
  EMPLOYEE_PROFILES.push({
    email,
    phone: "",
    department: "",
    hireDate: new Date().toISOString(),
    bio: "",
    availability: "Disponible",
    availabilityNote: "",
    ...patch,
  });
}

const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum(STAFF_ROLE_VALUES as [Role, ...Role[]]),
  phone: z.string().trim().optional().default(""),
  department: z.string().trim().optional().default(""),
  hireDate: z.string().trim().optional().default(""),
  bio: z.string().trim().optional().default(""),
});

export async function createEmployee(input: unknown): Promise<ActionResult<{ id: string; temporaryPassword: string }>> {
  await requirePermission("equipe.manage");

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  if (findUserByEmail(parsed.data.email)) {
    return { ok: false, error: "Un compte existe déjà avec cette adresse e-mail." };
  }

  const temporaryPassword = generateToken(6);
  const passwordHash = await hashPassword(temporaryPassword);
  const user = createUser({ name: parsed.data.name, email: parsed.data.email, passwordHash, role: parsed.data.role });

  upsertProfile(parsed.data.email, {
    phone: parsed.data.phone,
    department: parsed.data.department,
    hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate).toISOString() : new Date().toISOString(),
    bio: parsed.data.bio,
  });

  revalidateTeam();
  return { ok: true, data: { id: user.id, temporaryPassword } };
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  phone: z.string().trim().optional().default(""),
  department: z.string().trim().optional().default(""),
  hireDate: z.string().trim().optional().default(""),
  bio: z.string().trim().optional().default(""),
});

export async function updateEmployeeProfile(userId: string, input: unknown): Promise<ActionResult> {
  await requirePermission("equipe.manage");

  const target = findUserById(userId);
  if (!target) return { ok: false, error: "Employé introuvable." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const existingByEmail = findUserByEmail(parsed.data.email);
  if (existingByEmail && existingByEmail.id !== userId) {
    return { ok: false, error: "Un autre compte utilise déjà cette adresse e-mail." };
  }

  const previousEmail = target.email;
  updateUserProfile(userId, { name: parsed.data.name, email: parsed.data.email });

  if (previousEmail.toLowerCase() !== parsed.data.email.toLowerCase()) {
    const profile = EMPLOYEE_PROFILES.find((p) => p.email.toLowerCase() === previousEmail.toLowerCase());
    if (profile) profile.email = parsed.data.email;
  }
  upsertProfile(parsed.data.email, {
    phone: parsed.data.phone,
    department: parsed.data.department,
    hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate).toISOString() : undefined,
    bio: parsed.data.bio,
  });

  revalidateTeam(userId);
  return { ok: true, data: undefined };
}

const roleSchema = z.object({ role: z.enum(STAFF_ROLE_VALUES as [Role, ...Role[]]) });

export async function updateEmployeeRole(userId: string, role: unknown): Promise<ActionResult> {
  const session = await requirePermission("equipe.manage");
  if (userId === session.id) return { ok: false, error: "Vous ne pouvez pas modifier votre propre compte depuis cet écran." };

  const target = findUserById(userId);
  if (!target) return { ok: false, error: "Employé introuvable." };

  const parsed = roleSchema.safeParse({ role });
  if (!parsed.success) return { ok: false, error: "Rôle invalide." };

  updateUserRole(userId, parsed.data.role);
  revalidateTeam(userId);
  return { ok: true, data: undefined };
}

export async function setEmployeeActive(userId: string, active: boolean): Promise<ActionResult> {
  const session = await requirePermission("equipe.manage");
  if (userId === session.id) return { ok: false, error: "Vous ne pouvez pas modifier votre propre compte depuis cet écran." };

  const target = findUserById(userId);
  if (!target) return { ok: false, error: "Employé introuvable." };

  setUserActive(userId, active);
  if (!active) deleteAllSessionsForUser(userId);

  revalidateTeam(userId);
  return { ok: true, data: undefined };
}

const availabilitySchema = z.object({
  availability: z.enum(AVAILABILITY_STATUSES),
  availabilityNote: z.string().trim().optional().default(""),
});

export async function updateEmployeeAvailability(userId: string, input: unknown): Promise<ActionResult> {
  await requirePermission("equipe.manage");

  const target = findUserById(userId);
  if (!target) return { ok: false, error: "Employé introuvable." };

  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  upsertProfile(target.email, { availability: parsed.data.availability, availabilityNote: parsed.data.availabilityNote });

  revalidateTeam(userId);
  return { ok: true, data: undefined };
}
