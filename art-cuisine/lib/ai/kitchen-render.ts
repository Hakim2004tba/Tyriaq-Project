/**
 * Thin wrapper around Gemini's image generation/editing model
 * (gemini-2.5-flash-image). Called only from lib/actions/kitchen-render.ts,
 * which enforces the review/approve gate — this module has no awareness of
 * that workflow, it just turns a prompt + reference images into one
 * generated image.
 */

const MODEL = "gemini-2.5-flash-image";

export interface InlineImage {
  mimeType: string;
  /** Base64-encoded image bytes, no "data:" prefix. */
  data: string;
}

export class KitchenRenderError extends Error {}

function dataUrlToInlineImage(dataUrl: string): InlineImage | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new KitchenRenderError(
      "GEMINI_API_KEY n'est pas configurée. Ajoutez-la dans .env.local pour le développement, et dans les variables d'environnement Vercel pour la production.",
    );
  }
  return key;
}

/**
 * Generates (or regenerates) one kitchen visualization image.
 * - `referenceImages`: the client's real uploaded photo(s) — used as-is, first one wins if several.
 * - `priorImage`: when regenerating, the current image is passed back in alongside `feedbackNote`
 *   so Gemini edits that same image rather than starting from scratch.
 */
export async function generateKitchenRenderImage({
  prompt,
  referenceImages,
  priorImage,
  regionOverlay,
}: {
  prompt: string;
  referenceImages: string[]; // data URLs
  priorImage?: string; // data URL of the current revision, when regenerating
  /** The current image with a colored brush mark over the area to change — sent alongside `priorImage` so the model can target that region specifically. */
  regionOverlay?: string;
}): Promise<InlineImage> {
  const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
    { text: prompt },
  ];

  if (priorImage) {
    const inline = dataUrlToInlineImage(priorImage);
    if (inline) parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.data } });
  }
  if (regionOverlay) {
    const inline = dataUrlToInlineImage(regionOverlay);
    if (inline) parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.data } });
  }
  for (const photo of referenceImages) {
    const inline = dataUrlToInlineImage(photo);
    if (inline && inline.mimeType.startsWith("image/")) {
      parts.push({ inline_data: { mime_type: inline.mimeType, data: inline.data } });
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new KitchenRenderError(`Gemini a renvoyé une erreur (${response.status}) : ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const resultParts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> =
    json?.candidates?.[0]?.content?.parts ?? [];
  const image = resultParts.find((p) => p.inlineData)?.inlineData;

  if (!image) {
    const textPart = resultParts.find((p) => p.text);
    throw new KitchenRenderError(
      textPart?.text
        ? `Gemini n'a pas renvoyé d'image : ${textPart.text.slice(0, 300)}`
        : "Gemini n'a renvoyé aucune image.",
    );
  }

  return { mimeType: image.mimeType, data: image.data };
}

export function inlineImageToDataUrl(image: InlineImage): string {
  return `data:${image.mimeType};base64,${image.data}`;
}
