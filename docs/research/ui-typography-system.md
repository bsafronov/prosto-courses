# Система глобальной семантической типографики

> Историческое исследование для superseded Tailwind-решения. Актуальная plain-CSS
> рекомендация: [«Типографическая шкала без Tailwind CSS»](./plain-css-typography-scale.md).

Дата обзора: 2026-07-31.

## Вопрос

Какую минимальную типографическую систему стоит принять при переходе приложения
на Tailwind CSS v4, чтобы весь интерфейс использовал одни смысловые роли, а
компоненты не создавали собственные размеры, интервалы и начертания?

## Краткий вывод

Для приложения достаточно семи ролей: `meta`, `supporting`, `body`, `reading`,
`component-title`, `section-title`, `page-title`. Это меньше публичных шкал
Material 3 и USWDS и сопоставимо с основным набором GOV.UK. Важнее количества
правило владения: роль задаёт `font-size`, `line-height` и `font-weight` целиком,
а компонент только выбирает роль.

Обычный текст карточки не получает отдельную роль или размер. Он наследует
контекст: `body` в интерфейсе и `reading` внутри урока. Явно назначаются только
смысловые исключения — метаданные, supporting-текст и заголовки.

`muted` остаётся цветовой ролью, не размером текста. Описание или подсказка обычно
сочетает `supporting` и `muted`, но, например, отключённый обычный текст может быть
`muted` и при этом оставаться `body`.

## Рекомендуемая шкала

