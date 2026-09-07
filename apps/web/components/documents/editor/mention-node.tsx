"use client";

import Mention from "@tiptap/extension-mention";
import { mergeAttributes } from "@tiptap/core";

/**
 * `@name` mentions.
 *
 * The id is what is stored; the label is kept alongside it only so a
 * mention still reads as a name if the person leaves the workspace and
 * their profile can no longer be resolved. Rendering prefers the id, so
 * a rename shows up wherever they were mentioned.
 */
export const UserMention = Mention.extend({
  name: "mention",

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        {
          "data-mention": "",
          class:
            "rounded-sm bg-primary-muted px-1 font-medium text-primary",
        },
        HTMLAttributes
      ),
      `@${node.attrs.label ?? node.attrs.id}`,
    ];
  },
}).configure({
  // The suggestion plugin is wired where the editor is built, since it
  // needs the workspace roster.
  HTMLAttributes: {},
});
