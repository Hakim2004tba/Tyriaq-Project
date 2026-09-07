import { z } from "zod";
import { SEARCH_RESULT_TYPES } from "@flow/types";

/** Empty/whitespace-only queries are rejected here so the caller can
 * skip the request entirely rather than round-tripping an empty search
 * (brief: "empty query → no search request"). */
export const searchQuerySchema = z.string().trim().min(1, "Search query is required").max(200, "Search query is too long");

export const searchFiltersSchema = z.object({
  types: z.array(z.enum(SEARCH_RESULT_TYPES)).optional(),
});
export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;
