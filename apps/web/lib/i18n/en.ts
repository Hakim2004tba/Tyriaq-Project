/**
 * English, and the shape every other language follows.
 *
 * A flat object of dotted keys rather than nested groups: the key IS
 * the documentation at the call site — `t("task.markDone")` says what
 * it is, where `t(strings.task.markDone)` needs the reader to go and
 * look.
 *
 * Values may carry `{name}` placeholders, filled by the second argument
 * to `t`. No pluralisation engine: Arabic has six plural forms and
 * pretending otherwise with an English-shaped `_one` / `_other` pair
 * produces sentences no Arabic speaker would write. Where a count
 * changes the sentence, the sentence is a separate key.
 */
export const en = {
  /* ------------------------------ shell ------------------------------ */
  "nav.home": "Home",
  "nav.myTasks": "My Tasks",
  "nav.projects": "Projects",
  "nav.calendar": "Calendar",
  "nav.documents": "Documents",
  "nav.whiteboards": "Whiteboards",
  "nav.goals": "Goals",
  "nav.reports": "Reports",
  "nav.chat": "Chat",
  "nav.inbox": "Inbox",
  "nav.spaces": "Spaces",
  "nav.soon": "Soon",
  "nav.create": "Create",
  "nav.search": "Search tasks, docs and people…",
  "nav.profile": "Profile",
  "nav.people": "People & permissions",
  "nav.billing": "Plan & billing",
  "nav.signOut": "Sign out",
  "nav.language": "Language",

  /* ----------------------------- common ------------------------------ */
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.done": "Done",
  "common.add": "Add",
  "common.remove": "Remove",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.export": "Export to CSV",
  "common.loading": "Loading…",
  "common.nothingHere": "Nothing here yet",

  /* ------------------------------ tasks ------------------------------ */
  "task.one": "task",
  "task.many": "tasks",
  "task.new": "New task",
  "task.add": "Add task",
  "task.title": "Task name, then Enter — Escape to finish",
  "task.subtask": "Subtask, then Enter",
  "task.addSubtask": "Add subtask",
  "task.status": "Status",
  "task.priority": "Priority",
  "task.assignees": "Assignees",
  "task.due": "Due",
  "task.start": "Starts",
  "task.estimate": "Estimate",
  "task.tags": "Tags",
  "task.description": "Description",
  "task.comments": "Comments",
  "task.activity": "Activity",
  "task.files": "Files",
  "task.time": "Time",
  "task.markDone": "Mark done",
  "task.noDueDate": "No due date",
  "task.milestone": "Milestone",

  "status.todo": "To do",
  "status.in_progress": "In progress",
  "status.review": "In review",
  "status.done": "Done",
  "status.blocked": "Blocked",

  "priority.urgent": "Urgent",
  "priority.high": "High",
  "priority.medium": "Medium",
  "priority.low": "Low",

  /* ------------------------------ views ------------------------------ */
  "view.list": "List",
  "view.board": "Board",
  "view.calendar": "Calendar",
  "view.gantt": "Gantt",
  "view.chat": "Chat",
  "view.scoreboard": "Scoreboard",

  /* ---------------------------- scoring ------------------------------ */
  "score.points": "points",
  "score.thisWeek": "This week",
  "score.thisMonth": "This month",
  "score.allTime": "All time",
  "score.finished": "finished",
  "score.onTime": "on time",
  "score.thank": "Thank",
  "score.kudosLeft": "{count} kudos left this week",
  "score.howItWorks": "How points work",
  "score.whatEarns": "What earns points",
  "score.recentlyEarned": "Recently earned",
  "view.saveThis": "Save this view",
  "view.saved": "Saved views",
  "view.shared": "Shared with the team",
  "view.private": "Only me",

  /* ---------------------------- projects ----------------------------- */
  "project.one": "project",
  "project.many": "projects",
  "project.new": "New project",
  "project.members": "Members",
  "project.progress": "Project progress",
  "project.columns": "Board columns",

  "space.one": "space",
  "space.many": "spaces",
  "space.new": "New space",
  "space.share": "Copy a link to this space",
  "space.waiting": "Waiting on you",
  "space.review": "Review",
  "space.approve": "Approve",
  "space.decline": "Decline",

  /* ----------------------------- people ------------------------------ */
  "permission.admin": "Admin",
  "permission.editor": "Editor",
  "permission.commenter": "Commenter",
  "permission.viewer": "Viewer",
  "permission.adminSummary": "Full control, including members and settings",
  "permission.editorSummary": "Can create and change content",
  "permission.commenterSummary": "Can view and comment, but not change",
  "permission.viewerSummary": "Read-only",

  /* ------------------------------ empty ------------------------------ */
  "empty.noTasks": "No tasks yet",
  "empty.noTasksBody": "Add the first one and it will appear here.",
  "empty.noMatches": "Nothing matches those filters",
  "empty.noMatchesBody": "Clear them to see everything again.",
} as const;

export type MessageKey = keyof typeof en;
