import type { ProjectColor } from "@flow/types";

/**
 * Maps the controlled project-color palette (@flow/types PROJECT_COLORS)
 * to semantic Tailwind classes. This is the only place a project color
 * touches an actual token — nowhere else should a project color be a
 * raw hex value (brief section 23: "Do not allow arbitrary user-provided
 * CSS colors").
 */
export const PROJECT_COLOR_CLASSES: Record<ProjectColor, { bg: string; text: string; dot: string }> = {
  purple: { bg: "bg-primary-muted", text: "text-primary", dot: "bg-primary" },
  info: { bg: "bg-info-subtle", text: "text-info", dot: "bg-info" },
  success: { bg: "bg-success-subtle", text: "text-success", dot: "bg-success" },
  warning: { bg: "bg-warning-subtle", text: "text-warning", dot: "bg-warning" },
  danger: { bg: "bg-danger-subtle", text: "text-danger", dot: "bg-danger" },
  neutral: { bg: "bg-surface-muted", text: "text-text-secondary", dot: "bg-text-muted" },
};

export const PROJECT_COLOR_LABELS: Record<ProjectColor, string> = {
  purple: "Purple",
  info: "Blue",
  success: "Green",
  warning: "Amber",
  danger: "Red",
  neutral: "Gray",
};
