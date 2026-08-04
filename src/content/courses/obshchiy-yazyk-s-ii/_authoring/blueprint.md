# Course Blueprint: Общий язык с ИИ

Подзаголовок: «Как проектировать задачи, получать предсказуемые результаты и управлять качеством»

Версия: 3

Статус: проект курса проверен; делегированное создание курса активно

Этап: полный draft интегрирован и передан в Independent Course Audit; release не выполнен

Дата проектирования: 2026-08-04

## Backward design от Capstone

Capstone требует спроектировать и доказательно улучшить реальную сложную
рабочую задачу. Чтобы представить полное досье, learner должен:

1. отделить возможности языковой модели от функций ассистента и инструментов,
   не принимая беглость или уверенность за гарантию;
2. превратить намерение в минимально достаточную спецификацию с наблюдаемой
   целью, пользователем результата, inputs, actions, constraints, format,
   uncertainties, criteria и verification;
3. выбрать релевантный context, representative examples и формат границ по их
   функции, затем проверить, не потерялось ли существенное условие;
4. выбрать короткий prompt, requirements interview или workflow по сложности,
   неизвестности и проверяемости подзадач;
5. задать rubric, normal, edge, adversarial и held-out cases, получить baseline
   и проверить существенную вариативность;
6. связать claims с источниками, расчётами, tests или human judgment, не
   подменяя проверку generated citation или вердиктом второй модели;
7. проверить trust boundaries, чувствительные данные, bias, IP и точные
   последствия возможного внешнего действия;
8. изменить минимум две измеренные ошибки по одной содержательной гипотезе за
   итерацию и показать, что held-out evidence не использовалось для подгонки;
9. сохранить переносимое ядро спецификации отдельно от зависящих от модели условий
   запуска и воспроизводимо зафиксировать эксперимент; отдельный model adapter
   и вторая модель остаются optional;
10. сравнить итог с рубрикой Self-Assessment, назвать границы и выбрать
    следующую проверку без ложной объективной оценки.

Capstone context выбирает learner, но brief требует realistic stakes, нового
контекста относительно учебного кейса и результата, который можно проверить за
четыре часа. Если исходная задача содержит секреты, лишние персональные данные
или требует медицинского, юридического либо финансового решения, learner
обезличивает, сужает или заменяет её до начала работы.

Итоговый artefact — единое досье: intent, specification, prompt/workflow,
context package, rubric, test set, baseline, selected outputs, iteration log,
external evidence, safety check, reproducibility record и limitations. Именно
эти observable parts определяют dependency order Modules; тематический список
сам по себе не определяет архитектуру Course.

## Concept map и prerequisite dependencies

```mermaid
flowchart LR
  intention["Рабочее намерение"] --> stakes["Пользователь результата и ставка ошибки"]
  boundaries["Модель, ассистент и инструмент"] --> uncertainty["Вариативность и границы знания"]
  stakes --> specification["Минимально достаточная спецификация"]
  uncertainty --> specification
  specification --> mode["Короткий prompt, диалог или workflow"]
  context["Релевантный context"] --> execution["Выполнение"]
  examples["Representative examples"] --> execution
  structure["Границы instruction и data"] --> execution
  mode --> execution
  specification --> context
  specification --> examples
  specification --> rubric["Rubric и test set"]
  execution --> baseline["Baseline и результаты"]
  rubric --> evaluation["Оценка по evidence"]
  baseline --> evaluation
  sources["Источники, расчёты и tools"] --> evaluation
  trust["Trust boundaries и safety"] --> execution
  trust --> evaluation
  evaluation --> diagnosis["Измеренная ошибка"]
  diagnosis --> change["Одна гипотеза изменения"]
  change --> execution
  development["Development cases"] --> selection["Выбор кандидата"]
  selection --> heldout["Однократная held-out проверка"]
  evaluation --> selection
  portable["Переносимое ядро"] --> adapter["Условия запуска"]
  selection --> portable
  adapter --> reproduction["Воспроизводимая проверка"]
  reproduction --> capstone["Capstone dossier"]
  selection --> capstone
```

Текстовая интерпретация: intent становится спецификацией только после
уточнения пользователя результата, ставки ошибки и границ системы.
Specification определяет режим работы, context, examples и критерии.
Execution даёт baseline, который оценивается по rubric и внешнему evidence.
Измеренная ошибка порождает одну проверяемую гипотезу и новый запуск. Candidate
выбирается по development evidence, затем один раз проверяется на held-out
cases. Для переноса specification отделяется от model-specific условий запуска,
а отдельный adapter второй модели остаётся optional.

Prerequisite order:

- границы модели, ассистента и tools вводятся до обещаний о качестве и до
  выбора prompting technique;
- пользователь результата и ставка ошибки предшествуют criteria, safety depth
  и выбору режима работы;
- specification предшествует context selection, examples, decomposition и
  rubric, иначе learner оптимизирует незафиксированную цель;
- релевантность и trust boundary вводятся до работы с длинным или найденным
  content;
- workflow создаётся только после различения простой и сложной задачи;
- baseline и test set фиксируются до первой целевой итерации;
- Deterministic Check и внешний evidence вводятся до AI critique и
  self-correction;
- prompt injection, privacy и external-action confirmation повторяются при
  каждом новом источнике или инструменте, а не добавляются в конце;
- metaprompt candidates создаются после criteria и development cases;
- held-out cases открываются один раз после выбора версии на development cases
  и не используются для дальнейшей подгонки;
- model-specific условия запуска отделяются только после переносимого ядра
  specification; отдельный adapter создаётся лишь в optional practice;
- Capstone получает новый context после убывания Instructional Scaffolding.

## Почему пять Modules

Architecture содержит пять Modules, потому что Capstone требует пяти крупных
промежуточных capabilities:

1. построить спецификацию, понимая границы системы;
2. превратить specification в управляемый context и workflow;
3. измерить качество и улучшить конкретное отклонение;
4. подтвердить claims и удержать safety boundaries;
5. использовать metaprompting и перенос без подгонки под один output или model.

Каждая capability завершается самостоятельным Module Checkpoint и становится
входом следующей. Объединение Modules 3 и 4 перегружает одну capability двумя
разными вопросами — «как измерить?» и «какому evidence доверять?». Разделение
Modules 1 или 2 на тематические главы увеличивает число Checkpoints, но не даёт
новой intermediate capability. Пять Modules покрывают 30 Lessons по 35 минут,
пять интеграционных Checkpoints и четырёхчасовой Capstone внутри budget 26
часов 15 минут.

## Sequence

### Module 1. От намерения к спецификации (`ot-namereniya-k-specifikacii`)

Intermediate capability: объяснить границы системы, превратить рабочее
намерение в минимально достаточную спецификацию и выбрать подходящий режим
работы.

