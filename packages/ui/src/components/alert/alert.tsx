import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@flow/utils";

const alertVariants = cva("flex gap-3 rounded-md border p-4 text-body-sm", {
  variants: {
    variant: {
      info: "bg-info-subtle border-info/20 text-text-primary",
      success: "bg-success-subtle border-success/20 text-text-primary",
      warning: "bg-warning-subtle border-warning/20 text-text-primary",
      danger: "bg-danger-subtle border-danger/20 text-text-primary",
    },
  },
  defaultVariants: { variant: "info" },
});

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

const iconColorMap = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
}

export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const Icon = iconMap[variant ?? "info"];
  return (
    <div role="alert" className={cn(alertVariants({ variant, className }))} {...props}>
      <Icon className={cn("size-5 shrink-0", iconColorMap[variant ?? "info"])} aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-medium text-text-primary">{title}</p>}
        {children && <div className="text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}
