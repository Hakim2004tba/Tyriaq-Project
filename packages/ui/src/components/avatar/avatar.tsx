import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@flow/utils";
import { initials } from "@flow/utils";

const sizeMap = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-caption",
  md: "size-8 text-body-sm",
  lg: "size-10 text-body",
  xl: "size-14 text-h4",
} as const;

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  name: string;
  size?: keyof typeof sizeMap;
  presence?: "online" | "away" | "offline";
}

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, src, name, size = "md", presence, ...props }, ref) => (
    <span className="relative inline-flex shrink-0">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          // Fallback initials sit on the brand gradient rather than a flat
          // tint — with no photo, the avatar becomes the only brand mark in
          // a row, and a flat chip reads as a missing image.
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
          "bg-brand font-semibold text-white ring-1 ring-inset ring-white/10",
          sizeMap[size],
          className
        )}
        {...props}
      >
        {src && <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />}
        <AvatarPrimitive.Fallback delayMs={src ? 400 : 0}>{initials(name)}</AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {presence && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            size === "xs" || size === "sm" ? "size-1.5" : "size-2.5",
            presence === "online" && "bg-success",
            presence === "away" && "bg-warning",
            presence === "offline" && "bg-text-muted"
          )}
          aria-label={`Status: ${presence}`}
        />
      )}
    </span>
  )
);
Avatar.displayName = "Avatar";

export interface AvatarGroupProps {
  people: { id: string; name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: keyof typeof sizeMap;
}

export function AvatarGroup({ people, max = 4, size = "sm" }: AvatarGroupProps) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  return (
    <div className="flex items-center -space-x-2" role="group" aria-label={`${people.length} people`}>
      {visible.map((p) => (
        <Avatar
          key={p.id}
          name={p.name}
          src={p.avatarUrl}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-surface-elevated font-medium text-text-secondary ring-2 ring-background",
            sizeMap[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
