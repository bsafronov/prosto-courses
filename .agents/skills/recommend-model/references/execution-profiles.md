# Execution profiles

Mapping reviewed: 2026-08-08  
Refresh threshold: 30 days  
Source: [OpenAI model-selection guidance](https://developers.openai.com/api/docs/guides/latest-model)

Profiles describe the work independently of any model generation. Preserve the
profile definitions when refreshing the mapping.

## fast

Clear, repeatable, or high-volume work with a stable transformation, explicit
success criteria, and no unresolved design choice. Size alone does not raise a
mechanical ticket to a stronger profile.

- Model: GPT-5.6 Luna (`gpt-5.6-luna`)
- Reasoning: Low
- Fallback when Luna is unavailable: GPT-5.6 Terra (`gpt-5.6-terra`), Low

## balanced

Bounded implementation or bug fixing at known seams. The ticket may span several
files and require normal tool use and tests, but its contracts and migration path
are already decided.

- Model: GPT-5.6 Terra (`gpt-5.6-terra`)
- Reasoning: Medium

## frontier

Ambiguous or high-impact work involving architecture, public contracts, schemas,
persistence, migrations, concurrency, security, cross-cutting state, novel UX,
or difficult integration and verification.

- Model: GPT-5.6 Sol (`gpt-5.6-sol`)
- Reasoning: High

## Tie-breaks

- Move upward when evidence leaves a material boundary uncertain.
- Prefer `frontier` for plausible data loss, security, or irreversible migration
  failure.
- Keep `fast` for broad mechanical work only when the transformation and
  validation are deterministic.
- Reserve reasoning above High for an explicit high-stakes need or a failed High
  attempt; do not recommend it by default.