| Order | Lesson slug | Lesson | Primary capability | Outcomes | Study | Practice | Advanced |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| 1 | `model-assistent-i-instrument` | Модель, ассистент или инструмент | Определять, какая часть системы генерирует текст, хранит контекст, вызывает инструмент и выполняет действие | `distinguish-system-boundaries` | 14 | 21 | 0 |
| 2 | `pravdopodobnyy-tekst-i-proverennyy-rezultat` | Беглый ответ ещё не факт | Отличать ответ модели от проверенного факта и результата внешнего инструмента | `distinguish-system-boundaries`, `verify-evidence` | 14 | 21 | 0 |
| 3 | `variativnost-i-povtornye-zapuski` | Один prompt — не один гарантированный ответ | Планировать несколько проверочных случаев и запусков, когда вариативность способна изменить решение | `distinguish-system-boundaries`, `evaluate-quality` | 14 | 21 | 10 |
| 4 | `tokeny-i-kontekstnoe-okno` | Поместилось в окно — не значит использовалось | Объяснять границы токенов и контекстного окна без английских эвристик и проверять потерянные условия | `distinguish-system-boundaries`, `design-inputs` | 14 | 21 | 10 |
| 5 | `ierarhiya-instrukciy` | Не все инструкции имеют одинаковый приоритет | Читать иерархию инструкций как контракт конкретной системы и отличать доверенную инструкцию от цитируемых данных | `distinguish-system-boundaries`, `manage-risk` | 14 | 21 | 10 |
| 6 | `karta-specifikacii-zadachi` | Из намерения — в проверяемую задачу | Собирать цель, пользователя результата, исходные данные, действия, ограничения, формат, неопределённости, критерии и проверку | `specify-work` | 14 | 21 | 0 |
| 7 | `minimalno-dostatochnaya-detalizaciya` | Длиннее не значит точнее | Удалять роль, повтор или контекст, который не меняет решение, границу, формат или проверку | `specify-work`, `design-inputs` | 14 | 21 | 0 |
| 8 | `zapros-dialog-ili-workflow` | Один запрос, диалог или workflow | Выбирать режим по числу неизвестных, сложности, нужным инструментам и промежуточной проверяемости | `specify-work`, `orchestrate-work` | 14 | 21 | 0 |

Module Checkpoint, 50 минут: learner получает сырой запрос «подготовь план
запуска курса». Он отмечает границы ассистента и модели, называет ставку
ошибки, превращает запрос в минимально достаточную specification, удаляет
декоративную роль, отбирает релевантный фрагмент context, отклоняет инструкцию
из недоверенных данных, выбирает prompt, requirements interview или workflow и
задаёт два проверочных случая и способ проверки. Для одного вариативного случая
он выполняет два запуска и сравнивает результат по одному наблюдаемому
критерию. Changed case просит подготовить решение для руководителя при неполных
данных. Evidence: mode объяснён наблюдаемыми признаками, а уверенный текст не
считается фактом.
Последние 10 минут learner применяет те же действия к собственной задаче и
сохраняет первую версию Capstone dossier.

### Module 2. Контекст и проверяемый workflow (`kontekst-i-workflow`)

Intermediate capability: собрать релевантный input package и спроектировать
workflow, в котором каждый шаг даёт проверяемый artefact.

| Order | Lesson slug | Lesson | Primary capability | Outcomes | Study | Practice | Advanced |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| 1 | `byudzhet-relevantnosti` | Контекст платит за место вниманием | Отбирать сведения, которые меняют действие или критерий, и удалять отвлекающий контекст | `design-inputs`, `specify-work` | 14 | 21 | 0 |
| 2 | `poteryannye-usloviya-v-dlinnom-kontekste` | Найди условие, которое модель пропустила | Перестраивать вход и проверочные случаи, чтобы обнаруживать потерю существенных условий | `design-inputs`, `evaluate-quality` | 14 | 21 | 10 |
| 3 | `primery-i-granichnye-sluchai` | Пример показывает поведение, а не закон | Подбирать репрезентативные обычные и граничные примеры и добавлять контрпример только к измеренной ошибке | `design-inputs`, `evaluate-quality` | 14 | 21 | 10 |
| 4 | `format-dlya-sleduyushchego-potrebitelya` | Markdown, теги или JSON | Выбирать форму по границам частей и следующему потребителю без обещания правильности содержания | `design-inputs`, `distinguish-system-boundaries` | 14 | 21 | 10 |
| 5 | `dialog-kak-intervyu-o-trebovaniyah` | Сначала выяснить, потом собрать заново | Проводить интервью о требованиях и подтверждать консолидированную спецификацию до выполнения | `orchestrate-work`, `specify-work` | 14 | 21 | 5 |
| 6 | `dekompoziciya-s-usloviem-prodolzheniya` | Каждый шаг должен оставить проверяемый след | Делить задачу на более простые подзадачи с проверяемым результатом и условием продолжения | `orchestrate-work`, `verify-evidence` | 14 | 21 | 10 |

Module Checkpoint, 50 минут: по specification запуска образовательного продукта
learner получает набор заметок, таблицу требований, три examples и недоверенный
фрагмент web research. Он отбирает context, выбирает representative examples,
разделяет instruction и data, проводит короткое интервью по неизвестному,
консолидирует результат и строит workflow с artefact и условием продолжения
после каждого шага. Затем normal и edge probes проверяют, сохранились ли
существенные условия. Evidence: лишняя деталь удалена, embedded instruction не
получает authority, а decomposition уменьшает сложность. Последние 10 минут
learner обновляет context package и workflow собственной задачи.

### Module 3. Измерение и управляемое улучшение (`izmerenie-i-uluchshenie`)

Intermediate capability: зафиксировать исходный результат, измерить качество
на репрезентативных проверочных случаях и улучшить одну диагностированную
ошибку.

| Order | Lesson slug | Lesson | Primary capability | Outcomes | Study | Practice | Advanced |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| 1 | `rubrika-i-cena-oshibki` | Качество состоит из нескольких измерений | Строить рубрику из наблюдаемых свойств, приоритетов и цены критической ошибки | `evaluate-quality`, `manage-risk` | 14 | 21 | 0 |
| 2 | `normal-edge-adversarial-i-held-out` | Один удачный пример ничего не доказывает | Собирать набор для разработки и отложенный набор из обычных, граничных и провокационных (`adversarial`) проверочных случаев | `evaluate-quality` | 14 | 21 | 10 |
| 3 | `tochnaya-proverka-ili-samoocenka` | Где нужен тест, а где рубрика | Выбирать Deterministic Check, калиброванное суждение человека или Self-Assessment без ложной оценки | `evaluate-quality`, `verify-evidence` | 14 | 21 | 10 |
| 4 | `baseline-i-variativnye-zapuski` | Сначала измерь исходный результат | Фиксировать исходный результат и достаточное число случаев и запусков до изменения prompt | `evaluate-quality`, `distinguish-system-boundaries` | 14 | 21 | 5 |
| 5 | `izmerennaya-oshibka-i-odna-gipoteza` | Меняй только то, что проверяешь | Связывать одно содержательное изменение с измеренным отклонением и вести журнал итераций | `evaluate-quality`, `improve-and-transfer` | 14 | 21 | 10 |
| 6 | `vneshnee-svidetelstvo-vmesto-samokritiki` | «Проверь себя» — ещё не проверка | Сравнивать самокритику модели с обратной связью от источника, теста, расчёта или калиброванной рубрики человека | `verify-evidence`, `improve-and-transfer` | 14 | 21 | 10 |

