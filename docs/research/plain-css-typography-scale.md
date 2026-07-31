# Типографическая шкала без Tailwind CSS

Дата обзора: 2026-08-01.

## Вопрос

Нужно ли сохранять нынешние крупные выразительные заголовки или уменьшить их при
переходе к централизованной дизайн-системе на обычном CSS? Какая семантическая
шкала подходит учебной Astro-платформе и как проверить её доступность?

## Решение

Общие заголовки нужно нормализовать, но характер интерфейса сохраняется отдельной
редкой ролью `display`:

- Course Overview, Lesson, Module, Checkpoint, Capstone и служебные страницы
  используют `page-title`: `32px` на узком экране и `48px` на широком;
- только короткий главный hero каталога может использовать `display`: `40px` и
  `64px` соответственно;
- учебный текст остаётся крупнее интерфейсного: `18px` против `16px`;
- размер, line-height и основной weight выбираются одной семантической ролью, а
  не независимо внутри компонента.

Это осознанное уменьшение, не нейтральное сохранение текущего вида. Сейчас
заголовки доходят до `6.4rem` (`102.4px` при стандартных `16px`) на главной и до
`6rem` (`96px`) на Course Overview, а служебный текст местами уменьшается до
`.58rem` (`9.28px`). См. [главную страницу](../../src/pages/index.astro),
[Course Overview](../../src/pages/courses/[course].astro) и
[CourseOutline](../../src/components/CourseOutline.astro). Такой диапазон
превращает исключительный display-size в обычный page-title и одновременно
создаёт слишком много почти одинаковых мелких размеров.

Рекомендация опирается не на шкалу CSS-фреймворка:

