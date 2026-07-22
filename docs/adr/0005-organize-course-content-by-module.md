---
status: accepted
---

# Organize course content by Module

The target authoring contract keeps each Course self-contained while nesting Lessons under first-class Module directories with a Module overview and Module Checkpoint; a Course-level Capstone Demonstration and non-published authoring artifacts live beside them. Public Lesson identity remains the stable `course-slug + lesson-slug`, independent of its Module path, so regrouping a Lesson does not break its URL or Lesson Progress. When implemented, this supersedes the flat `lessons/` layout in ADR-0003 while preserving its stable-slug and local-ownership goals.

## Considered Options

A flat Course-level `lessons/` directory with a Module slug in Lesson metadata would make regrouping cheaper in Git, but it hides Module ownership and becomes difficult to navigate in a deep Course. Including Module slugs in public Lesson identity would mirror the filesystem but would make pedagogical regrouping a breaking change.
