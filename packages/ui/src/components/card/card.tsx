import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@flow/utils";

/**
 * Tyriaq surfaces.
 *
 * Depth on a near-black ground cannot come from a drop shadow — you
 * can't cast a darker shadow onto something already almost black. It
 * comes from `shadow-card`: a 1px inset highlight on the top edge (the
 * surface catching light on its lip) plus a wide ambient pool that
 * occludes the aurora behind it. The fill itself stays dark.
 *
 * Variants:
 *  - `default`  the workhorse. Use this unless there's a reason not to.
 *  - `glass`    translucent, lets the aurora through. Needs the aurora
 *               behind it — over a solid parent it just looks darker.
 *  - `cosmic`   the nebula surface. AT MOST ONE PER VIEWPORT. Reserved
 *               for goal progress, panel headers and empty states.
 *  - `flat`     no elevation. For cards nested inside another surface,
 *               where a second rim would read as a double border.
 */
export const cardVariants = cva("rounded-lg border transition-all duration-base ease-emphasized", {
  variants: {
    variant: {
      default: "border-border bg-surface shadow-card",
      glass: "tq-glass border-border shadow-card",
      cosmic: "tq-cosmic border-border-brand bg-surface shadow-card",
      flat: "border-border bg-surface-muted",
    },
    interactive: {
      true:
        "cursor-pointer hover:-translate-y-px hover:border-border-strong hover:shadow-card-hover " +
        "focus-visible:outline-none focus-visible:shadow-focus",
      false: "",
    },
  },
  defaultVariants: { variant: "default", interactive: false },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, interactive, className }))} {...props} />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1 p-5", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-h4 text-text-primary", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-body-sm text-text-secondary", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

/**
 * The stat tile from the reference dashboards: a label, a large tabular
 * metric, a delta, and a tinted icon chip. Extracted as a component
 * because it appears on Home, Reports and every member profile — three
 * hand-rolled versions would drift within a sprint.
 */
export interface StatCardProps extends Omit<CardProps, "title"> {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
}

const TONE_CHIP: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary-muted text-primary",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
};

export function StatCard({ label, value, delta, icon, tone = "primary", className, ...props }: StatCardProps) {
  return (
    <Card className={cn("p-4", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Wraps rather than truncates: at 320px the two-up grid leaves
              roughly 60px beside the icon chip, and a stat tile reading
              "Ov..." is worse than one two lines tall. */}
          <p className="text-body-sm leading-[18px] text-text-secondary">{label}</p>
          <p className="mt-1.5 text-metric tabular text-text-primary">{value}</p>
        </div>
        {icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md",
              TONE_CHIP[tone]
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      {delta && (
        <p
          className={cn(
            "mt-2 text-caption tabular",
            delta.direction === "up" && "text-success",
            delta.direction === "down" && "text-danger",
            delta.direction === "flat" && "text-text-muted"
          )}
        >
          {delta.value}
        </p>
      )}
    </Card>
  );
}
