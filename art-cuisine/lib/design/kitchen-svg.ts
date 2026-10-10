/**
 * Deterministic, template-based kitchen visual generator — stands in for a
 * real AI image/design service (none is configured in this environment).
 * It turns structured specs (layout, dimensions, finish) into an actual
 * SVG floor plan or stylized render, so "Generate" and "Refine" produce a
 * genuine new design version rather than a no-op. It is not a machine-
 * learning model, and the UI is worded accordingly ("génération automatique
 * à partir des spécifications", not "powered by ...").
 */

export interface KitchenVisualParams {
  layout: "En I" | "En L" | "En U" | "Parallèle";
  island: boolean;
  width: number;
  depth: number;
  cabinetColor: string;
  worktopColor: string;
  floorColor: string;
}

export const CABINET_FINISHES = [
  { label: "Laqué blanc", hex: "#f2f0ea" },
  { label: "Laqué anthracite", hex: "#33353a" },
  { label: "Chêne naturel", hex: "#b98a55" },
  { label: "Vert sauge", hex: "#7c8f74" },
  { label: "Bleu nuit", hex: "#2b3a55" },
  { label: "Beige sable", hex: "#d9c9a8" },
] as const;

export const WORKTOP_FINISHES = [
  { label: "Quartz blanc", hex: "#eceae4" },
  { label: "Granit noir", hex: "#232323" },
  { label: "Marbre veiné", hex: "#d8d3c8" },
  { label: "Bois massif", hex: "#8a6238" },
] as const;

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const RUN_DEPTH = 16;

/** A clean top-down 2D floor plan — cabinet runs positioned by layout type. */
export function generateFloorPlanSvg(params: KitchenVisualParams): string {
  const W = 400;
  const H = 300;
  const pad = 24;
  const roomW = W - pad * 2;
  const roomH = H - pad * 2;
  const { cabinetColor, worktopColor, layout, island } = params;

  const runs: string[] = [];
  const worktops: string[] = [];

  function horizontalRun(x: number, y: number, w: number) {
    runs.push(`<rect x="${x}" y="${y}" width="${w}" height="${RUN_DEPTH * 2}" fill="${cabinetColor}" stroke="#00000022" />`);
    worktops.push(`<rect x="${x}" y="${y}" width="${w}" height="6" fill="${worktopColor}" />`);
  }
  function verticalRun(x: number, y: number, h: number) {
    runs.push(`<rect x="${x}" y="${y}" width="${RUN_DEPTH * 2}" height="${h}" fill="${cabinetColor}" stroke="#00000022" />`);
    worktops.push(`<rect x="${x}" y="${y}" width="6" height="${h}" fill="${worktopColor}" />`);
  }

  const top = pad;
  const left = pad;
  const right = pad + roomW;

  if (layout === "En I") {
    horizontalRun(left, top, roomW);
  } else if (layout === "En L") {
    horizontalRun(left, top, roomW);
    verticalRun(left, top, roomH);
  } else if (layout === "En U") {
    horizontalRun(left, top, roomW);
    verticalRun(left, top, roomH);
    verticalRun(right - RUN_DEPTH * 2, top, roomH);
  } else {
    horizontalRun(left, top, roomW);
    horizontalRun(left, top + roomH - RUN_DEPTH * 2, roomW);
  }

  const islandMarkup = island
    ? `<rect x="${W / 2 - 55}" y="${H / 2 - 10}" width="110" height="55" fill="${cabinetColor}" stroke="#00000022" /><rect x="${W / 2 - 55}" y="${H / 2 - 10}" width="110" height="6" fill="${worktopColor}" />`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#faf8f4" />
    <rect x="${pad}" y="${pad}" width="${roomW}" height="${roomH}" fill="none" stroke="#c9c2b4" stroke-width="3" />
    ${runs.join("\n")}
    ${worktops.join("\n")}
    ${islandMarkup}
    <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8a8478">${escapeXml(params.width.toFixed(1))}m × ${escapeXml(params.depth.toFixed(1))}m — Plan ${escapeXml(layout)}</text>
  </svg>`;

  return svgToDataUrl(svg);
}

/** A softly shaded elevation-style render, giving a more "finished" look than the flat plan. */
export function generateRenderSvg(params: KitchenVisualParams): string {
  const W = 400;
  const H = 300;
  const { cabinetColor, worktopColor, floorColor, island } = params;
  const gradId = "cabGrad";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${cabinetColor}" stop-opacity="1" />
        <stop offset="100%" stop-color="${cabinetColor}" stop-opacity="0.75" />
      </linearGradient>
      <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f1efe9" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H * 0.62}" fill="url(#wallGrad)" />
    <rect x="0" y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="${floorColor}" />
    <rect x="20" y="${H * 0.34}" width="${W - 40}" height="${H * 0.34}" fill="url(#${gradId})" stroke="#00000022" />
    <rect x="20" y="${H * 0.34}" width="${W - 40}" height="10" fill="${worktopColor}" />
    ${[0, 1, 2, 3, 4].map((i) => `<line x1="${20 + ((W - 40) / 5) * (i + 1)}" y1="${H * 0.34}" x2="${20 + ((W - 40) / 5) * (i + 1)}" y2="${H * 0.68}" stroke="#00000022" stroke-width="1.5" />`).join("")}
    <rect x="20" y="${H * 0.14}" width="${W - 40}" height="${H * 0.16}" fill="${cabinetColor}" opacity="0.9" stroke="#00000018" />
    ${island ? `<rect x="${W / 2 - 60}" y="${H * 0.74}" width="120" height="30" rx="2" fill="url(#${gradId})" stroke="#00000022" /><rect x="${W / 2 - 60}" y="${H * 0.74}" width="120" height="5" fill="${worktopColor}" />` : ""}
    <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8a8478">Rendu généré automatiquement</text>
  </svg>`;

  return svgToDataUrl(svg);
}
