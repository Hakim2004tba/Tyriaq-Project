import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@flow/utils";

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "aspect-square size-4 shrink-0 rounded-full border border-border-strong bg-surface text-primary transition-colors duration-fast",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="size-2 fill-primary text-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";