Module Checkpoint, 55 минут: learner получает спецификацию, prompt и четыре
ответа для анонса образовательного продукта. Он строит рубрику, разделяет набор
для разработки и отложенный набор, выбирает точные и открытые проверки,
фиксирует исходный результат, диагностирует отклонение, меняет одну гипотезу и
проверяет новую версию. AI-критика используется для списка возможных причин,
но версия выбирается по данным набора для разработки; отложенный набор остаётся
закрытым. Checkpoint возвращает отбор контекста и workflow из Modules 1–2.
Последние 15 минут learner создаёт рубрику, набор для разработки и исходный
результат для собственной задачи.

### Module 4. Источники, инструменты и безопасность (`evidence-i-bezopasnost`)

Intermediate capability: получить достаточное внешнее подтверждение и
безопасно работать с недоверенными данными, чувствительной информацией и
действиями.

| Order | Lesson slug | Lesson | Primary capability | Outcomes | Study | Practice | Advanced |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| 1 | `prompt-istochnik-vychislenie-ili-tool` | Выбери правильную опору | Выбирать поиск для текущего факта, источник для тезиса, расчёт для точного ответа и контракт инструмента для действия | `verify-evidence`, `distinguish-system-boundaries` | 14 | 21 | 0 |
| 2 | `proverka-istochnika-i-citacii` | Ссылка должна поддерживать тезис | Проверять авторитетность, дату, применимость и соседний подтверждающий фрагмент каждой существенной ссылки | `verify-evidence`, `evaluate-quality` | 14 | 21 | 10 |
| 3 | `neizvestnost-i-granicy-vyvoda` | Не заполняй пробел уверенным текстом | Обозначать допустимую неопределённость и выбирать следующую проверку при недостатке подтверждений | `verify-evidence`, `manage-risk` | 14 | 21 | 0 |
| 4 | `prompt-injection-kak-granica-doveriya` | Документ может содержать враждебную инструкцию | Отделять доверенную инструкцию от недоверенного содержимого и не считать разделитель защитой | `manage-risk`, `design-inputs` | 14 | 21 | 10 |
| 5 | `privatnost-predvzyatost-i-prava` | Какие данные и чьи интересы затрагивает ответ | Минимизировать чувствительные данные и проверять предвзятость, права на материал и правила обработки данных конкретного продукта | `manage-risk` | 14 | 21 | 10 |
| 6 | `vneshnie-deystviya-i-stavka-oshibki` | Проверь объект до необратимого действия | Усиливать проверку и подтверждать точный объект, параметры и последствия | `manage-risk`, `verify-evidence`, `orchestrate-work` | 14 | 21 | 0 |

Module Checkpoint, 50 минут: learner проверяет research pack для решения о
запуске продукта. В pack есть актуальный claim без даты, вымышленная citation,
скрытая инструкция в документе, персональные данные участника и draft внешнего
письма. Learner выбирает tool/evidence для каждого claim, проверяет supporting
fragment, обозначает неизвестное, обезличивает данные и составляет confirmation
card для внешнего действия. Rubric и test cases из Module 3 используются
повторно. Последние 10 минут learner добавляет evidence register и safety check
к собственной задаче.

### Module 5. Метапромптинг и перенос (`metaprompting-i-perenos`)

Intermediate capability: использовать модель для интервью и генерации
вариантов, выбирать версию по данным набора для разработки, один раз проверять
её на отложенных случаях и отделять переносимую спецификацию от зависящих от
модели условий.

| Order | Lesson slug | Lesson | Primary capability | Outcomes | Study | Practice | Advanced |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| 1 | `metaprompt-kak-intervyuer` | Модель помогает найти пробел, но не назначает цель | Проводить процесс «интервью → черновик спецификации → поиск пробелов», сохраняя цель, риск и критерии у человека | `improve-and-transfer`, `specify-work` | 14 | 21 | 10 |
| 2 | `kandidaty-i-otlozhennaya-proverka` | Генерируй несколько, выбирай по тестам | Выбирать варианты prompt на наборе для разработки и один раз проверять выбранную версию на отложенных случаях | `improve-and-transfer`, `evaluate-quality` | 14 | 21 | 20 |
| 3 | `russkiy-angliyskiy-odin-test` | Язык сравнивают, а не объявляют победителем | Сравнивать русскую и английскую версии на одном наборе проверочных случаев и диагностировать изменение смысла при переводе | `improve-and-transfer`, `design-inputs` | 14 | 21 | 25 |
| 4 | `perenosimoe-yadro-i-usloviya-zapuska` | Переноси задачу, а не магическую строку | Отделять спецификацию от ролей, параметров и синтаксиса инструментов и фиксировать воспроизводимые зависящие от модели условия запуска | `improve-and-transfer`, `distinguish-system-boundaries` | 14 | 21 | 35 |

Module Checkpoint, 50 минут: learner проходит полный metaprompt pipeline для
новой рабочей задачи, получает минимум три candidates, выбирает версию по
development evidence и один раз проверяет её на held-out cases без последующей
подгонки. Затем отделяет portable specification от условий текущего запуска.
Optional extension создаёт model adapter и повторяет один test set на второй
модели или сравнивает русский и английский без изменения criteria. Evidence
фиксирует model, date, tools, full input, outputs и rubric. Последние 15 минут
learner выполняет тот же финальный verification pass на собственной задаче.

### Сквозные линии практики

Каждый Lesson содержит три связанные линии core practice в пределах указанных
21 минуты:

1. короткое действие на сквозном кейсе запуска образовательного продукта;
2. changed case из другой профессии, который проверяет перенос, а не узнавание;
3. микрошаг на собственной задаче learner: обновить specification, context
   package, workflow, rubric, evidence register, safety check или iteration log
   тем новым capability, который развивает Lesson.

Learner сохраняет эти микрошаги в растущем Capstone dossier. Module Checkpoint
сначала проверяет capability на authored changed case, затем просит применить
её к собственному dossier без готового решения. Если реальная задача содержит
секреты, лишние персональные данные или недопустимо высокую ставку, learner
использует обезличенную копию либо безопасный surrogate case и записывает это
ограничение. Так Capstone продолжает восемь недель практики, а не начинается
как отдельный проект после Module 5.

