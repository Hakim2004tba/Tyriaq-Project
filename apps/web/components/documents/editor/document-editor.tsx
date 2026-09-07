"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import { Avatar, toast } from "@flow/ui";
import { CheckCircle2, Circle, CircleDashed, CircleDot, CircleSlash } from "lucide-react";
import { cn } from "@flow/utils";
import { createClient } from "@/lib/supabase/client";
import { saveDocument } from "@/lib/actions/document";
import type { DocumentContent } from "@/lib/data/document-types";
import type { Person } from "@/lib/data/task-types";
import { documentExtensions } from "./extensions";
import { makeSuggestionRenderer, SuggestionList } from "./suggestion";
import { EditorToolbar } from "./toolbar";
import type { TaskLookup } from "./task-link";

export interface MentionablePerson extends Person {
  avatarUrl?: string | null;
}

export interface LinkableTask {
  id: string;
  title: string;
  status: string;
  projectName: string | null;
  projectSlug: string | null;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

const STATUS_ICON: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: CircleDot,
  review: CircleDashed,
  done: CheckCircle2,
  blocked: CircleSlash,
};

/**
 * The document surface.
 *
 * Autosaves on a pause in typing rather than per keystroke or behind a
 * Save button: a document is written in long runs, one request per
 * character could not be ordered reliably, and a Save button in a
 * shared wiki is a way to lose an afternoon's work by closing a tab.
 *
 * There is no live co-editing here. Two people typing into this at once
 * would each save their whole document over the other's — last write
 * wins, silently. Doing that properly needs a CRDT and a server that can
 * merge, which this architecture does not have, so the editor instead
 * warns when the document changed underneath it.
 */
