"use client";

import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

/**
 * Shared plumbing for the `@` and `#` menus.
 *
 * TipTap's suggestion plugin wants imperative lifecycle hooks; this
 * turns them into "render a React component near the caret", which is
 * the only part either menu actually cares about.
 *
 * The popup is positioned from the caret's own client rect rather than
 * with a positioning library — one small absolutely-placed list does not
 * justify another dependency, and the editor column is a fixed width so
 * there is no edge case about flipping sides.
 */
export function makeSuggestionRenderer<T>(
  Component: React.ComponentType<{
    items: T[];
    command: (item: T) => void;
    active: number;
  }>
): SuggestionOptions<T>["render"] {
  return () => {
    let renderer: ReactRenderer | null = null;
    let host: HTMLDivElement | null = null;
    let active = 0;
    let currentItems: T[] = [];
    let currentCommand: ((item: T) => void) | null = null;

    const place = (rect: DOMRect | null) => {
      if (!host || !rect) return;
      host.style.left = `${rect.left + window.scrollX}px`;
      // Below the caret, unless that would fall off the bottom.
      const below = rect.bottom + window.scrollY + 6;
      const wouldOverflow = rect.bottom + 260 > window.innerHeight;
      host.style.top = wouldOverflow
        ? `${rect.top + window.scrollY - 6}px`
        : `${below}px`;
      host.style.transform = wouldOverflow ? "translateY(-100%)" : "none";
    };

    const draw = () => {
      renderer?.updateProps({
        items: currentItems,
        active,
        command: (item: T) => currentCommand?.(item),
      });
    };

    return {
      onStart: (props) => {
        active = 0;
        currentItems = props.items;
        currentCommand = props.command as (item: T) => void;

        host = document.createElement("div");
        host.style.position = "absolute";
        host.style.zIndex = "60";
        document.body.appendChild(host);

        renderer = new ReactRenderer(Component, {
          props: { items: currentItems, active, command: currentCommand },
          editor: props.editor,
        });
        host.appendChild(renderer.element);
        place(props.clientRect?.() ?? null);
      },

      onUpdate: (props) => {
        currentItems = props.items;
        currentCommand = props.command as (item: T) => void;
        if (active >= currentItems.length) active = 0;
        draw();
        place(props.clientRect?.() ?? null);
      },

      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          props.event.preventDefault();
          return true;
        }
        if (currentItems.length === 0) return false;

        if (props.event.key === "ArrowDown") {
          active = (active + 1) % currentItems.length;
          draw();
          return true;
        }
        if (props.event.key === "ArrowUp") {
          active = (active - 1 + currentItems.length) % currentItems.length;
          draw();
          return true;
        }
        if (props.event.key === "Enter" || props.event.key === "Tab") {
          const item = currentItems[active];
          if (item !== undefined) currentCommand?.(item);
          return true;
        }
        return false;
      },

      onExit: () => {
        renderer?.destroy();
        host?.remove();
        renderer = null;
        host = null;
      },
    };
  };
}

export function SuggestionList<T extends { id: string }>({
  items,
  active,
  command,
  render,
  empty,
}: {
  items: T[];
  active: number;
  command: (item: T) => void;
  render: (item: T) => React.ReactNode;
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="w-64 rounded-md border border-border bg-surface-elevated px-3 py-2 text-caption text-text-muted shadow-lg">
        {empty}
      </div>
    );
  }

  return (
    <ul className="max-h-60 w-72 overflow-y-auto rounded-md border border-border bg-surface-elevated py-1 shadow-lg">
      {items.map((item, i) => (
        <li key={item.id}>
          <button
            type="button"
            onMouseDown={(e) => {
              // mousedown, not click: the editor loses its selection on
              // blur, and a click fires after that has already happened.
              e.preventDefault();
              command(item);
            }}
            className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-body-sm transition-colors ${
              i === active ? "bg-white/5 text-text-primary" : "text-text-secondary hover:bg-white/5"
            }`}
          >
            {render(item)}
          </button>
        </li>
      ))}
    </ul>
  );
}
