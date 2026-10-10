import * as React from "react";
import { cn } from "@/lib/utils";

function Kicker({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("kicker", className)} {...props} />;
}

export interface SectionHeadingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
}

function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
      {...props}
    >
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2 className="font-display text-3xl font-medium leading-[1.1] text-text-primary sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="max-w-xl text-[0.9375rem] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}

export { Kicker, SectionHeading };
