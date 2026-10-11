import { eq, desc } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { kitchenRenders as kitchenRendersTable, kitchenRenderRevisions as kitchenRenderRevisionsTable } from "@/lib/db/schema";

export type KitchenRenderStatus = "pending_review" | "approved" | "generating" | "generated" | "failed";

export interface KitchenRenderRecord {
  id: string;
  devisId: string;
  status: KitchenRenderStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  currentRevisionId: string | null;
  errorMessage: string | null;
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

export async function getKitchenRenderForDevis(devisId: string): Promise<KitchenRenderRecord | undefined> {
  const rows = await getPgDb().select().from(kitchenRendersTable).where(eq(kitchenRendersTable.devisId, devisId));
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
