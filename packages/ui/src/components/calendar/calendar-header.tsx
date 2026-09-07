import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../button/button";
import { IconButton } from "../button/icon-button";
import { Tabs, TabsList, TabsTrigger } from "../tabs/tabs";

export interface CalendarHeaderProps {
  label: string;
  mode: "day" | "month" | "week";
  onModeChange: (mode: "day" | "month" | "week") => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Shared nav toolbar for the Calendar view: prev/next/today + day/week/month
 * toggle. Composes existing Button/IconButton/Tabs — no new primitives. */
export function CalendarHeader({ label, mode, onModeChange, onPrevious, onNext, onToday }: CalendarHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <IconButton label="Previous" onClick={onPrevious}>
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton label="Next" onClick={onNext}>
          <ChevronRight className="size-4" />
        </IconButton>
        <Button variant="secondary" size="sm" onClick={onToday}>
          Today
        </Button>
        <span className="ml-1 text-h4 text-text-primary">{label}</span>
      </div>

      <Tabs value={mode} onValueChange={(v) => onModeChange(v as "day" | "month" | "week")}>
        <TabsList>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