### Capstone Demonstration

Время: 240 минут.

Milestones:

1. **Безопасный brief, 20 минут.** Learner продолжает собственную задачу и
   растущее dossier из предыдущих Modules. Она нова только относительно
   authored учебного кейса. Learner повторно проверяет пользователя результата,
   stakes, exclusions и обезличивает inputs.
2. **Specification, 35 минут.** Собирает обязательные поля и обосновывает
   удалённые детали.
3. **Mode и input package, 30 минут.** Выбирает prompt/dialog/workflow,
   подготавливает context, examples, boundaries и stop/go conditions.
4. **Evaluation design, 35 минут.** Создаёт rubric, development cases и
   untouched held-out cases; выбирает deterministic checks.
5. **Baseline, 25 минут.** Фиксирует условия запуска и baseline outputs без
   выбора одного красивого ответа.
6. **Две итерации, 55 минут.** Для каждой версии называет failure, одну
   hypothesis, изменение и evidence результата.
7. **Evidence и safety, 20 минут.** Проверяет consequential claims, citations,
   prompt injection, privacy, bias, IP и external actions.
8. **Held-out verification, 10 минут.** Один раз проверяет заранее выбранную
   версию на неиспользованных cases и отмечает regression без дальнейшей
   подгонки на этом наборе.
9. **Self-Assessment и границы, 10 минут.** Сверяет dossier с рубрикой,
   называет неопределённость и следующую проверку.

Capstone rubric:

| Критерий | Наблюдаемое подтверждение | Outcomes |
| --- | --- | --- |
| Границы системы учтены | Ответ модели не назван выполненным действием или проверенным фактом; вариативность, контекст и иерархия инструкций учтены там, где меняют решение | `distinguish-system-boundaries` |
| Спецификация минимально достаточна | Цель, пользователь, исходные данные, действия, ограничения, формат, неопределённости, критерии и проверка наблюдаемы; оставленные поля меняют решение, границу, формат или проверку | `specify-work` |
| Входные данные спроектированы по функции | Контекст релевантен, примеры покрывают обычное и граничное поведение, инструкции и данные разделены, потерянные условия проверены | `design-inputs` |
| Режим и workflow обоснованы | Prompt, интервью или workflow выбран по неизвестности и сложности; каждый шаг даёт артефакт и условие продолжения | `orchestrate-work` |
| Качество измеряется, а не угадывается | Есть многомерная рубрика, набор для разработки и отложенный набор, исходный результат, достаточные запуски и сравнение без ложной объективной оценки | `evaluate-quality` |
| Тезисы связаны с подтверждениями | Существенные тезисы поддержаны точным фрагментом источника, расчётом, Deterministic Check или явно откалиброванным суждением человека | `verify-evidence` |
| Риск управляется пропорционально ставке | Недоверенное содержимое, приватность, предвзятость, права на материал и внешнее действие проверены; объект и последствия подтверждены до действия | `manage-risk` |
| Улучшение и перенос доказаны | Каждая итерация отвечает на измеренное отклонение; вариант выбран на наборе для разработки и один раз проверен на отложенных случаях; переносимая спецификация отделена от зависящих от модели условий запуска | `improve-and-transfer` |

Likely failure modes:

- prompt становится длиннее, но ни одна новая деталь не связана с criterion;
- один удачный output подменяет baseline и representative test set;
- development cases незаметно становятся held-out cases;
- AI critique или second-model verdict объявляются объективной оценкой;
- generated citation есть в списке, но не поддерживает соседний claim;
- untrusted document меняет instructions или предлагает external action;
- journal перечисляет edits, но не связывает их с measured failures;
- model-specific условия смешаны со specification, поэтому перенос меняет цель;
- Self-Assessment превращается в score или certification claim.

Extensions: optional second-model comparison, Russian/English comparison on
identical cases, expanded adversarial set или human calibration. Ни одно
extension не требуется для core evidence.

## Outcome Alignment

| Outcome | Instruction | Practice | Module Checkpoints | Capstone criterion |
| --- | --- | --- | --- | --- |
| `distinguish-system-boundaries` | Lessons 1–5 Module 1; retrieval в format, tool boundary и model-specific conditions Lessons | разобрать system diagram, классифицировать outputs, спланировать repeated runs и instruction priority | Modules 1, 2, 4 и 5 | Границы системы учтены |
| `specify-work` | Lessons 6–8 Module 1; requirements interview Module 2; metaprompt interview Module 5 | переписать vague intent, заполнить и сократить specification, объяснить retained fields | Modules 1, 2 и 5 | Specification минимально достаточна |
| `design-inputs` | context, examples и format Lessons Module 2; prompt injection Module 4; language comparison Module 5 | context ablation, example selection, lost-condition probe, instruction/data separation | Modules 1, 2, 4 и 5 | Inputs спроектированы по функции |
| `orchestrate-work` | mode selection Module 1; interview и decomposition Module 2; external action Module 4 | выбрать mode, консолидировать dialogue, задать artefact и stop/go condition | Modules 1, 2 и 4 | Режим и workflow обоснованы |
| `evaluate-quality` | весь Module 3; examples Module 2; source verification Module 4; candidate selection Module 5 | rubric, normal/edge/adversarial cases, baseline, multiple runs, development selection и однократная held-out verification | Modules 1–5 | Качество измеряется, а не угадывается |
| `verify-evidence` | external feedback Module 3; Lessons 1–3 Module 4 | выбрать search/source/calculation/tool, проверить citation fragment, обозначить uncertainty | Modules 2, 3 и 4 | Claims связаны с evidence |
| `manage-risk` | instruction hierarchy Module 1; rubric stakes Module 3; Lessons 3–6 Module 4 | найти injection, минимизировать data, проверить bias/IP, составить confirmation card | Modules 1, 3 и 4 | Риск управляется пропорционально ставке |
| `improve-and-transfer` | iteration Lessons Module 3; весь Module 5 | iteration log, external feedback, metaprompt candidates, development selection, held-out verification и отделение условий запуска | Modules 3 и 5 | Улучшение и перенос доказаны |

Нет Learning Outcome только с recall evidence. Каждый Outcome получает
причинное explanation, meaningful Practice Task, возврат в более позднем
context, минимум один Module Checkpoint и отдельный observable Capstone
criterion.

## Knowledge Check plan

