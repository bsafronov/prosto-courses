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
A provider-independent AI agent that creates or changes versioned course source through the course authoring contract before the platform is built and deployed. It neither owns presentation nor runs for learners.
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
The person who agrees a Course's audience, scope, Learning Outcomes, and quality criteria with the Authoring Agent, then accepts its design. The Course Owner may be a software developer, educator, or subject-matter expert.
_Avoid_: Developer, requester, user

**Course Brief**:
The versioned, non-learner-facing, Course Owner-approved definition of a Course's learner, application context, entry capabilities, scope and exclusions, Learning Outcomes, evidence of learning, time budget, sources, and constraints. The Authoring Agent does not design the Course structure until this shared understanding is confirmed.
_Avoid_: Prompt, request, topic description

**Course Blueprint**:
The versioned, non-learner-facing, Course Owner-approved map from concepts and dependencies to Modules, Lessons, checks, Cumulative Retrieval, time estimates, and the Capstone Demonstration. It demonstrates coverage and sequence before Lesson content is authored.
_Avoid_: Table of contents, draft Course, lesson list

**Reference Lesson**:
A representative Lesson approved after the Course Blueprint to calibrate depth, pacing, voice, examples, interactions, and visuals before the remaining content is authored. The Course Owner may explicitly skip it for a small Course.
_Avoid_: First lesson, template, prototype Course

**Source Policy**:
The Course Brief's hierarchy of acceptable evidence, jurisdiction, version and freshness requirements, and citation placement. It distinguishes primary authority from commentary and verified fact from simplification, opinion, and simulated cases.
_Avoid_: Bibliography quota, unverified reading list

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
