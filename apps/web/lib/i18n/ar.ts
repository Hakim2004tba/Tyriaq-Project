import type { MessageKey } from "./en";

/**
 * Arabic.
 *
 * Written as a product is written, not as English is translated. A few
 * choices worth recording, because the next person will wonder:
 *
 *   · "مهمة" for task, not "مهمّة عمل" — shorter reads better in a list.
 *   · "مساحة" for space and "مشروع" for project, which is what Algerian
 *     and Gulf teams already say in the office.
 *   · Statuses are verb-free noun phrases ("قيد التنفيذ"), because they
 *     appear as column headings where a verb reads as an instruction.
 *   · No transliteration of English words that have ordinary Arabic
 *     ones. "تصدير" not "إكسبورت".
 *
 * Any key missing here falls back to English rather than showing a raw
 * key — half-translated is a real state during a rollout, and `nav.home`
 * appearing in a sidebar is worse than "Home".
 */
export const ar: Partial<Record<MessageKey, string>> = {
  /* ------------------------------ shell ------------------------------ */
  "nav.home": "الرئيسية",
  "nav.myTasks": "مهامي",
  "nav.projects": "المشاريع",
  "nav.calendar": "التقويم",
  "nav.documents": "المستندات",
  "nav.whiteboards": "السبورات",
  "nav.goals": "الأهداف",
  "nav.reports": "التقارير",
  "nav.chat": "المحادثة",
  "nav.inbox": "الوارد",
  "nav.spaces": "المساحات",
  "nav.soon": "قريباً",
  "nav.create": "إنشاء",
  "nav.search": "ابحث عن مهمة أو مستند أو شخص…",
  "nav.profile": "الملف الشخصي",
  "nav.people": "الأشخاص والصلاحيات",
  "nav.billing": "الخطة والفوترة",
  "nav.signOut": "تسجيل الخروج",
  "nav.language": "اللغة",

  /* ----------------------------- common ------------------------------ */
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.close": "إغلاق",
  "common.done": "تم",
  "common.add": "إضافة",
  "common.remove": "إزالة",
  "common.search": "بحث",
  "common.filter": "تصفية",
  "common.export": "تصدير إلى CSV",
  "common.loading": "جارٍ التحميل…",
  "common.nothingHere": "لا شيء هنا بعد",

  /* ------------------------------ tasks ------------------------------ */
  "task.one": "مهمة",
  "task.many": "مهام",
  "task.new": "مهمة جديدة",
  "task.add": "إضافة مهمة",
  "task.title": "اسم المهمة، ثم Enter — Escape للإنهاء",
  "task.subtask": "مهمة فرعية، ثم Enter",
  "task.addSubtask": "إضافة مهمة فرعية",
  "task.status": "الحالة",
  "task.priority": "الأولوية",
  "task.assignees": "المكلَّفون",
  "task.due": "الاستحقاق",
  "task.start": "البداية",
  "task.estimate": "التقدير",
  "task.tags": "الوسوم",
  "task.description": "الوصف",
  "task.comments": "التعليقات",
  "task.activity": "النشاط",
  "task.files": "الملفات",
  "task.time": "الوقت",
  "task.markDone": "وضع علامة تم",
  "task.noDueDate": "بلا تاريخ",
  "task.milestone": "معلَم",

  "status.todo": "للتنفيذ",
  "status.in_progress": "قيد التنفيذ",
  "status.review": "قيد المراجعة",
  "status.done": "منجز",
  "status.blocked": "متوقف",

  "priority.urgent": "عاجل",
  "priority.high": "مرتفعة",
  "priority.medium": "متوسطة",
  "priority.low": "منخفضة",

  /* ------------------------------ views ------------------------------ */
  "view.list": "قائمة",
  "view.board": "لوحة",
  "view.calendar": "تقويم",
  "view.gantt": "مخطط زمني",
  "view.chat": "محادثة",
  "view.saveThis": "حفظ هذا العرض",
  "view.saved": "العروض المحفوظة",
  "view.shared": "مشترك مع الفريق",
  "view.private": "لي وحدي",

  /* ---------------------------- projects ----------------------------- */
  "project.one": "مشروع",
  "project.many": "مشاريع",
  "project.new": "مشروع جديد",
  "project.members": "الأعضاء",
  "project.progress": "تقدّم المشروع",
  "project.columns": "أعمدة اللوحة",

  "space.one": "مساحة",
  "space.many": "مساحات",
  "space.new": "مساحة جديدة",
  "space.share": "نسخ رابط لهذه المساحة",
  "space.waiting": "بانتظارك",
  "space.review": "مراجعة",
  "space.approve": "قبول",
  "space.decline": "رفض",

  /* ----------------------------- people ------------------------------ */
  "permission.admin": "مدير",
  "permission.editor": "محرِّر",
  "permission.commenter": "معلِّق",
  "permission.viewer": "مشاهد",
  "permission.adminSummary": "تحكّم كامل، بما في ذلك الأعضاء والإعدادات",
  "permission.editorSummary": "يستطيع الإنشاء والتعديل",
  "permission.commenterSummary": "يستطيع المشاهدة والتعليق دون تعديل",
  "permission.viewerSummary": "قراءة فقط",

  /* ------------------------------ empty ------------------------------ */
  "empty.noTasks": "لا مهام بعد",
  "empty.noTasksBody": "أضف الأولى وستظهر هنا.",
  "empty.noMatches": "لا شيء يطابق هذه التصفية",
  "empty.noMatchesBody": "امسحها لترى كل شيء من جديد.",
};
