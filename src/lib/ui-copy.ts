import type { CoreDestinationKind } from "./courses";

export type ProgressState = "not-started" | "started" | "completed";

export const progressStatusCopy: Record<
  ProgressState,
  { icon: string; label: string }
> = {
  "not-started": { icon: "○", label: "Не начат" },
  started: { icon: "◐", label: "В процессе" },
  completed: { icon: "✓", label: "Завершён" },
};

const destinationStatusName: Record<CoreDestinationKind, string> = {
  lesson: "урока",
  checkpoint: "проверки Модуля",
  capstone: "итоговой работы",
};

export const progressStatusAriaLabel = (
  kind: CoreDestinationKind,
  label: string,
) => `Статус ${destinationStatusName[kind]}: ${label}`;

export const courseActionCopy = {
  start: "Начать курс",
  continue: "Продолжить курс",
  review: "Освежить знания",
} as const;

export const courseStatusCopy: Record<ProgressState, string> = {
  "not-started": "Не начат",
  started: "В процессе",
  completed: "Завершён",
};

export const completionControlCopy: Record<
  CoreDestinationKind,
  { heading: string; description: string; complete: string }
> = {
  lesson: {
    heading: "Завершение урока",
    description:
      "Ты сам решаешь, когда завершить урок. Ответы в блоке «Проверь себя» на это не влияют.",
    complete: "Завершить урок",
  },
  checkpoint: {
    heading: "Завершение проверки Модуля",
    description:
      "Ты сам решаешь, когда завершить проверку Модуля. Эта отметка не оценивает качество работы и не ограничивает переходы.",
    complete: "Завершить проверку Модуля",
  },
  capstone: {
    heading: "Завершение итоговой работы",
    description:
      "Ты сам решаешь, когда завершить итоговую работу. Эта отметка не является оценкой, сертификатом или подтверждением мастерства.",
    complete: "Завершить итоговую работу",
  },
};

export const reopenActionCopy = "Вернуть в работу";
