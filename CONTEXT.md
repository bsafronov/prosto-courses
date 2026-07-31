# Course Platform

This context describes the educational content published by the platform and the people or tools that create and consume it.

## Language

**Course**:
A catalog-published learning program identified by a stable slug and composed of an ordered sequence of Modules.
_Avoid_: Curriculum, Module

**Course Depth**:
The degree of causal understanding, application, boundary recognition, and trade-off reasoning required by the Course's Learning Outcomes and Learner Profile. It is not exhaustive detail or content volume.
_Avoid_: Length, comprehensiveness, expert appendix

**Course Voice**:
The clear, respectful, conversational Russian voice that addresses the learner as `ты`, explains precise ideas in plain language, and treats mistakes as information rather than personal failure. Humor and emoji are used only when they materially aid understanding, memory, or emotional ease.
_Avoid_: Bureaucratic prose, infantilization, empty praise, decorative humor

**Module**:
An ordered, non-catalog grouping of Lessons that develops one intermediate capability and concludes with an opportunity to integrate or demonstrate it.
_Avoid_: Course, chapter, section

**Lesson**:
An ordered, learner-completable part of a Module that develops one primary capability through a complete Learning Cycle. It is identified within its Course by a stable slug.
_Avoid_: Chapter, page, unit

**Learning Cycle**:
The required functional progression within a Lesson: activate relevant knowledge, build a mental model, elicit learner action, give corrective feedback, test transfer, and consolidate. Its functions need not appear as fixed or separately titled sections.
_Avoid_: Lesson template, content checklist

**Cumulative Retrieval**:
Planned recall and reuse of earlier capabilities in later Lessons, Module Checkpoints, and the Capstone Demonstration. It is a Course-level sequence property, not a quota of flashcards or repeated wording.
_Avoid_: Repetition section, flashcard requirement

**Instructional Scaffolding**:
Temporary support that moves from worked reasoning through partial completion to independent application and transfer, then recedes as learner capability grows.
_Avoid_: Difficulty quota, repeated full solution, permanent hinting

**Course Catalog**:
The browsable collection of independent courses and the destination for cross-course navigation. It does not impose an order between courses.
_Avoid_: Curriculum, course sequence

**Resume Destination**:
The most recently visited incomplete Lesson, Module Checkpoint, or Capstone Demonstration across the Course Catalog, selected from browser-local progress as the learner's direct return point. If no such progress exists, the learner starts from the Course Catalog rather than an assumed current Course.
_Avoid_: Current Course, enrolled Course, homepage Course

**Offline Availability**:
The browser-local state in which the entire currently published Course Catalog and its platform-owned learner interactions remain usable without a network connection. External references are outside this guarantee; Offline Availability neither requires installation nor implies synchronization between browsers or devices.
_Avoid_: Installation, synchronization, downloaded Course

**Catalog Update**:
A browser-local transition from one complete offline-available Course Catalog release to a newer complete release. The prepared release replaces the active release only after the learner accepts it, so releases are never mixed during a learning session.
_Avoid_: Partial refresh, automatic reload, Content Revision

**External Reference**:
A link from published course content to a resource the platform does not own or make available offline. It may supplement a Course but cannot be required to complete its core learning path.
_Avoid_: Offline resource, required external step

**Course Overview**:
The introduction to a course, containing its description, learning outcomes, ordered lesson list, progress, and start or continue action.
_Avoid_: First lesson, course index

**Learning Outcome**:
A concise statement of knowledge or ability a learner should gain by completing a course.
_Avoid_: Goal, objective

**Outcome Alignment**:
The explicit relationship from each Learning Outcome through the Modules, Lessons, and Practice Tasks that develop it to the Module Checkpoints and Capstone criteria that demonstrate it.
_Avoid_: Topic coverage, content tagging, objective count

**Capstone Demonstration**:
The authentic final performance through which a learner can demonstrate the Course's Learning Outcomes. Its form follows the capability being assessed and is not necessarily a software project.
_Avoid_: Final quiz, mandatory project, exam

**Authoring Agent**:
A provider-independent AI agent that researches, creates, verifies, or changes versioned course source through the course authoring contract. It owns evidence-based authoring decisions but neither owns presentation nor supplies the Course Owner's product judgments.
_Avoid_: Runtime agent, learner agent, course generator

**Semantic Course Component**:
A versioned, platform-owned MDX primitive whose documented inputs express a learning function and whose rendering includes an accessible non-visual representation. The Authoring Agent may use only components in the authoring contract.
_Avoid_: UI component, layout component, invented MDX tag

**Capability Pack**:
A versioned, platform-declared extension to the core Semantic Course Component catalog for a bounded capability such as code execution, mathematical input, simulation, or media. A Course may depend only on packs confirmed in its Course Brief.
_Avoid_: Implicit runtime, invented component set, universal plugin

**Callout**:
A Semantic Course Component that marks content as a key idea, required information, warning, error, advanced material, or additional context. The Authoring Agent selects the meaning; the platform owns color, iconography, and layout.
_Avoid_: Colored box, decoration, emphasis paragraph

**Learning Visual**:
A diagram, chart, table, or image selected because it reduces the effort of understanding a specific relationship or structure. It includes an accessible interpretation and, where applicable, source data and provenance.
_Avoid_: Decoration, visual quota, unexplained image

**Course Owner**:
The person who supplies a Course's product intent and makes Critical Decisions that evidence alone cannot resolve. The Course Owner may contribute a lay reading but is not presumed to be a subject-matter expert or the Course's full quality reviewer.
_Avoid_: Developer, requester, user