| Pattern | Placement | Диагностируемая ошибка |
| --- | --- | --- |
| `matching` | `model-assistent-i-instrument` | текстовая генерация, хранение history и external action приписаны одной модели |
| `single` | `pravdopodobnyy-tekst-i-proverennyy-rezultat` | уверенность или citation count приняты за factual verification |
| `multiple` | `variativnost-i-povtornye-zapuski` | один run используется для high-variance decision |
| `matching` | `tokeny-i-kontekstnoe-okno` | context capacity смешана с гарантированным вниманием и русским token count |
| `ordering` | `karta-specifikacii-zadachi` | format выбирается до цели и пользователя результата |
| `single` | `zapros-dialog-ili-workflow` | сложность mode определяется длиной prompt, а не неизвестностью и checks |
| `multiple` | `byudzhet-relevantnosti` | context добавлен потому, что доступен, а не потому, что меняет решение |
| `matching` | `format-dlya-sleduyushchego-potrebitelya` | Markdown, XML-like blocks и JSON получают магические свойства |
| `ordering` | `dialog-kak-intervyu-o-trebovaniyah` | выполнение начинается до consolidation и confirmation |
| `multiple` | `rubrika-i-cena-oshibki` | rubric сводится к «хорошо написано» или одному average score |
| `matching` | `normal-edge-adversarial-i-held-out` | development, edge, adversarial и held-out roles смешаны |
| `single` | `tochnaya-proverka-ili-samoocenka` | open-ended quality объявлена deterministic truth |
| `ordering` | `izmerennaya-oshibka-i-odna-gipoteza` | несколько изменений внесены до фиксации failure и baseline |
| `matching` | `prompt-istochnik-vychislenie-ili-tool` | current fact, calculation, claim и action проверяются одним способом |
| `multiple` | `proverka-istochnika-i-citacii` | URL существует, но source/date/applicability/fragment не проверены |
| `single` | `prompt-injection-kak-granica-doveriya` | delimiter принят за полную защиту от untrusted instruction |
| `ordering` | `vneshnie-deystviya-i-stavka-oshibki` | external action выполнен до target review и explicit confirmation |
| `multiple` | `kandidaty-i-otlozhennaya-proverka` | held-out cases используются для редактирования candidate |
| `matching` | `perenosimoe-yadro-i-usloviya-zapuska` | цель и criteria смешаны с roles, parameters и tool syntax |

Checks появляются рядом с concept, допускают retry и объясняют признак,
причину и следующее действие. Они не создают cumulative score и не определяют
Lesson Completion.

## Instructional Scaffolding

1. Readiness Check активирует опыт learner на знакомом short prompt и указывает
   только конкретные prerequisite gaps.
2. Module 1 использует полный worked example «запуск образовательного
   продукта»: raw request → system boundary map → specification → mode choice.
   Learner сначала отмечает parts, затем сам сокращает specification и решает
   changed case.
3. Module 2 сохраняет готовую specification, но снимает готовый input package.
   Worked context ablation сменяется partial example selection, затем learner
   самостоятельно строит consolidated interview и workflow.
4. Module 3 даёт worked rubric и baseline только в первых Lessons. В Reference
   Lesson learner получает outputs и measured failure, но сам выбирает одну
   hypothesis, заполняет iteration log и объясняет evidence. Последний Lesson
   убирает готовый verification method.
5. Module 4 меняет surface context: research pack содержит mixed-trust sources,
   injection и data risks. Learner больше не получает готовый список проверок,
   а выбирает evidence и verification depth по stakes.
6. Module 5 предоставляет только pipeline и acceptance criteria. Learner сам
   управляет metaprompt interview, candidates, dev/held-out split и отделением
   model-specific условий. Optional model adapter и second model не получают
   отдельного worked answer.
7. Каждый Module Checkpoint использует changed case, возвращает прежние
   capabilities и даёт diagnostic review guidance, но не блокирует следующий
   Module.
8. Capstone убирает authored кейс и готовые prompts/examples, но продолжает
   собственную задачу и dossier learner. Остаются brief, milestones,
   constraints и Self-Assessment rubric.

Support fades так: annotated worked example → marked parts → partial
completion → changed-case choice → independent workflow → own-task Capstone.
Hints становятся progressively specific и раскрываются после первой попытки.
Worked solutions показывают причины шагов, промежуточные checks и границы, а
не только красивый final output.

## Cumulative Retrieval

- Lesson 2 Module 1 возвращает границы model/assistant/tool из Lesson 1 через
  классификацию evidence.
- Lessons 3–5 Module 1 требуют заново различать capacity, variability и
  instruction authority на changed cases.
- Module 1 Checkpoint объединяет system boundaries, specification и mode.
- `byudzhet-relevantnosti` начинает с сокращения specification из Module 1.
- `dialog-kak-intervyu-o-trebovaniyah` возвращает все поля specification без
  готового списка в прежнем порядке.
- Module 2 Checkpoint требует system boundary, minimal specification и mode
  before workflow.
- `rubrika-i-cena-oshibki` извлекает пользователя результата и stakes из
  Module 1.
- `normal-edge-adversarial-i-held-out` возвращает representative examples из
  Module 2, но меняет их роль с teaching examples на evaluation cases.
- `baseline-i-variativnye-zapuski` возвращает variability из Module 1.
- Module 3 Checkpoint повторно использует specification, context и workflow.
- `prompt-istochnik-vychislenie-ili-tool` возвращает model/tool boundary;
  `prompt-injection-kak-granica-doveriya` возвращает instruction hierarchy и
  context boundaries.
- Module 4 Checkpoint требует rubric, test cases и iteration evidence из
  Module 3 вместе с safety checks.
- `metaprompt-kak-intervyuer` возвращает requirements interview, но learner
  проверяет, не присвоила ли модель цель и acceptable risk.
- `kandidaty-i-otlozhennaya-proverka` возвращает baseline, iteration log и
  held-out split без готового example set.
- `russkiy-angliyskiy-odin-test` возвращает format sensitivity и test-set
  invariance.
- `perenosimoe-yadro-i-usloviya-zapuska` возвращает все system boundaries,
  specification и reproducibility fields; отдельный adapter остаётся optional.
- Module 5 Checkpoint и Capstone требуют все Outcomes в новых contexts без
  копирования сквозного case.

Интервалы растут: immediate recall внутри Lesson → Module Checkpoint → reuse в
следующем Module → mixed-trust changed case → independent Capstone. Retrieval
меняет surface features и требует выбора, а не повторяет формулировку.

## Explanation plan

