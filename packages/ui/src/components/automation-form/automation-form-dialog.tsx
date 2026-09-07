import * as React from "react";
import { Plus, X } from "lucide-react";
import { AUTOMATION_TRIGGER_TYPES, AUTOMATION_ACTION_TYPES, TASK_STATUSES, TASK_PRIORITIES } from "@flow/types";
import type { Automation, AutomationTriggerType, AutomationActionType, TaskStatus, TaskPriority } from "@flow/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../dialog/dialog";
import { Input } from "../input/input";
import { Textarea } from "../textarea/textarea";
import { Button } from "../button/button";
import { FormField } from "../form-field/form-field";
import { Alert } from "../alert/alert";
import { Select, SelectTrigger, SelectContent, SelectItem } from "../select/select";
import { TASK_STATUS_CONFIG } from "../task-status/task-status";
import { PRIORITY_CONFIG } from "../priority-badge/priority-badge";

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  task_status_changed: "Task status changes",
  task_assigned: "Task is assigned",
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  set_status: "Set status",
  assign_user: "Assign user",
  add_comment: "Add comment",
};

export interface AutomationFormValues {
  name: string;
  triggerType: AutomationTriggerType;
  triggerToStatus?: TaskStatus;
  conditionPriority?: TaskPriority;
  actionType: AutomationActionType;
  actionStatus?: TaskStatus;
  actionUserId?: string;
  actionComment?: string;
}

export interface AutomationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAutomation?: Automation;
  assignableUsers: { id: string; fullName: string | null }[];
  error?: string | null;
  pending?: boolean;
  onSubmit: (values: AutomationFormValues) => void;
}

function toFormValues(automation?: Automation): AutomationFormValues {
  if (!automation) {
    return { name: "", triggerType: "task_status_changed", triggerToStatus: "done", actionType: "add_comment" };
  }
  return {
    name: automation.name,
    triggerType: automation.triggerType,
    triggerToStatus: "toStatus" in automation.triggerConfig ? automation.triggerConfig.toStatus : undefined,
    conditionPriority: automation.conditionConfig?.priority,
    actionType: automation.actionType,
    actionStatus: "status" in automation.actionConfig ? automation.actionConfig.status : undefined,
    actionUserId: "userId" in automation.actionConfig ? automation.actionConfig.userId : undefined,
    actionComment: "comment" in automation.actionConfig ? automation.actionConfig.comment : undefined,
  };
}

/**
 * Create/edit an automation. Only exposes the two trigger types, one
 * condition type, and three action types the schema actually supports
 * (Phase 20) — WHEN / optional IF / THEN, matching the reference
 * layout, not a generic rule builder.
 */
export function AutomationFormDialog({ open, onOpenChange, editingAutomation, assignableUsers, error, pending, onSubmit }: AutomationFormDialogProps) {
  const [values, setValues] = React.useState<AutomationFormValues>(() => toFormValues(editingAutomation));
  const [hasCondition, setHasCondition] = React.useState(Boolean(editingAutomation?.conditionConfig?.priority));

  React.useEffect(() => {
    if (open) {
      setValues(toFormValues(editingAutomation));
      setHasCondition(Boolean(editingAutomation?.conditionConfig?.priority));
    }
  }, [open, editingAutomation]);

  function update<K extends keyof AutomationFormValues>(key: K, value: AutomationFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...values, conditionPriority: hasCondition ? values.conditionPriority : undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingAutomation ? "Edit automation" : "Create automation"}</DialogTitle>
          <DialogDescription>Set up a rule to automate repetitive work.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormField label="Name" htmlFor="automation-name">
            <Input
              id="automation-name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Task completed → Add comment"
              required
              autoFocus
            />
          </FormField>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <span className="text-label text-text-secondary">
              WHEN <span className="font-normal text-text-muted">— this happens…</span>
            </span>
            <Select value={values.triggerType} onValueChange={(v) => update("triggerType", v as AutomationTriggerType)}>
              <SelectTrigger>{TRIGGER_LABELS[values.triggerType]}</SelectTrigger>
              <SelectContent>
                {AUTOMATION_TRIGGER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TRIGGER_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {values.triggerType === "task_status_changed" && (
              <FormField label="Status" htmlFor="trigger-status">
                <Select value={values.triggerToStatus ?? ""} onValueChange={(v) => update("triggerToStatus", v as TaskStatus)}>
                  <SelectTrigger>{values.triggerToStatus ? TASK_STATUS_CONFIG[values.triggerToStatus].label : "Choose a status"}</SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-label text-text-secondary">
                IF <span className="font-normal text-text-muted">(optional) — these conditions are met…</span>
              </span>
              {hasCondition && (
                <button type="button" onClick={() => setHasCondition(false)} className="text-text-muted hover:text-text-primary">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {hasCondition ? (
              <FormField label="Priority is" htmlFor="condition-priority">
                <Select value={values.conditionPriority ?? ""} onValueChange={(v) => update("conditionPriority", v as TaskPriority)}>
                  <SelectTrigger>{values.conditionPriority ? PRIORITY_CONFIG[values.conditionPriority].label : "Choose a priority"}</SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.filter((p) => p !== "none").map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_CONFIG[priority].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <Button type="button" variant="secondary" size="sm" onClick={() => setHasCondition(true)} className="w-fit">
                <Plus className="size-3.5" />
                Add condition
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <span className="text-label text-text-secondary">
              THEN <span className="font-normal text-text-muted">— do this…</span>
            </span>
            <Select value={values.actionType} onValueChange={(v) => update("actionType", v as AutomationActionType)}>
              <SelectTrigger>{ACTION_LABELS[values.actionType]}</SelectTrigger>
              <SelectContent>
                {AUTOMATION_ACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ACTION_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {values.actionType === "set_status" && (
              <FormField label="Status" htmlFor="action-status">
                <Select value={values.actionStatus ?? ""} onValueChange={(v) => update("actionStatus", v as TaskStatus)}>
                  <SelectTrigger>{values.actionStatus ? TASK_STATUS_CONFIG[values.actionStatus].label : "Choose a status"}</SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {TASK_STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {values.actionType === "assign_user" && (
              <FormField label="Assign to" htmlFor="action-user">
                <Select value={values.actionUserId ?? ""} onValueChange={(v) => update("actionUserId", v)}>
                  <SelectTrigger>
                    {values.actionUserId ? assignableUsers.find((u) => u.id === values.actionUserId)?.fullName ?? "Unnamed" : "Choose a person"}
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName ?? "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {values.actionType === "add_comment" && (
              <FormField label="Comment" htmlFor="action-comment">
                <Textarea
                  id="action-comment"
                  value={values.actionComment ?? ""}
                  onChange={(e) => update("actionComment", e.target.value)}
                  placeholder="Great work! 🎉"
                  rows={3}
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editingAutomation ? "Save" : "Create Automation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
