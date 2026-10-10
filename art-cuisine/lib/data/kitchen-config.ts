import { eq } from "drizzle-orm";
import { getPgDb } from "@/lib/db/pg";
import { kitchenConfigs as kitchenConfigsTable } from "@/lib/db/schema";
import {
  KITCHEN_LAYOUTS,
  ISLAND_OPTIONS,
  DEPTH_OPTIONS,
  HOOD_OPTIONS,
  OVEN_OPTIONS,
  FRIDGE_OPTIONS,
  ACCESSORY_OPTIONS,
  FLOOR_TYPES,
  CONFIGURATOR_BUDGETS,
  type KitchenConfigRecord,
  type ConfiguratorBudget,
} from "@/lib/data/operations";

export {
  KITCHEN_LAYOUTS,
  ISLAND_OPTIONS,
  DEPTH_OPTIONS,
  HOOD_OPTIONS,
  OVEN_OPTIONS,
  FRIDGE_OPTIONS,
  ACCESSORY_OPTIONS,
  FLOOR_TYPES,
  CONFIGURATOR_BUDGETS,
};

export async function getConfigByDevisId(devisId: string): Promise<KitchenConfigRecord | undefined> {
  const rows = await getPgDb().select().from(kitchenConfigsTable).where(eq(kitchenConfigsTable.devisId, devisId));
  return rows[0] as KitchenConfigRecord | undefined;
}

/** Rough starting price from the budget bracket a prospect selected — staff refine it once they price the devis. */
const BUDGET_MIDPOINT: Record<ConfiguratorBudget, number> = {
  "Moins de 1 000 000 DA": 800_000,
  "1 000 000 — 1 800 000 DA": 1_400_000,
  "1 800 000 — 2 500 000 DA": 2_150_000,
  "Plus de 2 500 000 DA": 3_000_000,
};

export function estimateAmountFromBudget(budget: ConfiguratorBudget): number {
  return BUDGET_MIDPOINT[budget];
}
