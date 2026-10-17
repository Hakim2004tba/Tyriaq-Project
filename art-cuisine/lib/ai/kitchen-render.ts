/**
 * Thin wrapper around fal.ai's FLUX.1 Kontext image-editing models. Called
 * only from lib/actions/kitchen-render.ts, which enforces the review/approve
 * gate — this module has no awareness of that workflow, it just turns a
 * prompt + reference images into one generated image.
 *
 * Three fal.ai endpoints cover every case this app needs:
 * - flux-pro/v1.1 (text only) — the rare case a client submitted zero photos.
 * - flux-pro/kontext (one image) — first generation from the client's photo,
 *   or a whole-image retouch of the current render.
 * - flux-pro/kontext/multi (two images) — a region-targeted retouch: the
 *   current image plus the same image with the edit area marked in red.
 */

export interface InlineImage {
  mimeType: string;
  /** Base64-encoded image bytes, no "data:" prefix. */
  data: string;
}

export class KitchenRenderError extends Error {}

function apiKey(): string {
  const key = process.env.FAL_API_KEY;
  if (!key) {
    throw new KitchenRenderError(
      "FAL_API_KEY n'est pas configurée. Ajoutez-la dans .env.local pour le développement, et dans les variables d'environnement Vercel pour la production.",
    );
  }
  return key;
}

interface FalImageResult {
  images?: { url: string; content_type?: string }[];
  detail?: string;
  error?: string;
}

async function callFal(endpoint: string, body: Record<string, unknown>): Promise<FalImageResult> {
  const response = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as FalImageResult;

  if (!response.ok) {
    const message = json.detail || json.error || `erreur ${response.status}`;
    throw new KitchenRenderError(`fal.ai a renvoyé une erreur : ${message}`);
  }
  return json;
}

/** Downloads the generated image fal.ai hosts and re-encodes it as a self-contained data URL, matching how every other image in this app is stored. */
async function fetchAsInlineImage(url: string, fallbackMimeType: string): Promise<InlineImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new KitchenRenderError("Impossible de récupérer l'image générée par fal.ai.");
  }
  const buffer = await response.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const mimeType = response.headers.get("content-type") || fallbackMimeType;
  return { mimeType, data };
}

/**
 * Generates (or regenerates) one kitchen visualization image.
 * - `referenceImages`: the client's real uploaded photo(s) — used as-is, first one wins if several.
 * - `priorImage`: when regenerating, the current image is passed back in alongside `feedbackNote`
 *   so the model edits that same image rather than starting from scratch.
 * - `regionOverlay`: the current image with a colored brush mark over the area to change — sent
 *   alongside `priorImage` so the model can target that region specifically.
 */
export async function generateKitchenRenderImage({
  prompt,
  referenceImages,
  priorImage,
  regionOverlay,
}: {
  prompt: string;
  referenceImages: string[]; // data URLs
  priorImage?: string;
  regionOverlay?: string;
}): Promise<InlineImage> {
  let result: FalImageResult;

  if (priorImage && regionOverlay) {
    result = await callFal("fal-ai/flux-pro/kontext/multi", { prompt, image_urls: [priorImage, regionOverlay] });
  } else if (priorImage) {
    result = await callFal("fal-ai/flux-pro/kontext", { prompt, image_url: priorImage });
  } else if (referenceImages.length > 0) {
    result = await callFal("fal-ai/flux-pro/kontext", { prompt, image_url: referenceImages[0] });
  } else {
    result = await callFal("fal-ai/flux-pro/v1.1", { prompt });
  }

  const image = result.images?.[0];
  if (!image) {
    throw new KitchenRenderError("fal.ai n'a renvoyé aucune image.");
  }

  return fetchAsInlineImage(image.url, image.content_type || "image/jpeg");
}

export function inlineImageToDataUrl(image: InlineImage): string {
  return `data:${image.mimeType};base64,${image.data}`;
}
