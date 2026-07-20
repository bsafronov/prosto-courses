# Course Platform

This context describes the educational content published by the platform and the people or tools that create and consume it.

## Language

**Course**:
A learning unit identified by a stable slug and composed of an ordered sequence of lessons.
_Avoid_: Curriculum, module

**Lesson**:
An ordered, learner-completable part of a course, identified within that course by a stable slug.
_Avoid_: Chapter, page, unit

**Course Catalog**:
The browsable collection of independent courses and the destination for cross-course navigation. It does not impose an order between courses.
_Avoid_: Curriculum, course sequence

**Course Overview**:
The introduction to a course, containing its description, learning outcomes, ordered lesson list, progress, and start or continue action.
_Avoid_: First lesson, course index

**Learning Outcome**:
A concise statement of knowledge or ability a learner should gain by completing a course.
_Avoid_: Goal, objective

**Authoring Agent**:
A provider-independent AI agent that creates or changes versioned course source through the course authoring contract before the platform is built and deployed. It neither owns presentation nor runs for learners.
_Avoid_: Runtime agent, learner agent, course generator

**Progression Lock**:
A browser-local navigation constraint that guides a learner through lessons in order. It is not access control, and locked lesson content remains publicly reachable.
_Avoid_: Access control, authorization, paywall

**Lesson Completion**:
An explicit, reversible learner action marking a lesson as finished in the current browser. It does not depend on quiz performance.
_Avoid_: Quiz pass, page view, reading progress

**Lesson Progress**:
The browser-local state of a lesson: not started, started, or completed. It is shown in lesson navigation independently of answer correctness.
_Avoid_: Pass status, grade, score

**Knowledge Check**:
A formative single-choice question embedded in a lesson, with immediate feedback, an explanation, and unlimited retries. Its answer is neither persisted nor used to determine lesson completion.
_Avoid_: Exam, test, graded assessment