- GOV.UK использует `32px` на малом экране и `48px` на большом для обычного
  `heading-xl`; точка `80px` помечена как исключительная. Система советует сначала
  брать существующий типографический стиль и добавлять новый только в точке общей
  шкалы ([GOV.UK: type scale](https://design-system.service.gov.uk/styles/type-scale/)).
- Стандартная тема USWDS заканчивает основной набор size tokens на `48px`, хотя
  расширенный системный набор допускает `56`, `64` и `80px`. Значит, `64px`
  уместен как намеренная display-роль, но не как размер каждого `h1`
  ([USWDS: font-size tokens](https://designsystem.digital.gov/design-tokens/typesetting/font-size/)).
- USWDS рекомендует эффективный размер не меньше `16px` для большей части текста,
  диапазон `16–20px` для running text и меньшие размеры только для коротких
  captions, footnotes и специализированного UI
  ([USWDS: typography](https://designsystem.digital.gov/components/typography/)).

WCAG не задаёт универсальный исходный размер в пикселях. Он проверяет возможность
увеличения, reflow, переопределения интервалов и контраст. Поэтому сама шкала —
продуктовое решение, которое нужно проверять с фактическим Onest, русским текстом
и реальными компонентами.

## Семантическая шкала

Эквиваленты в пикселях ниже приведены только для привычного корневого размера
`16px`. В CSS используются `rem`; проект не должен назначать `font-size` для
`html`, чтобы не подменять пользовательский размер шрифта. W3C определяет `rem`
относительно размера шрифта корневого элемента
([CSS Values and Units](https://www.w3.org/TR/css-values-4/#font-relative-lengths)).

| Роль | Назначение | Узкий экран | От `40rem` | Line-height | Weight |
| --- | --- | --- | --- | --- | --- |
| `type-meta` | короткая дата, номер, eyebrow, подпись графика | `.75rem` / `12px` | без изменения | `1.4` | `500` |
| `type-supporting` | caption, helper, privacy note, вторичное описание | `.875rem` / `14px` | без изменения | `1.4` | `400` |
| `type-body` | UI, controls, короткие абзацы | `1rem` / `16px` | без изменения | `1.5` | `400` |
| `type-reading` | длинный учебный текст | `1.125rem` / `18px` | без изменения | `1.6` | `400` |
| `type-component-title` | Card, Practice Task, компактный блок | `1.25rem` / `20px` | без изменения | `1.4` | `600` |
| `type-section-title` | крупный раздел страницы | `1.75rem` / `28px` | `2.25rem` / `36px` | `1.15` | `600` |
| `type-page-title` | единственный основной заголовок обычной страницы | `2rem` / `32px` | `3rem` / `48px` | `1.1` | `600` |
| `type-display` | только короткий hero каталога | `2.5rem` / `40px` | `4rem` / `64px` | `1.05` | `600` |

Размеры — выбранное подмножество системных точек USWDS `12, 14, 16, 18, 20,
28, 32, 36, 40, 48, 64px`, а не Tailwind defaults. `type-meta` допустим только
для короткой неинтерактивной информации; label кнопки, input или единственная
инструкция не должны опускаться ниже `type-body`. `type-supporting` также не
предназначен для длинного чтения.

Unitless line-height масштабируется вместе с размером роли. Для extended reading
USWDS рекомендует минимум `1.5` и выделяет `1.62` как хорошую точку; `1.6` здесь
округляет эту рекомендацию и близок нынешнему свободному ритму уроков
([USWDS: line height](https://designsystem.digital.gov/design-tokens/typesetting/line-height/)).
Длинный учебный текст получает `max-inline-size: 65ch`: USWDS считает хорошей
целью около 66 символов, при общем читаемом диапазоне 45–90
([USWDS: measure](https://designsystem.digital.gov/components/typography/#measure-line-length)).

Типографическая шкала не обязана повторять spacing-шкалу `4px`. Официальные
системы тоже отделяют эти решения: USWDS содержит точки `13`, `14`, `17`, `18` и
`22px`, а GOV.UK использует собственные пары font-size/line-height. Шаг `4px`
остаётся правилом layout spacing; у текста важны метрики шрифта, длина строки и
назначение роли.

Weights ограничиваются реально загружаемыми `400`, `500`, `600`, `700`:

- `400` — обычный текст;
- `500` — meta и спокойный акцент;
- `600` — заголовки;
- `700` — `strong`, ошибки и сильное действие, но не новая size-role.

Сейчас BaseLayout действительно загружает только эти четыре начертания, хотя
локальный CSS запрашивает `650`, `720`, `750`, `800`, `850`
([BaseLayout](../../src/layouts/BaseLayout.astro)). При отсутствии точного face
браузер выбирает ближайший доступный weight, поэтому эти числа не дают надёжной
дополнительной иерархии
([CSS Fonts 4: missing weights](https://www.w3.org/TR/css-fonts-4/#missing-weights)).

## Responsive-правило

Только `section-title`, `page-title` и `display` меняют размер. Один
mobile-first breakpoint `40rem` совпадает с проверенной границей GOV.UK `640px`;
body, supporting, Card title и учебный текст не уменьшаются ради узкого экрана.

Для базовой системы лучше две дискретные `rem`-точки, а не нынешние
`clamp(..., vw, ...)`. Это делает иерархию предсказуемой, не связывает чтение с
шириной viewport и упрощает проверку zoom. WCAG отдельно фиксирует возможный
провал resize, когда размер текста неверно основан на viewport units
([WCAG failure F94](https://www.w3.org/WAI/WCAG22/Techniques/failures/F94)).
Fluid display можно вернуть позже только как проверенное исключение с
`rem`-границами; он не должен порождать новую общую шкалу.

HTML-уровень и визуальная роль остаются разными контрактами. Правильные `h1–h6`
описывают структуру документа; класс описывает вид. GOV.UK применяет heading
classes отдельно от heading tags и требует accessibility testing для необычной
визуальной иерархии
([GOV.UK: headings](https://design-system.service.gov.uk/styles/headings/)).

## Кодирование в обычном CSS

Один центральный файл владеет значениями, второй — составными ролями. Компоненты
используют роль и не переопределяют её части. CSS custom properties специально
предназначены для именованного повторного использования и распространения одного
изменения на все потребители
([CSS Custom Properties](https://www.w3.org/TR/css-variables-1/#intro)).

```css
/* tokens.css */
:root {
  --font-ui: "Onest", ui-sans-serif, system-ui, sans-serif;
  --font-code: "IBM Plex Mono", ui-monospace, monospace;

  --type-meta-size: .75rem;
  --type-meta-leading: 1.4;
  --type-meta-weight: 500;
  --type-supporting-size: .875rem;
  --type-supporting-leading: 1.4;
  --type-supporting-weight: 400;
  --type-body-size: 1rem;
  --type-body-leading: 1.5;
  --type-body-weight: 400;
  --type-reading-size: 1.125rem;
  --type-reading-leading: 1.6;
  --type-reading-weight: 400;
  --type-component-title-size: 1.25rem;
  --type-component-title-leading: 1.4;
  --type-component-title-weight: 600;
  --type-section-title-size: 1.75rem;
  --type-page-title-size: 2rem;
  --type-display-size: 2.5rem;
  --type-section-title-leading: 1.15;
  --type-page-title-leading: 1.1;
  --type-display-leading: 1.05;
  --type-title-weight: 600;
  --type-strong-weight: 700;
  --measure-reading: 65ch;
}

/* typography.css */
.type-body {
  font-size: var(--type-body-size);
  line-height: var(--type-body-leading);
  font-weight: var(--type-body-weight);
}

.type-reading {
  max-inline-size: var(--measure-reading);
  font-size: var(--type-reading-size);
  line-height: var(--type-reading-leading);
  font-weight: var(--type-reading-weight);
}

.type-component-title {
  font-size: var(--type-component-title-size);
  line-height: var(--type-component-title-leading);
  font-weight: var(--type-component-title-weight);
}

.type-page-title {
  font-size: var(--type-page-title-size);
  line-height: var(--type-page-title-leading);
  font-weight: var(--type-title-weight);
}

@media (min-width: 40rem) {
  :root {
    --type-section-title-size: 2.25rem;
    --type-page-title-size: 3rem;
    --type-display-size: 4rem;
  }
}
```

В production-файле должны быть также полные правила `meta`, `supporting`,
`section-title` и `display`; фрагмент сокращён, чтобы показать структуру, а не
создать альтернативную реализацию.

Правила владения:

1. `body` назначается корню UI-контекста, `reading` — корню lesson prose; обычные
   потомки наследуют роль.
2. `Card.astro` сам назначает `component-title`, `supporting` и body своим
   анатомическим частям. Все Card variants получают одинаковую иерархию.
3. `muted` — только цвет, не меньший font-size. `mono` — семейство, не размер.
4. В component-scoped CSS запрещены raw `font-size`, `line-height` и произвольные
   weights. Уникальная композиция может использовать только semantic role.
5. SVG/график не получает отдельную шкалу: подписи используют `meta` или
   `supporting` tokens. Геометрически неизбежное исключение документируется.
6. Новая роль появляется только после повторяющейся задачи минимум в двух
   независимых контекстах и визуальной проверки всей шкалы.

## Критерии доступности и browser QA

WCAG 2.2 задаёт результат, а не конкретный framework:

- при увеличении текста до `200%` нет обрезки, перекрытия или потери функций
  ([WCAG 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text));
- при ширине, эквивалентной `320 CSS px`, обычные страницы не требуют прокрутки в
  двух направлениях
  ([WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow));
- injected override `line-height: 1.5`, paragraph spacing `2em`, letter spacing
  `.12em`, word spacing `.16em` не скрывает контент и функции
  ([WCAG 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing));
- текст имеет контраст минимум `4.5:1`, либо `3:1` только когда действительно
  достигает WCAG large-text threshold; проверяются обе темы
  ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)).

Обязательная матрица перед принятием шкалы:

1. Chrome/Chromium, Firefox и Safari/WebKit; текущий Playwright config запускает
   только Chrome, поэтому остальные движки требуют отдельного прогона или ручной
   проверки.
2. Viewports `320`, `375`, `768`, `1280px`; zoom `100%`, `200%`, а также reflow
   `1280px` при `400%`.
3. Стандартный browser font size и увеличенный пользовательский default; `rem`
   должен увеличивать все роли без локальной компенсации.
4. Загруженный Onest и отказ webfont с системным fallback. Ни один Card, control,
   sticky header, chart label или заголовок не обрезается фиксированной высотой.
5. Реальные русские длинные Course/Lesson titles, смешанный русский/латиница/code,
   Card grid, lesson prose, Knowledge Check, Chart и offline page.
6. Автоматическая contract-проверка: вне центрального typography-файла нет raw
   `font-size`, `line-height`, `font` shorthand или weights вне `400/500/600/700`;
   computed styles ключевых ролей равны разрешённым tokens на обеих ширинах.

Acceptance для `display`: короткий hero сохраняет выраженный акцент, но при
`320px`, `200%` и text-spacing override полностью виден и не вытесняет основное
действие за недоступную фиксированную область. Если условие не выполняется,
используется `page-title`, а не локально уменьшенный display.

## Отношение к предыдущему исследованию

[Предыдущий обзор](./ui-typography-system.md) правильно выделил семантические
роли, `18px` для чтения, ограниченную систему weights и accessibility-проверки.
Однако размеры там были обоснованы Tailwind defaults, а `page-title` одновременно
должен был обслуживать обычные страницы и выразительные hero. Этот обзор сохраняет
полезные роли, выводит значения из независимых design systems и отделяет редкий
`display` от обычного `page-title`.

Документ фиксирует исследовательскую рекомендацию. Он не меняет production CSS и
сам по себе не заменяет ADR о централизованной plain-CSS дизайн-системе.