export function DocumentEditor({
  documentId,
  initialContent,
  people,
  tasks,
  editable = true,
  onSaveStateChange,
  onOutOfDate,
}: {
  documentId: string;
  initialContent: DocumentContent;
  people: MentionablePerson[];
  tasks: LinkableTask[];
  editable?: boolean;
  onSaveStateChange?: (state: SaveState) => void;
  onOutOfDate?: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const peopleRef = useRef(people);
  peopleRef.current = people;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const taskLookup = useMemo<TaskLookup>(
    () => ({
      get: (id) => {
        const found = tasksRef.current.find((t) => t.id === id);
        return found
          ? { title: found.title, status: found.status, projectSlug: found.projectSlug }
          : undefined;
      },
    }),
    []
  );

  const mentionSuggestion = useMemo(
    () => ({
      items: ({ query }: { query: string }) =>
        peopleRef.current
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6),
      render: makeSuggestionRenderer<MentionablePerson>(({ items, active, command }) => (
        <SuggestionList
          items={items}
          active={active}
          command={(person) => command({ id: person.id, label: person.name } as never)}
          empty="Nobody by that name in this workspace."
          render={(person) => (
            <>
              <Avatar name={person.name} src={person.avatarUrl ?? undefined} size="xs" />
              <span className="truncate">{person.name}</span>
            </>
          )}
        />
      )),
    }),
    []
  );

  const taskSuggestion = useMemo(
    () => ({
      items: ({ query }: { query: string }) =>
        tasksRef.current
          .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6),
      command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: LinkableTask }) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: "taskLink", attrs: { id: props.id, title: props.title } },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: makeSuggestionRenderer<LinkableTask>(({ items, active, command }) => (
        <SuggestionList
          items={items}
          active={active}
          command={command}
          empty="No task by that name. Tasks are created in a project."
          render={(task) => {
            const Icon = STATUS_ICON[task.status] ?? Circle;
            return (
              <>
                <Icon className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                {task.projectName && (
                  <span className="shrink-0 text-caption text-text-muted">{task.projectName}</span>
                )}
              </>
            );
          }}
        />
      )),
    }),
    []
  );

  /* ---------------------------------------------------------------- */
  /* Saving                                                            */
  /* ---------------------------------------------------------------- */

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<JSONContent | null>(null);
  const inFlight = useRef(false);

  const flush = useCallback(async () => {
    const content = pendingRef.current;
    if (!content || inFlight.current) return;

    pendingRef.current = null;
    inFlight.current = true;
    onSaveStateChange?.("saving");

    const result = await saveDocument(documentId, content as DocumentContent);
    inFlight.current = false;

    if (result.error) {
      onSaveStateChange?.("error");
      toast.error(result.error);
      return;
    }
    onSaveStateChange?.("saved");
    // Anything typed while that request was open still needs saving.
    if (pendingRef.current) void flush();
  }, [documentId, onSaveStateChange]);

  const editor = useEditor(
    {
      editable,
      extensions: documentExtensions({ taskLookup, mentionSuggestion, taskSuggestion }),
      content: initialContent as JSONContent,
      // The editor renders on the client only; rendering it during SSR
      // and again on hydration produces two different DOM trees.
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "prose-document focus:outline-none",
        },
      },
      onUpdate: ({ editor: instance }) => {
        pendingRef.current = instance.getJSON();
        onSaveStateChange?.("saving");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 900);
      },
    },
    [documentId, editable]
  );

  // Leaving with unsaved keystrokes in the buffer would lose them.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendingRef.current) void flush();
    };
  }, [flush]);

  /* ---------------------------------------------------------------- */
  /* Images                                                            */
  /* ---------------------------------------------------------------- */

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      if (!file.type.startsWith("image/")) {
        toast.error("That file is not an image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Images are limited to 10 MB.");
        return;
      }

      setUploading(true);
      try {
        /*
          Straight from the browser into the bucket, like task
          attachments: a Server Action accepts one megabyte of body, and
          screenshots are routinely larger than that.

          The workspace leads the path because the storage policies read
          it to decide access.
        */
        const supabase = createClient();
        const { data: doc } = await supabase
          .from("documents")
          .select("workspace_id")
          .eq("id", documentId)
          .single();
        if (!doc) throw new Error("This document no longer exists.");

        const extension = file.name.includes(".") ? `.${file.name.split(".").pop()!.slice(0, 8)}` : ".png";
        const path = `${doc.workspace_id}/${documentId}/${crypto.randomUUID()}${extension}`;

        const { error } = await supabase.storage
          .from("document-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);

        editor.chain().focus().insertContent({ type: "image", attrs: { path, alt: file.name } }).run();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add that image.");
      } finally {
        setUploading(false);
      }
    },
    [documentId, editor]
  );

  /*
    Pasted and dropped images take the same path as the toolbar button —
    people paste screenshots far more often than they browse for a file,
    and a paste that silently did nothing would read as the editor being
    broken.
  */
  useEffect(() => {
    if (!editor || !editable) return;
    const dom = editor.view.dom;

    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (file?.type.startsWith("image/")) {
        event.preventDefault();
        void insertImage(file);
      }
    };
    const onDrop = (event: DragEvent) => {
      const file = Array.from(event.dataTransfer?.files ?? [])[0];
      if (file?.type.startsWith("image/")) {
        event.preventDefault();
        void insertImage(file);
      }
    };

    dom.addEventListener("paste", onPaste);
    dom.addEventListener("drop", onDrop);
    return () => {
      dom.removeEventListener("paste", onPaste);
      dom.removeEventListener("drop", onDrop);
    };
  }, [editable, editor, insertImage]);

  /*
    Somebody else saved this document while it was open.

    Without live merging, the safe thing is to say so — the alternative
    is quietly overwriting their work with a copy of the page as it was
    before they touched it.
  */
  useEffect(() => {
    if (!onOutOfDate) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`tyriaq:document:${documentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "documents", filter: `id=eq.${documentId}` },
        () => {
          // Our own save comes back too; only a change while nothing of
          // ours is in flight can be somebody else's.
          if (inFlight.current || pendingRef.current) return;
          onOutOfDate();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [documentId, onOutOfDate]);

  return (
    <div className="relative flex min-w-0 flex-col">
      {editor && editable && <EditorToolbar editor={editor} onInsertImage={insertImage} />}
      <EditorContent editor={editor} className={cn("min-w-0 py-6", uploading && "opacity-70")} />
      {uploading && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-caption text-text-secondary shadow-lg">
          Uploading image…
        </p>
      )}
    </div>
  );
}
