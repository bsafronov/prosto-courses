export const outcomeEvidence = Object.freeze({
  capstone: "capstone",
  capstoneCriterion: "capstone-criterion",
  lessonInstruction: "lesson-instruction",
  moduleCheckpoint: "module-checkpoint",
});

export function createOutcomeAlignment({ courseOutcomes, courseFile, report }) {
  const ownedOutcomeIds = new Set();
  const evidenceByKind = new Map();
  const evidenceFilesByKind = new Map();
  let hasReferenceFailures = false;

  for (const outcome of Array.isArray(courseOutcomes) ? courseOutcomes : []) {
    if (typeof outcome?.id !== "string") continue;

    if (ownedOutcomeIds.has(outcome.id)) {
      hasReferenceFailures = true;
      report(courseFile, `duplicate Course Learning Outcome ID ${outcome.id}`);
    } else {
      ownedOutcomeIds.add(outcome.id);
    }
  }

  function registerOutcomeReferences({
    alignmentScope,
    evidenceKind,
    file,
    label,
    outcomeIds,
  }) {
    if (evidenceKind) {
      const evidenceFiles = evidenceFilesByKind.get(evidenceKind) ?? new Map();
      evidenceFiles.set(alignmentScope, file);
      evidenceFilesByKind.set(evidenceKind, evidenceFiles);
    }

    if (!Array.isArray(outcomeIds) || outcomeIds.length === 0) {
      hasReferenceFailures = true;
      report(file, `${label} must support at least one Course Learning Outcome`);
      return;
    }

    const referencedOutcomeIds = new Set();
    for (const outcomeId of outcomeIds) {
      if (referencedOutcomeIds.has(outcomeId)) {
        hasReferenceFailures = true;
        report(file, `${label} has duplicate Learning Outcome ID ${outcomeId}`);
        continue;
      }
      referencedOutcomeIds.add(outcomeId);

      if (typeof outcomeId !== "string" || ownedOutcomeIds.has(outcomeId)) {
        if (evidenceKind && ownedOutcomeIds.has(outcomeId)) {
          const evidenceOutcomes = evidenceByKind.get(evidenceKind) ?? new Map();
          const evidenceScopes = evidenceOutcomes.get(outcomeId) ?? new Set();
          evidenceScopes.add(alignmentScope);
          evidenceOutcomes.set(outcomeId, evidenceScopes);
          evidenceByKind.set(evidenceKind, evidenceOutcomes);
        }
        continue;
      }

      hasReferenceFailures = true;
      report(
        file,
        `${label} references unknown Course Learning Outcome ID ${outcomeId}`,
      );
    }
  }

  function requireEveryOutcome({ evidenceKind, file, describeMissing }) {
    if (hasReferenceFailures) return;

    const evidencedOutcomes = evidenceByKind.get(evidenceKind) ?? new Map();
    for (const outcomeId of ownedOutcomeIds) {
      if (!evidencedOutcomes.has(outcomeId)) {
        report(file ?? courseFile, describeMissing(outcomeId));
      }
    }
  }

  function requireMatchingEvidence({
    describeMissing,
    evidenceKind,
    sourceEvidenceKind,
  }) {
    if (hasReferenceFailures) return;

    const sourceOutcomes = evidenceByKind.get(sourceEvidenceKind) ?? new Map();
    const evidencedOutcomes = evidenceByKind.get(evidenceKind) ?? new Map();
    const evidenceFiles = evidenceFilesByKind.get(evidenceKind) ?? new Map();

    for (const [outcomeId, sourceScopes] of sourceOutcomes) {
      const evidenceScopes = evidencedOutcomes.get(outcomeId) ?? new Set();
      for (const scope of sourceScopes) {
        if (!evidenceScopes.has(scope)) {
          report(
            evidenceFiles.get(scope) ?? courseFile,
            describeMissing(outcomeId),
          );
        }
      }
    }
  }

  return {
    registerOutcomeReferences,
    requireEveryOutcome,
    requireMatchingEvidence,
  };
}