**Delegated Authoring**:
The default collaboration mode in which the Authoring Agent owns researchable factual and instructional decisions while the Course Owner is consulted only for Critical Decisions. It replaces mandatory human approval at every authoring stage without permitting silent changes to scope or Learning Outcomes.
_Avoid_: Unsupervised generation, AI approval, automatic publication

**Critical Decision**:
A choice that evidence cannot resolve reliably and whose viable answers materially change the Course's audience, scope, Learning Outcomes, safety, factual risk, cost, jurisdiction, irreversible dependencies, or value trade-offs. It is the only decision type that Delegated Authoring must escalate to the Course Owner.
_Avoid_: Clarifying question, preference check, fact lookup

**Course Brief**:
The versioned, non-learner-facing record of a Course's learner, application context, entry capabilities, scope and exclusions, Learning Outcomes, evidence of learning, time budget, sources, constraints, assumptions, and Critical Decisions. It is ready when its intent is coherent and no unresolved Critical Decision blocks design.
_Avoid_: Prompt, request, topic description

**Course Blueprint**:
The versioned, non-learner-facing map from concepts and dependencies to Modules, Lessons, checks, Cumulative Retrieval, time estimates, and the Capstone Demonstration. The Authoring Agent verifies its coverage, sequence, and constraints before Lesson content is authored.
_Avoid_: Table of contents, draft Course, lesson list

**Reference Lesson**:
A representative Lesson used after the Course Blueprint to calibrate depth, pacing, voice, examples, interactions, and visuals before the remaining content is authored. Calibration uses Authoring Agent review and target-learner evidence when practical; Course Owner approval is optional.
_Avoid_: First lesson, template, prototype Course

**Independent Course Audit**:
A fresh-context AI review that starts from the Course requirements and authoritative sources, then independently checks the completed draft's facts, learning design, answers, Russian, safety, and accessibility. It is neither Authoring Agent self-review nor independent expert review.
_Avoid_: AI approval, expert review, final proof

**Source Policy**:
The Course Brief's hierarchy of acceptable evidence, jurisdiction, version and freshness requirements, and citation placement. It distinguishes primary authority from commentary and verified fact from simplification, opinion, and simulated cases.
_Avoid_: Bibliography quota, unverified reading list

**Factual Risk**:
The `standard` or `high` classification of the consequences of presenting a Course's factual material incorrectly or after it becomes stale. It describes publication risk and never represents independent expert review or approval.
_Avoid_: Expert approval, Course quality

**Content Freshness**:
The verified currency of source-dependent claims, recorded separately from file modification time. Time-sensitive Lessons may declare their own verification window; Module and Course freshness is derived from the earliest dependent review deadline.
_Avoid_: Creation date, modification date, recent edit

**Content Revision**:
An explicit increment indicating that a Lesson's learner action or mental model changed materially while its identity remained the same. Existing Lesson Completion is preserved but the learner is invited to revisit the updated Lesson.
_Avoid_: Edit count, timestamp, Course version

**Learner Profile**:
The single primary combination of entry capabilities, application context, and target proficiency for which a Course is designed. Optional review and advanced material may support nearby needs, but divergent outcomes require a separate Course.
_Avoid_: Everyone, mixed audience, persona

**Progression Guidance**:
Non-blocking platform cues that show the designed Course sequence and recommend review without restricting learner navigation.
_Avoid_: Progression Lock, access control, prerequisite gate

**Lesson Completion**:
An explicit, reversible learner action marking a lesson as finished in the current browser. It does not depend on quiz performance.
_Avoid_: Quiz pass, page view, reading progress

**Course Completion**:
The browser-local state reached when the learner explicitly completes every core Lesson, Module Checkpoint, and the Capstone Demonstration. Advanced material and stretch Practice Tasks are optional, and completion is neither a grade nor certification of mastery.
_Avoid_: Certification, mastery, perfect score

**Lesson Progress**:
The browser-local state of a lesson: not started, started, or completed. It is shown in lesson navigation independently of answer correctness.
_Avoid_: Pass status, grade, score

**Knowledge Check**:
A single formative diagnostic action embedded near the concept it reinforces, with immediate explanatory feedback and unlimited retries. Its supported response form may vary, but it produces neither a cumulative score nor a Lesson Completion decision.
_Avoid_: Quiz, exam, graded assessment

**Module Checkpoint**:
A formative opportunity at the end of a Module for a learner to integrate or demonstrate its intermediate capability and receive targeted review guidance. Its result neither restricts navigation nor determines Lesson Completion.
_Avoid_: Gate, exam, Progression Lock

**Readiness Check**:
An optional, non-blocking diagnostic of the Course's entry capabilities that recommends specific preparation when gaps are found.
_Avoid_: Entrance exam, prerequisite gate, placement score

**Practice Task**:
An ungraded learner action used in a Lesson, Module Checkpoint, or Capstone Demonstration, with a stated purpose and completion criteria, optional progressively specific hints, and an intentionally revealed worked example or Self-Assessment rubric. Its role is core, challenge, or stretch relative to the Learner Profile.
_Avoid_: Worked example, graded assignment, reading prompt

**Reflection**:
An ungraded prompt for a learner to articulate a decision, experience, or change in mental model in a private browser-local note. It has no correct answer and is used only when recording the response supports learning.
_Avoid_: Survey, journal quota, free-response grading

**Deterministic Check**:
A formative interaction whose correctness the static platform can establish unambiguously from authored answer data or executable tests. It provides immediate explanatory feedback without claiming to judge open-ended reasoning.
_Avoid_: AI assessment, grade, subjective score

**Self-Assessment**:
A learner's comparison of open-ended work against an authored rubric, worked reasoning, or observable criteria. The platform presents guidance but does not assign an objective score.
_Avoid_: Automated grading, expert review