| Difficult concept | Learner need and concrete case | Causal or decision model | Necessary terms | Boundary and likely misconception |
| --- | --- | --- | --- | --- |
| Модель, ассистент и tool | Понять, кто написал, кто помнит history и кто отправил письмо | layered system: model proposes text/call; assistant supplies context/policy; tool executes | модель, ассистент, tool contract | «Модель отправила письмо»; interfaces differ by provider |
| Вероятностная генерация | Объяснить разные drafts по одному request | prompt + model state → distribution of possible continuations → sampled output | variability, run, baseline | temperature 0 не доказывает truth или exact repeatability |
| Tokens и context | Решить, что включить в длинный document pack | capacity limits placement; relevance and position affect usable evidence | token, context window, relevance budget | «Поместилось» не значит «условие использовано»; English token heuristic не переносится на русский |
| Instruction hierarchy | Не дать quoted document изменить задачу | authority follows system contract and source, not visual formatting | instruction, data, priority, untrusted content | hierarchy provider-specific; model compliance is not absolute defense |
| Specification | Сделать vague «подготовь запуск» наблюдаемой задачей | intent + result user + inputs/actions/constraints + criteria/verification → executable brief | specification, criterion, uncertainty | это diagnostic map, не обязательный maximal template |
| Минимальная детализация | Сократить длинный role-heavy prompt | detail earns place only if it changes decision, boundary, format or check | ablation, relevant detail | shorter is not always better; length alone is not quality |
| Выбор mode | Не сжимать неизвестную complex task в one-shot | low uncertainty/simple verification → prompt; unknown requirements → interview; dependent checked steps → workflow | requirements interview, workflow, stop/go condition | decomposition adds failure points when subtasks are not simpler |
| Context and examples | Выбрать inputs для launch plan | task distribution → representative normal/edge cases; controlled order/format experiment | few-shot, edge case, counterexample | universal example count/order does not exist |
| Markdown, XML-like blocks, JSON | Передать human-readable parts или machine contract | next consumer determines structure; structure validity and semantic truth are separate | delimiter, JSON, structured output | format can influence output but is not truth or injection protection |
| Rubric and test set | Отличить attractive copy from fit-for-purpose result | dimensions + observable evidence + error cost; dev cases improve and select, held-out cases verify once | rubric, adversarial, held-out | one score hides trade-offs; open work has no deterministic truth by default |
| Baseline and iteration | Узнать, какое edit helped | fixed test set + baseline → measured failure → one hypothesis → rerun → compare | baseline, iteration log, regression | simultaneous edits break causal diagnosis |
| Self-critique and external feedback | Исправить unsupported claim | critique generates hypotheses; source/test/calculation supplies new evidence | intrinsic self-correction, external feedback | second model verdict is not objective truth |
| Claim verification | Проверить generated citation | claim → exact supporting fragment → authority/date/applicability → bounded conclusion | claim, citation, provenance | URL existence or citation count does not support claim |
| Prompt injection | Read uploaded research safely | trusted instruction and untrusted data remain separate across processing; external action needs confirmation | indirect prompt injection, trust boundary | delimiters reduce ambiguity but cannot guarantee defense |
| Privacy, bias and external actions | Не причинить hidden harm | minimize data; inspect affected people and rights; scale checks by stakes; confirm target | sensitive data, bias, IP, irreversible action | generic checkbox or provider policy copied across products is insufficient |
| Metaprompting | Получить candidates without surrendering goal | human owns intent/risk/criteria; model interviews and proposes; eval selects | metaprompt, candidate, development set | confident candidate or train-set winner can overfit |
| Russian/English and model transfer | Перенести working process without myth | hold specification/tests constant; vary language or adapter; measure differences | portable core, model adapter, reproducibility | English is not universal winner; prompt text need not transfer verbatim |

Each explanation follows Course Voice and the plain-Russian research: name the
real decision early, introduce only prerequisite parts, show one worked case
with reasons and intermediate checks, contrast a nearby failure, state the
boundary, then elicit a changed-case action before consolidation. Diagrams are
used only for layered system, central cycle, trust boundary or iteration loop
when they reduce effort; exact mappings use Markdown tables.

## Reference Lesson calibration record

Reference Lesson создан в
`modules/izmerenie-i-uluchshenie/lessons/izmerennaya-oshibka-i-odna-gipoteza.mdx`.
Калибровка зафиксирована 2026-08-04 в ticket #70.

Lesson остаётся репрезентативным: он расположен в середине dependency chain,
возвращает specification, rubric, test cases, variability и baseline, а затем
выражает центральный переход Course `оценка → уточнение`. Одна primary
capability наблюдаема: learner связывает измеренное отклонение с одной
проверяемой гипотезой, проводит сопоставимый повтор и заполняет журнал
итераций.

### Что откалибровано

- **Depth.** Причинная модель отделяет симптом от причины, задаёт
  подтверждающее и опровергающее evidence, требует regression check и явно
  ограничивает вывод конкретными cases и условиями. Boundary cases различают
  одну содержательную гипотезу, несколько связанных текстовых правок, новый
  baseline после смены условий и срочную работу без causal attribution.
- **Pacing.** Metadata сохраняет 14 минут study, 21 минуту core practice и до
  10 минут advanced. Core содержит один worked example, один ordering
  Knowledge Check и одну open Practice Task; optional stretch Practice Task
  отдельно разбирает невозможность controlled isolation. Это authoring
  estimate, а не измерение на target learner.
- **Worked example.** Смоделированный baseline анонса образовательного продукта
  одновременно нарушает specificity и source-grounding. Example выбирает
  неподтверждённые claims по частоте и риску, меняет только evidence rule,
  повторяет по три сопоставимых запуска тех же cases и сохраняет размытую
  аудиторию как отдельную следующую ошибку. Поэтому частичное улучшение не
  выдано за полный успех, а observed difference — за universal causality.
- **Scaffolding.** Rubric, baseline и measured failure даны. Hypothesis,
  falsifying evidence, one change, regression checks и log entry остаются за
  learner. Changed professional case требует переноса без готовой
  формулировки; микрошаг возвращает собственную задачу learner.
- **Feedback and interactions.** Ordering check диагностирует преждевременное
  редактирование. Progressive hints идут от симптома к механизму и протоколу.
  Core and stretch TaskRubrics отдельно показывают ошибки attribution,
  falsifiability, comparability, regression и transfer. Reflection сохраняет
  ровно тот выбор, который нужен для следующей итерации, и не оценивает
  открытый ответ.
- **Course Voice.** Основной текст использует естественные русские действия:
  `измеренное отклонение`, `проверяемая гипотеза`, `сопоставимый повтор`,
  `журнал итераций`. `prompt` и `baseline` сохранены как зафиксированные Course
  terms и объяснены в контексте, без чередования случайных English synonyms.
- **Learning Visual.** Exact mapping представлен двумя Markdown tables и
  соседней текстовой инструкцией: сначала cases и симптомы, затем causal log.
  Смысл не зависит от цвета или положения. Diagram не добавлен: без learner
  evidence нет основания считать, что короткая цепочка и таблица недостаточны.
- **Sources and freshness.** Claims о variability, task-specific evals,
  logging и prompt sensitivity имеют соседние primary/official citations.
  Living provider guidance отделено от Course design method; Lesson получает
  time-sensitive freshness `verifiedAt: 2026-08-04`, `reviewAfter:
  2026-11-02`, applicability `global`.

### Findings and corrections

Authoring audit и двухосевой review нашли восемь рисков; это редакционные
findings, не evidence понимания target learner:

