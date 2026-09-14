"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Avatar, Button, toast } from "@flow/ui";
import { createClient } from "@/lib/supabase/client";
import { saveAvatar } from "@/lib/auth/actions";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Choosing a profile picture.
 *
 * The file goes straight from the browser into the bucket, like every
 * other upload in the product — a Server Action accepts one megabyte of
 * body, and a photo off a phone is routinely larger than that.
 *
 * It saves on choosing rather than behind a Save button: a picture is a
 * single decision, and a form that silently discards it because
 * somebody navigated away is worse than one that commits immediately.
 * The preview switches the moment a file is picked, because on a slow
 * connection the upload takes seconds and a picker that looks like it
 * ignored you is a picker people click twice.
 */
export function AvatarPicker({
  name,
  initialUrl,
  onChange,
}: {
  name: string;
  initialUrl: string | null;
  onChange?: (url: string | null) => void;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function choose(file: File) {
    if (!TYPES.includes(file.type)) {
      toast.error("Pictures only — PNG, JPEG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That picture is larger than 2 MB.");
      return;
    }

    const local = URL.createObjectURL(file);
    setPreview(local);

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in first.");
        setPreview(null);
        return;
      }

      /*
        The path starts with the owner's id, which is exactly what the
        storage policy checks — so a browser cannot write over somebody
        else's face however the request is shaped. The filename is a
        uuid, so replacing a picture never overwrites the old object and
        a cached copy of it cannot show through.
      */
      const extension = file.name.includes(".")
        ? `.${file.name.split(".").pop()!.slice(0, 8).toLowerCase()}`
        : ".png";
      const path = `${user.id}/${crypto.randomUUID()}${extension}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error(error.message);
        setPreview(null);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const result = await saveAvatar(publicUrl);
      if (result.error) {
        toast.error(result.error);
        setPreview(null);
        return;
      }

      setUrl(publicUrl);
      setPreview(null);
      onChange?.(publicUrl);
      toast.success("Picture saved.");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await saveAvatar(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setUrl(null);
      onChange?.(null);
      toast.success("Back to your initials.");
    });
  }

  const shown = preview ?? url;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        aria-label={shown ? "Change your picture" : "Add a picture"}
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Avatar name={name} src={shown} size="xl" />
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0
                     transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <Camera className="size-5 text-white" />
        </span>
      </button>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-3.5" />
            {shown ? "Change picture" : "Add a picture"}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-caption text-text-muted">
          PNG, JPEG, WebP or GIF, up to 2 MB. Everyone in your workspace can see it.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so choosing the same file twice still fires.
          event.target.value = "";
          if (file) choose(file);
        }}
      />
    </div>
  );
}
