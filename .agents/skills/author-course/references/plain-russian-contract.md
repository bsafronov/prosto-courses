# Operational contract: понятный учебный текст на русском

Этот файл — обязательная выжимка для authoring и audit. Его критерий — результат у конкретного Learner Profile: ученик находит нужную идею, пересказывает связь своими словами, применяет её в похожем случае и переносит в изменённый. Гладкость, длина предложения и отсутствие отдельных слов этого не доказывают.

## Содержание

- [Сохранить полезную трудность](#сохранить-полезную-трудность)
- [Собрать объяснение](#собрать-объяснение)
- [Писать русский из смысла](#писать-русский-из-смысла)
- [Строить paragraph и segment](#строить-paragraph-и-segment)
- [Вводить термины](#вводить-термины)
- [Управлять русско-английской границей](#управлять-русско-английской-границей)
- [Превратить объяснение в обучение](#превратить-объяснение-в-обучение)
- [Сохранить Course Voice](#сохранить-course-voice)
- [Провести раздельные passes](#провести-раздельные-passes)

## Сохранить полезную трудность

Сними трудность, созданную плохим порядком, скрытой логикой, неизвестными частями, калькой и лишними деталями. Сохрани точность, причинность, необходимые термины, реальные ограничения и самостоятельное усилие ученика.

Объяснение достаточно простое, когда Learner Profile может рассуждать и действовать точно. Course Depth означает достаточное causal understanding, application, boundary recognition и trade-off reasoning, а не максимум подробностей.

## Собрать объяснение

Используй минимальный spine, нужный конкретной capability:

1. **Задача.** Начни с реальной ситуации, вопроса или решения ученика.
2. **Короткий ответ.** Дай самый короткий точный вывод рано.
3. **Опора.** Активируй только prerequisite knowledge, без которого следующая связь не строится.
4. **Части.** Назови необходимые objects и одной фразой объясни роль каждого.
5. **Модель.** Покажи cause, condition, consequence, contrast и exception явными связями.
6. **Полный пример.** Покажи context/goal, initial data, consequential steps, reason каждого шага, intermediate check, interpreted result и applicability boundary.
7. **Контраст.** Измени один важный признак: покажи nearby non-example, misconception или boundary case.
8. **Действие.** Дай partial completion, затем independent familiar case и changed/ambiguous transfer.
9. **Feedback.** Объясни evidence, cause, correction и next attempt.
10. **Возврат.** Позже потребуй recall и применение без копирования исходной формулировки.

Функции spine не требуют одинаковых заголовков или фиксированного порядка в каждом Lesson. Выбирай минимальное объяснение, которое сохраняет точную модель и transfer.

## Писать русский из смысла

Сначала установи claim, intent, facts, logical relations, conditions и boundaries источника. Затем отложи исходную фразу и напиши мысль так, как её естественно сформулировал бы русский автор. После правки сверь каждый факт, условие, степень уверенности и границу применимости с источником.

Для предложения используй рабочую рамку:

> Кто делает? Что делает? С чем? При каком условии? Что из этого следует?

- Ставь видимого actor рядом с finite verb и object, когда actor известен и важен.
- Выбирай active voice, когда он проясняет действие. Выбирай passive, когда результат важнее actor или active звучит хуже.
- Возвращай действие из abstract noun в verb: `провести проверку` → `проверить`, если noun не является точным domain term.
- Развязывай длинные noun/genitive chains через verb, preposition или отдельное предложение.
- Держи одну main assertion в предложении. Новый subject, condition, exception или conclusion обычно получает новое предложение.
- Держи связанные actor, action и object достаточно близко; выноси длинные insertions.
- Используй обычные conjunctions и pronouns, когда они показывают связь естественно.
- Сохраняй exact professional term, если ученик должен его узнавать или использовать; объясняй через знакомые слова вместо неточного бытового synonym.

`данный`, `является`, `осуществлять`, `посредством`, verbal nouns, participles и passive — сигналы для проверки функции, а не стоп-слова. Сохраняй конструкцию, когда она даёт самый точный и естественный вариант.

## Строить paragraph и segment

- Один paragraph совершает один logical move.
- Main claim или ответ стоит раньше supporting detail, если detail не нужен для понимания claim.
- Заголовок позволяет предсказать вопрос, object, decision или action ниже.
- Один segment решает одну intermediate task: thesis → reason/model → case or boundary → learner action или mini-conclusion.
- Следующий segment опирается на уже собранную часть mental model.
- Связанные text, label, example и visual находятся рядом.
- Деталь остаётся, когда улучшает model, distinction, error diagnosis, memory нужной связи или реальное действие.

Сохраняй связное рассуждение цельным: карточки, однофразовые paragraphs и дробление по word count не заменяют semantic segmentation.

## Вводить термины

Для каждого необходимого нового term дай рядом:

1. знакомое объяснение;
2. точный term;
3. роль или distinguishing feature;
4. representative example;
5. nearby non-example, если вероятна путаница.

После введения называй один concept одинаково. Различай соседние concepts явно. Проверяй перевод по authoritative domain glossary или primary source.

## Управлять русско-английской границей

Learner-facing explanation, heading, instruction, feedback, example и authored metadata пиши по-русски, когда точная естественная русская форма существует. Внутренний prompt, английский skill или source не являются причиной оставить английский prose.

Сохраняй исходную форму, когда она несёт identity или operational meaning:

- официальное имя person, organization, product, library, framework, standard или publication без официальной русской формы;
- code, command, identifier, API name, file path, config key и data field;
- exact interface label, которое ученик должен найти;
- quotation или bibliographic title, когда важен original.

Если English professional term нужен для поиска или общения, один раз поставь его после русского: `извлечение из памяти (retrieval practice)`. Дальше используй русский term, пока сам English token не является предметом обучения. Сохраняй официальный `OpenAI`, command `git status` и instruction `Нажми Run`; окружающее предложение остаётся русским.

## Превратить объяснение в обучение

- Дай модель до сложного самостоятельного поиска новичка.
- Покажи first worked example с reasoning; затем постепенно сними support.
- Попроси ученика предсказать, объяснить, сравнить, диагностировать, закончить, решить, улучшить или создать.
- Дай попытку до hint, answer, solution или rubric.
- Сделай distractors правдоподобными misconceptions; каждому дай короткий диагноз.
- Проверь transfer изменением surface, condition, ambiguity или требуемого choice.
- Верни ключевую capability позже с growing interval и новым context.

Feedback меняет следующую попытку. Он сообщает:

1. что подтверждает или опровергает answer;
2. какой observable sign это показывает;
3. почему возникла ошибка;
4. какое rule/reasoning исправляет её;
5. что попробовать дальше.

## Сохранить Course Voice

- Обращайся к ученику на `ты`; используй imperative для реального шага.
- Признавай genuine difficulty через prerequisites и reasoning.
- Описывай проблему в answer или reasoning, сохраняя уважение к ученику.
- Давай specific feedback вместо automatic praise.
- Поддерживай взрослый conversational register без bureaucratic scaffolding, forced slang и infantilization.
- Используй humor/emoji только для понимания, памяти или эмоционального облегчения.
- Пиши доменные слова естественно и со строчной буквы внутри предложения: `в этом курсе`, `в следующем уроке`. Internal terms из `CONTEXT.md` не превращай в learner-facing English или искусственные proper names.

## Провести раздельные passes

1. **Accuracy:** факты, causal model, examples, boundaries, terminology.
2. **Structure:** need first, prerequisites before use, visible path, one logical move per segment.
3. **Russian:** natural syntax, visible actions, stable terms, functional language switching, no literal translation.
4. **Read aloud:** перепиши каждое место, где речь спотыкается; затем сверь meaning и logical links.
5. **Comprehension:** cold reader находит идею, пересказывает model и решает changed case. AI cold read записывается как proxy; живой target-learner probe — отдельное evidence.

Language pass завершён только когда каждое learner-facing предложение имеет естественную русскую структуру, каждый retained foreign fragment имеет точную функцию, central models можно пересказать, а changed cases решаются без копирования wording.