1. Формулировку «одно изменение» можно было понять как одну строку или одно
   слово. Lesson теперь определяет одну содержательную гипотезу и показывает
   boundary со связанными правками.
2. Успех новой версии мог скрыть оставшуюся ошибку. Worked example и журнал
   сохраняют размытую аудиторию отдельным residual failure и проверяют
   regressions.
3. Core task мог зависеть от online-доступа к модели. Добавлен offline-complete
   путь: learner записывает точный протокол будущего запуска; модель даёт
   дополнительные observations, но не является условием понимания задания.
4. Diagram мог дублировать короткую причинную цепочку. Сохранена более точная
   table form; Diagram отложен до evidence, что связи нельзя восстановить из
   текста и таблицы.
5. Один output на case не отделял effect изменения от обычной variability.
   Worked example и core task теперь используют по три сопоставимых запуска
   каждого case, а результат назван preliminary evidence, которое следующая
   серия способна опровергнуть.
6. Changed case повторял ошибки worked example и позволял скопировать выбор по
   частоте. Transfer теперь использует инструкцию службы поддержки, другие
   error types и trade-off между частотой и ценой пропущенной эскалации.
7. Timed advanced action был оформлен как Callout без goal, criteria и
   feedback. Он преобразован в optional stretch Practice Task с TaskRubric.
8. Stretch task предполагал, что у learner уже есть подходящая прошлая правка.
   Добавлен complete fallback case, поэтому task solvable from available
   material без личного artefact.

### Learner-probe limitation

В этой сессии не было доступно представителя Learner Profile. Поэтому
target-learner comprehension probe не проведён, наблюдаемых learner errors нет
и target-learner validation не заявляется. Course Owner разрешил релиз с этим
явно раскрытым ограничением 2026-08-04. Authoring audit, automated validation
и AI review не считаются заменой.

Запланированный probe перед final Course audit: дать participant без
предварительного объяснения найти central loop, пересказать его своими
словами, затем выбрать одну гипотезу для нового status case и назвать
falsifying evidence. Записываются hesitation, смешение symptom/cause,
simultaneous edits и пропущенные regressions; consequential finding требует
revision и повторного changed case. Вопрос «Всё понятно?» не используется.

### Calibration contract for remaining Lessons

1. Начинать difficult explanation с рабочего решения learner, а термин вводить
   после конкретного симптома или case.
2. Показывать causal or decision chain, intermediate check и boundary; красивый
   final output без причин и ограничений недостаточен.
3. Давать помощь по текущей ступени scaffolding: к Module 3 можно предоставить
   rubric, baseline и один symptom, но hypothesis, change и evidence выбирает
   learner. В следующих Lessons готовый verification method снимается.
4. Строить diagnostic feedback как `симптом → возможная причина → исправление
   → повторная проверка → regression check`, не как verdict о learner.
5. Использовать minimum interaction density, достаточную для action and
   transfer. Knowledge Check нужен только для consequential deterministic
   misconception; open work получает TaskRubric без score.
6. Использовать Markdown table для exact mappings. Diagram добавлять только
   для relationship/process, когда text and table требуют больше effort;
   visual всегда получает самостоятельную textual interpretation.
7. Сохранять русский Course Voice и зафиксированные terms. English нужен для
   official names, identifiers или термина, который learner должен узнать, а
   не как authoring shorthand.
8. Ставить citation рядом с consequential technical claim, отделять source
   claim от Course synthesis и назначать living guidance собственный
   freshness lifecycle.
9. Не выдавать pacing estimate за измеренное время до learner probe; если probe
   остаётся невозможен к final audit, перенести limitation в quality report.

## Coverage audit

- Outcome gap audit: all eight Outcomes have instruction, meaningful practice,
  later retrieval, Module Checkpoint evidence and one separate Capstone
  criterion.
- Capstone-backward audit: every required dossier part is prepared by a Module;
  no Module exists only because it appeared in the former eight-topic research
  hypothesis.
- Dependency audit: specification precedes context/workflow; rubric and
  baseline precede iteration; evaluation precedes source/safety integration;
  one-time held-out verification follows development selection and precedes a
  portability claim.
- Module capability audit: each Module ends in one usable intermediate
  capability, not a recap of unrelated topics.
- Lesson load audit: 30 Lessons each target one primary capability and 35 core
  minutes. Tokens/context and instruction hierarchy are separate Lessons;
  privacy/bias/IP stay together because their primary action is affected-data
  and rights review.
- Duplication audit: variability, specification, rubric and trust boundary
  recur only as Cumulative Retrieval in harder contexts. Tool boundary is
  introduced in Module 1 and operationalized with evidence in Module 4.
- Myth audit: role expertise, longest prompt, temperature 0, full attention to
  a large window, guaranteed self-correction, citation/JSON truth, XML injection
  protection and universal English superiority each receive a causal
  correction and changed-case test.
- Evidence audit: stable claims map to Evidence Base; conflicting role and
  self-correction results retain boundaries; provider-specific rules stay in
  dated labs/adapters.
- Russian audit: core explanation is Russian; retained English serves official
  names, exact identifiers or terms needed for interface/search. Translation
  experiments hold cases and criteria constant.
- Practice audit: every Lesson elicits action before solution; every Module
  Checkpoint is cumulative, changed-case and non-blocking; Capstone continues
  learner's authentic task and is new relative to authored cases.
- Scaffolding audit: complete worked path appears only early; support falls
  through partial completion and independent selection to own-task Capstone.
- Safety audit: verification, prompt injection, privacy, bias, IP and external
  action appear both in dedicated instruction and across later practice.
- Accessibility audit: planned visuals have text equivalents; tables carry
  exact comparisons; no learning meaning depends on color, motion or audio.
- Offline audit: External References are supplemental; authored summaries,
  cases, criteria and expected evidence keep core path self-contained.
- Platform audit: no new schema, component, layout, script, style, runtime,
  evaluator, storage or Capability Pack is assumed.
- Scope audit: deep research, image generation, agent engineering, programming,
  medical/legal/financial decisions and autonomous external actions remain
  excluded.
- Workload audit: five capability-based Modules, 30 Lessons, five Checkpoints,
  Readiness Check and Capstone total 26 hours 15 minutes; optional work is four
  additional hours.

No unresolved Critical Decision blocks Reference Lesson authoring. Living
provider claims, learner-probe evidence and final freshness dates remain
explicit later-ticket checks, not silent assumptions.

## Workload

| Part | Core minutes | Optional minutes |
| --- | ---: | ---: |
| Optional, non-blocking Readiness Check | 30 | 0 |
| Module 1: eight Lessons | 280 | 30 |
| Module 1 Checkpoint | 50 | 0 |
| Module 2: six Lessons | 210 | 45 |
| Module 2 Checkpoint | 50 | 0 |
| Module 3: six Lessons | 210 | 45 |
| Module 3 Checkpoint | 55 | 0 |
| Module 4: six Lessons | 210 | 30 |
| Module 4 Checkpoint | 50 | 0 |
| Module 5: four Lessons | 140 | 90 |
| Module 5 Checkpoint | 50 | 0 |
| Capstone Demonstration | 240 | 0 |
| **Total** | **1575** | **240** |

