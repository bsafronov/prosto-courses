# Course authoring contract

An Authoring Agent creates content only through this provider-independent contract. It needs no provider SDK, prompt interface, or generation script. Do not import layouts, navigation, progress controls, styles, or application components. The platform applies those concerns automatically.

## Directory convention

Create one self-contained directory under `src/content/courses/`:

```text
src/content/courses/<course-slug>/
├── index.mdx
└── lessons/
    ├── <lesson-slug>.mdx
    └── <another-lesson-slug>.mdx
```

The directory name is the stable Course slug. Each Lesson filename, without `.mdx`, is its stable Lesson slug. Use lowercase URL-safe names with hyphens. Keep a slug when editing title, content, or order so existing browser-local Lesson Progress survives. Use a new slug only when the Course or Lesson is fundamentally replaced.

## Required metadata

`index.mdx` requires a title, concise summary, and at least one Learning Outcome:

```mdx
---
title: Понятное название курса
summary: Одно короткое предложение, которое помогает решить, стоит ли открыть курс.
outcomes:
  - Объяснить основную идею
  - Применить её в реалистичном примере
---

Здесь можно добавить вводный текст о курсе.
```

The platform and every Course are Russian-language. Do not add a `language`
field; the platform sets the document language globally.

Every file in `lessons/` requires a title and an integer order:

```mdx
---
title: Короткое и точное название урока
order: 1
---

Здесь находится содержание урока.
```

A Course must contain at least one Lesson. Orders must be unique and contiguous from `1`; reordering only requires editing these values.

## Semantic MDX components

`KnowledgeCheck` is available without an import. It represents exactly one formative, single-choice question:

```mdx
<KnowledgeCheck
  prompt="Какой вариант лучше всего применяет эту идею?"
  options={["Первый ответ", "Второй ответ", "Третий ответ"]}
  answer="Второй ответ"
  explanation="Второй ответ применяет идею, потому что…"
/>
```

All four props are required and static. `options` must be a JSON array containing at least two unique, non-empty strings. `answer` must exactly equal one option. `explanation` appears after every attempt. Knowledge Check answers are not persisted, graded, or connected to Lesson Completion.

## Content quality

- Write all learner-facing content in Russian and address the learner as `ты` in a friendly, encouraging voice.
- Give each Lesson one clear focus. Begin with the learner need, introduce ideas before using them, organize headings in order, and keep paragraphs easy to scan.
- State Learning Outcomes as observable knowledge or ability.
- Put a Knowledge Check near the explanation it reinforces. Write one unambiguous correct answer and plausible alternatives.
- Explain why the correct answer is correct; do not merely repeat it.
- Use descriptive link text and fenced code blocks with language identifiers.
- Do not add presentation markup, custom scripts, imports, grades, Progression Locks, or provider-specific generation instructions.

The Russian `markdown` Course is the canonical copyable example.

## Validation

Run the public authoring validation entry point before committing:

```sh
pnpm validate
```

It rejects malformed or language-specific metadata, Lessons outside an owning Course directory, empty Courses, invalid Lesson order, and invalid Knowledge Checks with file-specific messages. `pnpm build` always runs the same validation before producing the static site.
