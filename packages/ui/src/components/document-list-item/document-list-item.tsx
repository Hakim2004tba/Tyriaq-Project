import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { DocumentSummary } from "@flow/types";
import { formatRelativeTime } from "@flow/utils";
import { ListItem } from "../list/list";
import { DocumentIcon } from "../document-icon/document-icon";
import { Badge } from "../badge/badge";
import { Avatar } from "../avatar/avatar";

export interface DocumentListItemProps {
  document: DocumentSummary;
  projectName?: string | null;
  creatorName?: string | null;
  creatorAvatarUrl?: string | null;
  onClick?: () => void;
}

/** A document row for list views. Composes existing ListItem/Avatar/Badge
 * rather than a bespoke card — same primitive used by ProjectListItem etc. */
export function DocumentListItem({ document, projectName, creatorName, creatorAvatarUrl, onClick }: DocumentListItemProps) {
  return (
    <ListItem
      interactive
      onClick={onClick}
      leading={<DocumentIcon icon={document.icon} size="sm" />}
      trailing={
        <div className="flex items-center gap-3">
          {projectName && <Badge variant="neutral">{projectName}</Badge>}
          {creatorName && <Avatar name={creatorName} src={creatorAvatarUrl} size="xs" />}
          <span className="hidden text-caption text-text-muted sm:inline">
            {formatRelativeTime(document.updatedAt)}
          </span>
          <ChevronRight className="size-4 text-text-muted" aria-hidden="true" />
        </div>
      }
    >
      <span className="truncate text-body-sm text-text-primary">{document.title}</span>
    </ListItem>
  );
}