Core: 26 часов 15 минут. Optional advanced: до 4 часов. Каждый Lesson занимает
35 минут core, включая study и learner action. Checkpoints получают 50–55
минут на интеграцию, а Capstone — 4 часа независимой работы. При темпе около
3–3,5 часа в неделю основной маршрут укладывается примерно в восемь недель.

Workload определяет пять Modules вместе с capability dependencies. Увеличение
числа Modules добавило бы новые Checkpoints без нового Capstone evidence;
уменьшение смешало бы distinct intermediate capabilities и превысило бы
разумную нагрузку одного Module.

## Pre-audit Outcome Alignment review

Полный draft проверен перед передачей в fresh-context Independent Course Audit.
Это authoring review, а не независимый аудит и не release approval.

### Проверенный inventory

- один Course Overview описывает Learner Profile, observable prerequisites,
  восемь Learning Outcomes, scope, exclusions, Course promise и optional
  non-blocking Readiness Check;
- пять Module overviews имеют contiguous orders `1–5` и сохраняют capabilities
  из verified Sequence;
- 30 Lessons имеют уникальные Course-level slugs, contiguous orders внутри
  Modules и один primary capability;
- пять Module Checkpoints покрывают Outcomes своих Modules и возвращают
  capabilities более ранних Modules в changed cases;
- один Capstone Demonstration использует новую относительно authored cases
  реальную задачу и требует specification, prompt или workflow, rubric,
  development и held-out cases, baseline, iteration log, evidence register,
  limitations, safety check и reproducibility record;
- Capstone Self-Assessment содержит восемь отдельных observable criteria без
  score, certification или progression gate;
- Capability Packs отсутствуют; External References остаются supplemental.

### Trace каждого Learning Outcome

| Learning Outcome | Taught | Practiced | Retrieved | Demonstrated |
| --- | --- | --- | --- | --- |
| `distinguish-system-boundaries` | Module 1: модель, ассистент, инструмент, вариативность, контекстное окно и instruction hierarchy | classification, repeated runs и system-boundary map | Modules 2, 3, 4 и 5 при выборе format, baseline, tool и условий запуска | «Границы системы учтены» |
| `specify-work` | Module 1: task map, minimal sufficiency и mode choice | raw intent → specification и сокращение полей | Modules 2 и 5 в requirements/metaprompt interview | «Спецификация минимально достаточна» |
| `design-inputs` | Module 2: relevance, lost conditions, examples и format boundaries | context ablation, example selection и input package | Modules 4 и 5 в injection boundary и language comparison | «Входной пакет спроектирован по функции» |
| `orchestrate-work` | Modules 1–2: request/dialog/workflow, consolidation и decomposition | artefact, verification и stop/go condition для каждого шага | Module 4 при controlled external action | «Режим работы обоснован» |
| `evaluate-quality` | Module 3: rubric, case roles, baseline, variability и measured iteration | development set, multiple runs и version comparison | Modules 4–5 при source checks и candidate selection | «Качество измеряется» |
| `verify-evidence` | Modules 3–4: external feedback, source, search, calculation и Deterministic Check | evidence register, citation fragment и uncertainty label | Module 5 при evaluation-driven candidate choice | «Тезисы связаны с подтверждениями» |
| `manage-risk` | Modules 1, 3 и 4: instruction priority, stakes, injection, privacy, bias, IP и actions | trust-boundary review, data minimization и confirmation card | Module 5 и Capstone при full-input/reproducibility record | «Риск управляется пропорционально ставке» |
| `improve-and-transfer` | Modules 3 и 5: measured failure, metaprompt pipeline, held-out check и portable core | iteration log, candidate selection и adapter separation | Module 5 Checkpoint после retrieval всех earlier capabilities | «Улучшение и перенос доказаны» |

Каждый Outcome имеет минимум один Lesson с instruction, meaningful core
Practice Task, retrieval в более позднем контексте, Module Checkpoint evidence
и отдельный observable Capstone criterion. Ни один Outcome не опирается только
на recall или Self-Assessment claim.

### Cross-course integration findings

- Сквозной кейс запуска образовательного продукта развивается от raw request и
  system boundary map через specification, input package, workflow, rubric,
  baseline, evidence и safety к metaprompt selection. Capstone снимает authored
  case и требует собственный новый контекст.
- Короткие examples из редактуры, аналитики, закупок, поддержки, HR,
  исследований и operations меняют surface context, сохраняя проверяемый
  capability; transfer не сводится к замене имён.
- Cumulative Retrieval возвращает specification, rubric, test cases, trust
  boundary и iteration record в later Lessons и Checkpoints. Последний
  Checkpoint требует полный pipeline до независимой Capstone работы.
- Core path остаётся self-contained: ссылки подтверждают и расширяют claims,
  но authored explanations, case data, expected evidence, feedback and rubrics
  достаточны без сети.
- Проверка schema, deterministic answers, factual claims, plain Russian,
  accessibility и render behavior передана Independent Course Audit ticket
  #77. До завершения этого fresh-context audit Course остаётся draft вне
  `src/content/courses`.

## Verification record

- Brief version 1 завершён до проектирования Sequence и фиксирует отсутствие
  blocking Critical Decisions.
- Parent spec #68, Evidence Base 2026-08-04, plain-language research и current
  authoring contract использованы как design inputs.
- Backward trace выполнен от восьми Capstone criteria к Module Checkpoints,
  Practice and instruction; gaps в Outcome Alignment не найдены.
- Dependency, overload, duplication, scope, platform, safety, accessibility и
  workload audits записаны выше.
- Reference Lesson создан в середине Course; authoring calibration, findings,
  corrections и contract для остальных Lessons зафиксированы в ticket #70.
  Target-learner probe не проведён из-за отсутствия доступного представителя
  Learner Profile; Course Owner принял это как ограничение релиза, а точный
  будущий probe записан без заявления о learner validation.
- Blueprint не публикует Course и не вводит platform contract. Draft остаётся
  вне `src/content/courses` до Independent Course Audit и release QA в ticket
  #77.
- Pre-audit Outcome Alignment review выполнен по полному Course Overview,
  Modules, Lessons, Checkpoints и Capstone. Восемь Outcomes traced through
  instruction, Practice, Cumulative Retrieval and separate Capstone criteria;
  gaps не найдены. Independent verification остаётся ticket #77.

Материальное изменение Module capabilities, Outcome evidence, Capstone,
Reference Lesson или workload требует новой версии Blueprint и повторной
проверки Outcome Alignment.
