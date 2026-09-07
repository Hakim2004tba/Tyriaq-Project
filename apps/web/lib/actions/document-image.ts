"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * A short-lived URL for one document image.
 *
 * Minted per render rather than stored in the document, so access ends
 * when access ends. Storage applies the bucket's policies to the
 * caller's own session, which is what actually keeps another
 * workspace's images out of reach — this function does not decide it.
 */
export async function signDocumentImage(
  path: string
): Promise<{ url?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("document-images")
    // An hour: long enough to read a document without re-signing every
    // image as you scroll, short enough that a copied address is not a
    // lasting way around the policies.
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) return { error: error?.message ?? "Image unavailable." };
  return { url: data.signedUrl };
}
