import {
  Beaker, Briefcase, Code2, Compass, Flame, Layers, Megaphone,
  Palette, Rocket, Settings2, Sparkles, Target, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SpaceColor } from "@/lib/data/types";

/** The icon set a space can be given. Stored as a key, resolved here —
 * a component reference cannot round-trip through a database column. */
export const SPACE_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket, megaphone: Megaphone, code: Code2, palette: Palette,
  settings: Settings2, target: Target, sparkles: Sparkles, users: Users,
  briefcase: Briefcase, layers: Layers, compass: Compass, flame: Flame, beaker: Beaker,
};

export const SPACE_ICON_KEYS = Object.keys(SPACE_ICONS);
export const SPACE_COLOR_KEYS: SpaceColor[] = ["violet", "blue", "emerald", "amber", "rose", "cyan"];