Все значения размера и line-height взяты из стандартных пар Tailwind. Tailwind
задаёт их в `rem`, а в таблице рядом приведён эквивалент при корневом размере
`16px` ([Tailwind: font size](https://tailwindcss.com/docs/font-size)).

| Роль | Назначение | Размер / line-height | Weight |
| --- | --- | --- | --- |
| `type-meta` | eyebrow, дата, краткая техническая метка | `0.75rem / 1rem` (`12/16px`) | `500` |
| `type-supporting` | описание, helper, caption, privacy note | `0.875rem / 1.25rem` (`14/20px`) | `400` |
| `type-body` | обычный UI-текст и controls | `1rem / 1.5rem` (`16/24px`) | `400` |
| `type-reading` | корень длинного учебного текста | `1.125rem / 1.75rem` (`18/28px`) | `400` |
| `type-component-title` | заголовок карточки или компактного блока | `1.25rem / 1.75rem` (`20/28px`) | `600` |
| `type-section-title` | заголовок крупного раздела | `1.875rem / 2.25rem` (`30/36px`) | `600` |
| `type-page-title` | единственный главный заголовок страницы | `2.25rem / 2.5rem` (`36/40px`), с `md` — `3rem / 3rem` (`48/48px`) | `600` |

`12px` и `14px` допустимы только для короткого сопроводительного текста. USWDS
рекомендует не меньше эффективных `16px` для основной массы текста и оставляет
меньшие размеры captions, footnotes и специализированному UI
([USWDS: Typography](https://designsystem.digital.gov/components/typography/)).
Carbon аналогично отделяет `14px` helper/label от body и объединяет размер,
line-height и weight в именованные type styles
([Carbon: Type sets](https://carbondesignsystem.com/elements/typography/type-sets/),
[Carbon: Code](https://carbondesignsystem.com/elements/typography/code/)).

Weights намеренно ограничены `400`, `500`, `600`; `700` остаётся для настоящего
`strong` и особо важных actions. Дробные локальные weights вроде `650`, `720`,
`750` и `850` не становятся токенами.

## Почему `body` и `reading` различаются

Это не универсальное требование: Carbon, например, различает короткий и длинный
expressive body прежде всего line-height (`16/22` и `16/24`). Но для учебного
приложения отдельный контекст `reading = 18/28` оправдан:

- `18px` находится внутри рекомендованного USWDS диапазона `16–20px` для running
  text;
- `28/18 = 1.56` даёт более свободный ритм длительного чтения; USWDS советует для
  extended reading самый свободный основной line-height token `1.62`
  ([USWDS: Line height](https://designsystem.digital.gov/design-tokens/typesetting/line-height/));
- размер назначается один раз контейнеру урока, поэтому обычный текст внутри и
  снаружи вложенной карточки остаётся одинаковым;
- вместе с ролью нужен отдельный глобальный `measure-reading` около `65ch`:
  USWDS называет хорошей целью для длинного текста около 66 символов в строке
  ([USWDS: Typography](https://designsystem.digital.gov/components/typography/)).

`type-reading` — роль контекста, а не класс каждого `<p>`. Карточка не должна
сбрасывать её обратно в `body`; только её title, supporting и meta получают явные
роли.

## Responsive-стратегия

Адаптивен только `page-title`: `36/40px` mobile-first, `48/48px` начиная с одного
общего `md` breakpoint. GOV.UK тоже уменьшает крупные заголовки на узких экранах,
а размер `80px` считает исключительным; его обычный `heading-xl` меняется с
`32/35px` на `48/50px`
([GOV.UK: Type scale](https://design-system.service.gov.uk/styles/type-scale/)).
Carbon разрешает fluid headings прежде всего веб-страницам и не рекомендует их
внутри контейнеров
([Carbon: Type sets](https://carbondesignsystem.com/elements/typography/type-sets/)).

Поэтому прежняя идея `36 → 60 → 96px` слишком широка для общей роли учебного
приложения. `60/60px` можно добавить позднее в ту же роль только после проверки
конкретного hero; `96px` не входит в базовую систему.

Breakpoints должны быть mobile-first и выражены в `rem`, как у Tailwind
([Tailwind: Responsive design](https://tailwindcss.com/docs/responsive-design)).
Viewport units не должны быть единственным основанием размера текста: W3C
описывает такой подход как возможный отказ resize/zoom
([WCAG failure F94](https://www.w3.org/WAI/WCAG22/Techniques/failures/F94)).

## Tailwind — не строгая 4px-сетка шрифтов

Базовый spacing-шаг Tailwind равен `0.25rem`, но стандартная type scale намеренно
содержит `14px`, `18px` и `30px`. Поэтому правило проекта должно звучать так:

- layout spacing и line-height используют шаг `0.25rem`;
- font-size использует только выбранные точки стандартной Tailwind type scale;
- произвольные размеры вроде `1.2rem`, `.88rem` и `1.05rem` запрещены.

Так сохраняется Tailwind-шкала без искусственного удаления полезных `14px` и
`18px`.

## Как не допустить новых компонентных вариантов

1. В Tailwind v4 сбросить стандартный namespace через `--text-*: initial` и
   определить только семь семантических `--text-*` tokens. Tailwind позволяет
   каждому font-size token сразу задать default line-height, letter-spacing и
   weight; сброс namespace удаляет остальные сгенерированные utilities
   ([Tailwind: Theme variables](https://tailwindcss.com/docs/theme),
   [Tailwind: Font size customization](https://tailwindcss.com/docs/font-size#customizing-your-theme)).
2. Публиковать компоненты только через composite utilities `type-*`. Не разрешать
   компоненту добавлять `text-[…]`, `leading-[…]`, локальный `font-size`,
   `line-height` или нестандартный `font-weight`.
3. `body` и `reading` назначать корневым контекстам. Внутренний обычный текст
   наследует их; дочерние компоненты не повторяют размер.
4. Не связывать HTML-уровень заголовка с визуальной ролью. Семантический `<h2>`
   может получить `type-component-title`, если такова его роль в структуре.
   GOV.UK также разделяет heading tag и визуальный heading class
   ([GOV.UK: Headings](https://design-system.service.gov.uk/styles/headings/)).
5. Новый token добавляется только после доказанного повторяемого случая минимум
   в двух разных контекстах и решения на уровне design system, не внутри PR одного
   компонента. Для новых компонентов сначала берётся существующая роль — тот же
   принцип явно требует GOV.UK
   ([GOV.UK: Type scale](https://design-system.service.gov.uk/styles/type-scale/)).
6. Закрепить правило статической проверкой: вне файла design system запрещены
   `font-size`, `line-height`, arbitrary typography utilities и weights вне
   разрешённого набора. Исключение — технические подписи внутри SVG/canvas, если
   их геометрия требует точного размера; исключение документируется рядом.

Material 3 показывает ценность такой границы: его компоненты получают глобальные
семантические typography roles из theme, а документация отдельно отмечает, что
продукту необязательно использовать все 15 доступных стилей
([Material 3: Typography](https://developer.android.com/develop/ui/compose/designsystems/material3#typography)).

## Проверки доступности

Конкретный исходный `16px` не является нормой WCAG. Нормы требуют другого:

- текст увеличивается до `200%` без потери содержания и функций
  ([WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text));
- при ширине, эквивалентной `320 CSS px`, обычный вертикальный контент reflow без
  двумерной прокрутки
  ([WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow));
- layout не ломается, когда пользователь выставляет line-height `1.5×`, paragraph
  spacing `2×`, letter spacing `0.12×`, word spacing `0.16×`. Это проверка
  устойчивости к override, а не требование использовать эти значения по умолчанию
  ([WCAG 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)).

Tailwind выражает шкалу в `rem`, что соответствует W3C-технике относительного
масштабирования текста
([Technique C14](https://www.w3.org/WAI/WCAG22/Techniques/css/C14)). После миграции
нужны браузерные проверки при `320px`, `200%` text zoom и с injected text-spacing
override, а не только сравнение computed font sizes.

## Статус вывода

Эта исследовательская рекомендация легла в основу
[ADR-0008](../adr/0008-use-tailwind-for-the-global-ui-system.md). Она не меняет
production-код или доменную документацию; реализация остаётся одной атомарной
миграцией дизайн-системы.
