import { eq, desc } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import {
  kitchenRenders as kitchenRendersTable,
  kitchenRenderRevisions as kitchenRenderRevisionsTable,
  kitchenRenderEvents as kitchenRenderEventsTable,
} from "@/lib/db/schema";

export type KitchenRenderStatus = "pending_review" | "approved" | "generating" | "generated" | "failed";
export type CustomerDecision = "approved" | "rejected" | "changes_requested";
export type KitchenRenderEventKind = "internal_note" | "shared" | "customer_feedback" | "customer_approved" | "customer_rejected";

export interface KitchenRenderRecord {
  id: string;
  devisId: string;
  status: KitchenRenderStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  currentRevisionId: string | null;
  errorMessage: string | null;
  sharedAt: string | null;
  shareToken: string | null;
  customerDecision: CustomerDecision | null;
  customerDecisionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenRenderRevisionRecord {
  id: string;
  renderId: string;
  imageDataUrl: string;
  prompt: string;
  feedbackNote: string | null;
  createdBy: string;
  createdAt: string;
}

export interface KitchenRenderEventRecord {
  id: string;
  renderId: string;
  kind: KitchenRenderEventKind;
  message: string;
  authorName: string;
  createdAt: string;
}

export async function getKitchenRenderForDevis(devisId: string): Promise<KitchenRenderRecord | undefined> {
  const rows = await getPgDb().select().from(kitchenRendersTable).where(eq(kitchenRendersTable.devisId, devisId));
  return rows[0] as KitchenRenderRecord | undefined;
}

export async function getKitchenRenderByShareToken(token: string): Promise<KitchenRenderRecord | undefined> {
  const rows = await getPgDb().select().from(kitchenRendersTable).where(eq(kitchenRendersTable.shareToken, token));
  return rows[0] as KitchenRenderRecord | undefined;
}

export async function getKitchenRenderRevisions(renderId: string): Promise<KitchenRenderRevisionRecord[]> {
  const rows = await getPgDb()
    .select()
    .from(kitchenRenderRevisionsTable)
    .where(eq(kitchenRenderRevisionsTable.renderId, renderId))
    .orderBy(desc(kitchenRenderRevisionsTable.createdAt));
  return rows as KitchenRenderRevisionRecord[];
}

export async function getKitchenRenderEvents(renderId: string): Promise<KitchenRenderEventRecord[]> {
  const rows = await getPgDb()
    .select()
    .from(kitchenRenderEventsTable)
    .where(eq(kitchenRenderEventsTable.renderId, renderId))
    .orderBy(desc(kitchenRenderEventsTable.createdAt));
  return rows as KitchenRenderEventRecord[];
}
