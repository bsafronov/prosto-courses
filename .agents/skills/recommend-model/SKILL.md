---
name: recommend-model
description: Recommend a model and reasoning effort for one implementation ticket.
---

# Recommend Model

Return a read-only execution recommendation for one ticket. Leave the repository,
issue tracker, active model, and active reasoning effort unchanged.

## Read the ticket

Resolve exactly one issue number or URL from the invocation. If it is ambiguous,
ask for the issue and stop.

Read `docs/agents/issue-tracker.md`, then fetch the issue's full body, comments,
parent, status, and native blocking relationships. When an open blocker exists,
return the blocked format below and recommend its frontier blocker instead.

This gate is complete when the ticket's outcome, acceptance criteria, parent
decisions, and readiness are known.

## Bound the implementation shape

Read applicable repository instructions, domain documentation, and ADRs. Inspect
the code only far enough to identify the affected public seams, blast radius,
migration risk, state changes, and verification burden. Stop before planning or
implementing the solution.

This gate is complete when the evidence distinguishes `fast`, `balanced`, and
`frontier` work using [the execution profiles](references/execution-profiles.md).

## Recommend

Choose the lowest profile supported by the evidence. Move up one profile when a
material uncertainty sits on a boundary; quality wins ties. Set confidence from
the evidence, not from the selected profile.

Read the dated model mapping in the execution profiles. When it is more than 30
days old or the mapped model is unavailable, use `$openai-docs` to read the
current official Codex model-selection guidance and map the same stable profile
to an available model. Keep the reference file unchanged during recommendation.

For a ready ticket, return exactly:

```text
Issue: #<number> — <title>
Status: Ready
Profile: <fast | balanced | frontier>
Model: <display name> (`<model id>`)
Reasoning: <Low | Medium | High>
Confidence: <Low | Medium | High>
Why: <one or two evidence-based sentences>
Next: Select <display name> / <reasoning> in this chat, then run `$implement #<number>`.
```

For a blocked ticket, return exactly:

```text
Issue: #<number> — <title>
Status: Blocked by #<number> — <title>
Next: Run `$recommend-model #<blocker>`.
```

Finish after the recommendation. Implementation remains a separate user action.
