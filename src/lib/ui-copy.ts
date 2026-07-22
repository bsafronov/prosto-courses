export type LessonState = "not-started" | "started" | "completed";

export const lessonStatusCopy: Record<
  LessonState,
  { icon: string; label: string }
> = {
  "not-started": { icon: "○", label: "Не начат" },
  started: { icon: "◐", label: "В процессе" },
  completed: { icon: "✓", label: "Завершён" },
};

export const lessonStatusAriaLabel = (label: string) =>
  `Статус урока: ${label}`;

export const courseActionCopy = {
  start: "Начать курс",
  continue: "Продолжить курс",
  review: "Освежить знания",
} as const;

export const completionActionCopy = {
  complete: "Завершить урок",
  reopen: "Вернуть в работу",
} as const;
