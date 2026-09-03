'use strict';

// Core sprint-closure reconciliation. Pure function: it takes an already-parsed
// sprint document plus a list of Issue records (state, labels, body, project
// Status/Iteration) and returns a deterministic audit result — a set of
// FAIL-class drifts that must block closure and WARN-class observations that are
// disclosed but never block.
//
// Contract and rule rationale: doc/conventions/sprint-closure-audit.md.

const { parseSessions, parseUncheckedTasks, isRealDate } = require('./parse-issue-evidence.js');

const CANONICAL_INVESTMENT_LABELS = new Set([
  'investment: product',
  'investment: product-engineering',
  'investment: dev-platform',
]);

function formatMinutes(total) {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h${String(rem).padStart(2, '0')}m`;
}

// Only the unpadded `sprint-<N>` is canonical (doc/conventions/sprints.md, and
// every automation that sweeps by label). A padded `sprint-07` / `sprint-007` is
// drift to surface, not an accepted alias.
function canonicalSprintLabel(sprintNumber) {
  return sprintNumber == null ? null : `sprint-${sprintNumber}`;
}

function hasPaddedSprintLabel(labels, sprintNumber) {
  if (sprintNumber == null) {
    return false;
  }
  const padded = new RegExp(`^sprint-0+${sprintNumber}$`);
  return labels.some((l) => padded.test(l));
}

function investmentLabels(labels) {
  return labels.filter((l) => /^investment\s*:/i.test(l));
}

function hasCanonicalInvestment(labels) {
  const found = investmentLabels(labels);
  return found.length === 1 && CANONICAL_INVESTMENT_LABELS.has(found[0]);
}

function emptyInvestmentMix() {
  return {
    'investment: product': 0,
    'investment: product-engineering': 0,
    'investment: dev-platform': 0,
    unknown: 0,
  };
}

function downgrade(current, next) {
  const order = { high: 2, medium: 1, low: 0 };
  return order[next] < order[current] ? next : current;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sessionInWindow(sessionDate, startBound, endBound) {
  if (startBound && sessionDate < startBound) {
    return false;
  }
  if (endBound && sessionDate > endBound) {
    return false;
  }
  return true;
}

function auditSprint({
  sprintDoc,
  issues,
  activeIteration = null,
  today = null,
  defaultRepo = 'pakodiazdev/sushigo',
  missingRefs = [],
} = {}) {
  // Issue numbers referenced by a disposition ("deferred to #NNN") that were
  // checked and found NOT to exist — a typo'd follow-up target.
  const missingRefSet = new Set((missingRefs ?? []).map(Number));
  // Issue identity is (repo, number). `repo: null` on a scope ref, or a missing
  // `repo` on an Issue record, both mean the audit's default repo.
  const keyOf = (repo, number) => `${repo || defaultRepo}#${number}`;
  const byRef = new Map();
  for (const issue of issues ?? []) {
    byRef.set(keyOf(issue.repo, Number(issue.number)), issue);
  }
  // A repository-less ref resolves ONLY against the default-repo key — never a
  // same-numbered issue from another repo.
  const resolveRec = (ref) => byRef.get(keyOf(ref.repo, ref.number));
  const refLabel = (ref) => (ref.repo ? `${ref.repo}#${ref.number}` : `#${ref.number}`);

  // Sprint docs parsed by parseSprintDoc carry scopeRefs/opportunisticRefs; a
  // hand-built doc object may only have the plain number arrays.
  const scopeRefs = sprintDoc.scopeRefs ?? (sprintDoc.formalScopeIssues ?? []).map((n) => ({ repo: null, number: n }));
  const opportunisticRefs =
    sprintDoc.opportunisticRefs ?? (sprintDoc.opportunisticIssues ?? []).map((n) => ({ repo: null, number: n }));

  const failures = [];
  const warnings = [];
  const fail = (code, message, issue) => failures.push({ code, message, issue: issue ?? null });
  const warn = (code, message, issue) => warnings.push({ code, message, issue: issue ?? null });

  const sprintNumber = sprintDoc.sprintNumber ?? null;
  const sprintLabel = canonicalSprintLabel(sprintNumber);
  const scopeRefKeys = new Set(scopeRefs.map((r) => keyOf(r.repo, r.number)));
  const opportunisticRefKeys = new Set(opportunisticRefs.map((r) => keyOf(r.repo, r.number)));

  if (sprintNumber == null) {
    fail(
      'sprint-number-invalid',
      sprintDoc.sprintNumberInvalid || sprintDoc.sprint
        ? `frontmatter "sprint" value (${sprintDoc.sprint}) is not a bare integer — the sprint cannot be identified`
        : 'frontmatter has no "sprint" number — the sprint cannot be identified',
    );
  }

  // A blank or malformed `started` date would silently drop the lower window
  // bound and let sessions from any prior date inflate same_window_project_effort.
  const startBound = isRealDate(sprintDoc.started ?? '') ? sprintDoc.started : null;
  // An open sprint's window ends "now". A *present but malformed* `completed`, or
  // an explicitly-supplied invalid `today` override, is a FAIL below — not
  // something to silently paper over with the system date.
  const completedValid = sprintDoc.completed ? isRealDate(sprintDoc.completed) : true;
  const todaySupplied = today != null && today !== '';
  const todayValid = todaySupplied ? isRealDate(today) : true;
  const endBound =
    (sprintDoc.completed && completedValid && sprintDoc.completed) ||
    (todaySupplied && todayValid ? today : todayIso());

  if (todaySupplied && !todayValid) {
    fail('sprint-window-invalid', `the "today" override "${today}" is not a valid YYYY-MM-DD date`);
  }
  if (!startBound) {
    fail(
      'sprint-window-unknown',
      `sprint document has no valid "started" date (${sprintDoc.started || 'blank'}) — the wall-clock window cannot be bounded, so same-window effort would be unreliable`,
    );
  }
  if (sprintDoc.completed && !completedValid) {
    fail(
      'sprint-window-invalid',
      `sprint document has an invalid "completed" date (${sprintDoc.completed}) — the wall-clock window's end cannot be trusted`,
    );
  } else if (startBound && startBound > endBound) {
    fail('sprint-window-invalid', `sprint window start (${startBound}) is after its end (${endBound})`);
  }

  if (!activeIteration) {
    fail(
      'iteration-missing',
      `no GitHub Project iteration titled "Sprint ${sprintNumber}" was found — iteration/scope consistency cannot be checked`,
    );
  }

  // ---- Formal scope -------------------------------------------------------
  let closed = 0;
  let open = 0;
  let formalTrackedMinutes = 0;
  let metricConfidence = 'high';
  const missingIteration = [];
  const missingSprintLabel = [];
  const missingInvestment = [];
  const undisposedByIssue = {};
  let uncheckedTotal = 0;
  let uncheckedUndisposed = 0;
  const investmentMix = emptyInvestmentMix();

  for (const ref of scopeRefs) {
    const number = ref.number;
    const label = refLabel(ref);
    const rec = resolveRec(ref);
    if (!rec) {
      fail('scope-no-evidence', `scoped issue ${label} has no fetched Issue data — cannot verify closure`, number);
      metricConfidence = 'low';
      continue;
    }

    const labels = rec.labels ?? [];
    const state = (rec.state ?? '').toUpperCase();
    const projectStatus = rec.projectStatus ?? null;

    if (state === 'OPEN') {
      open += 1;
      fail('scope-open', `scoped issue ${label} is still OPEN`, number);
    } else {
      closed += 1;
      // A closed scoped issue must be verifiably "Done" on the board. A missing
      // Project status is not a pass — it means the final state cannot be
      // confirmed, which is exactly the drift this audit exists to catch.
      if (projectStatus !== 'Done') {
        fail(
          'scope-not-done',
          `closed scoped issue ${label} has Project status ${projectStatus ? `"${projectStatus}"` : 'unset'}, not "Done"`,
          number,
        );
      }
    }

    if (!hasCanonicalInvestment(labels)) {
      missingInvestment.push(number);
      investmentMix.unknown += 1;
      fail('investment-missing', `scoped issue ${label} lacks exactly one canonical investment: label`, number);
    } else {
      investmentMix[investmentLabels(labels)[0]] += 1;
    }

    if (activeIteration) {
      if (rec.projectIterationId !== activeIteration.id) {
        missingIteration.push(number);
        fail(
          'iteration-mismatch',
          `scoped issue ${label} is not assigned to iteration "${activeIteration.title}"`,
          number,
        );
      }
    }

    if (sprintLabel && !labels.includes(sprintLabel)) {
      missingSprintLabel.push(number);
      const padded = hasPaddedSprintLabel(labels, sprintNumber);
      fail(
        'sprint-label-missing',
        padded
          ? `scoped issue ${label} carries a zero-padded sprint label; the canonical label is "${sprintLabel}"`
          : `scoped issue ${label} is missing the "${sprintLabel}" label`,
        number,
      );
    }

    const sessionInfo = parseSessions(rec.body ?? '');
    formalTrackedMinutes += sessionInfo.trackedMinutes;
    if (sessionInfo.malformed || !sessionInfo.hasTimeSection) {
      metricConfidence = downgrade(metricConfidence, 'low');
    } else {
      metricConfidence = downgrade(metricConfidence, sessionInfo.confidence);
    }

    if (state === 'CLOSED') {
      const tasks = parseUncheckedTasks(rec.body ?? '');
      uncheckedTotal += tasks.uncheckedCount;
      if (tasks.undisposedCount > 0) {
        uncheckedUndisposed += tasks.undisposedCount;
        undisposedByIssue[number] = { undisposed: tasks.undisposedCount, total: tasks.uncheckedCount };
        fail(
          'closed-with-undisposed-tasks',
          `closed issue ${label} has ${tasks.undisposedCount} unchecked task(s) with no explicit deferral/superseded/follow-up disposition`,
          number,
        );
      }
      for (const dref of tasks.dispositionRefs ?? []) {
        if (missingRefSet.has(dref)) {
          warn(
            'deferral-target-missing',
            `closed issue ${label} defers an unchecked task to #${dref}, which does not exist — likely a typo`,
            number,
          );
        }
      }
    }
  }

  // ---- Opportunistic work ----------------------------------------------
  let opportunisticTrackedMinutes = 0;
  for (const ref of opportunisticRefs) {
    const number = ref.number;
    const label = refLabel(ref);
    const rec = resolveRec(ref);
    if (!rec) {
      warn('opportunistic-no-evidence', `opportunistic issue ${label} listed in the sprint doc has no fetched data`, number);
      continue;
    }
    opportunisticTrackedMinutes += parseSessions(rec.body ?? '').trackedMinutes;

    // §5.4 opportunistic work still has to be reconcilable: it must carry the
    // sprint-<N> label and exactly one canonical investment: label. This is a
    // WARN, not a FAIL — per issue #587, opportunistic work is disclosed, never
    // a closure blocker — but the label drift must still surface.
    const oppLabels = rec.labels ?? [];
    if (sprintLabel && !oppLabels.includes(sprintLabel)) {
      warn(
        'opportunistic-label-missing',
        hasPaddedSprintLabel(oppLabels, sprintNumber)
          ? `opportunistic issue ${label} carries a zero-padded sprint label; the canonical label is "${sprintLabel}"`
          : `opportunistic issue ${label} is missing the "${sprintLabel}" label — it will not be found by a label-based sweep`,
        number,
      );
    }
    if (!hasCanonicalInvestment(oppLabels)) {
      warn(
        'opportunistic-investment-missing',
        `opportunistic issue ${label} lacks exactly one canonical investment: label`,
        number,
      );
    }
  }

  // ---- §13 Execution Evidence reconciliation --------------------------
  // Enforces two §18 closure-checklist requirements the parsed evidence rows make
  // checkable: every included work item has a *final* status marker, and every
  // completed item (scoped or opportunistic, per sprints.md §5.4) has a row.
  const FINAL_MARKERS = new Set(['✅', '⚠️', '❌']);
  const evidenceKeys = new Set(
    sprintDoc.executionEvidence.map((e) => keyOf(e.repo, e.issue)),
  );

  if (sprintDoc.executionEvidence.length === 0) {
    warn(
      'evidence-section-missing',
      'no §13 Execution Evidence rows were parsed from the sprint document — closure evidence cannot be reconciled from it',
    );
  } else {
    for (const row of sprintDoc.executionEvidence) {
      if (!FINAL_MARKERS.has(row.status)) {
        const rowLabel = row.repo ? `${row.repo}#${row.issue}` : `#${row.issue}`;
        fail(
          'evidence-row-pending',
          `§13 Execution Evidence row for ${rowLabel} has a non-final status marker (${row.status ?? 'none'})`,
          row.issue,
        );
      }
    }
    for (const ref of scopeRefs) {
      if (!evidenceKeys.has(keyOf(ref.repo, ref.number))) {
        fail('evidence-row-missing', `scoped issue ${refLabel(ref)} has no §13 Execution Evidence row`, ref.number);
      }
    }
    for (const ref of opportunisticRefs) {
      if (!evidenceKeys.has(keyOf(ref.repo, ref.number))) {
        warn(
          'opportunistic-evidence-row-missing',
          `opportunistic issue ${refLabel(ref)} has no §13 Execution Evidence row (required by doc/conventions/sprints.md §5.4)`,
          ref.number,
        );
      }
    }
  }

  // ---- Orphans & other same-window activity ----------------------------
  const orphans = [];
  const sameWindowOutsideScope = [];
  let otherSameWindowTrackedMinutes = 0;

  for (const issue of issues ?? []) {
    const number = Number(issue.number);
    if (
      scopeRefKeys.has(keyOf(issue.repo, number)) ||
      opportunisticRefKeys.has(keyOf(issue.repo, number))
    ) {
      continue;
    }
    const id = issue.repo ? `${issue.repo}#${number}` : number;
    const idLabel = issue.repo ? `${issue.repo}#${number}` : `#${number}`;
    const labels = issue.labels ?? [];
    const carriesSprintLabel =
      (sprintLabel && labels.includes(sprintLabel)) || hasPaddedSprintLabel(labels, sprintNumber);
    const inIteration = activeIteration && issue.projectIterationId === activeIteration.id;
    const isOrphan = carriesSprintLabel || inIteration;

    // Both orphan and plain out-of-scope work still consumed real time inside the
    // sprint window — that effort is `same_window_project_effort`. Count ONLY the
    // sessions whose dates fall in the window; an issue with sessions on both
    // sides of the sprint must not contribute its whole `trackedMinutes` total.
    const sessionInfo = parseSessions(issue.body ?? '');
    const inWindowSessions = sessionInfo.sessions.filter((s) =>
      sessionInWindow(s.date, startBound, endBound),
    );
    const inWindow = inWindowSessions.length > 0;
    const inWindowMinutes = inWindowSessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
    if (inWindow) {
      otherSameWindowTrackedMinutes += inWindowMinutes;
    }

    if (isOrphan) {
      orphans.push(id);
      warn(
        'orphan',
        `issue ${idLabel} carries a sprint-${sprintNumber} label or iteration assignment but is not in the sprint document's formal scope`,
        number,
      );
      continue;
    }

    if (inWindow) {
      sameWindowOutsideScope.push(id);
      warn(
        'same-window-outside-scope',
        `issue ${idLabel} has sessions inside the sprint window but is neither formal scope nor opportunistic — reported separately, formal scope unchanged`,
        number,
      );
    }
  }

  if (metricConfidence !== 'high') {
    warn(
      'metric-confidence',
      `metric confidence downgraded to "${metricConfidence}" — at least one scoped issue has malformed, open, missing, or unsynchronized Sessions evidence`,
    );
  }

  // `scope_issues` frontmatter is the *initially selected* count (sprints.md §6),
  // so reconcile it against the §5.1/§7 count BEFORE §5.3 changes — otherwise a
  // valid changed-scope doc (Sprint 001 removals, Sprint 003 additions) would
  // permanently fail. `scopeRefs` (post-§5.3) is still what gets audited.
  const initialCount = sprintDoc.initialScopeCount ?? scopeRefs.length;
  if (sprintDoc.scopeIssuesDeclared == null) {
    fail(
      'scope-count-mismatch',
      `frontmatter has no numeric "scope_issues" declaration — the §5.1/§7 table lists ${initialCount} issue(s) with nothing to reconcile it against`,
    );
  } else if (sprintDoc.scopeIssuesDeclared !== initialCount) {
    fail(
      'scope-count-mismatch',
      `frontmatter scope_issues=${sprintDoc.scopeIssuesDeclared} but the §5.1/§7 table lists ${initialCount} initially-selected issue(s)`,
    );
  }

  return {
    sprint: sprintDoc.sprint,
    sprintNumber,
    status: sprintDoc.status,
    formalScope: {
      total: scopeRefs.length,
      closed,
      open,
      issues: scopeRefs.map((r) => (r.repo ? `${r.repo}#${r.number}` : r.number)),
    },
    missingIteration,
    missingSprintLabel,
    missingInvestment,
    investmentMix,
    orphans,
    sameWindowOutsideScope,
    uncheckedTasks: {
      total: uncheckedTotal,
      undisposed: uncheckedUndisposed,
      byIssue: undisposedByIssue,
    },
    formalTrackedMinutes,
    opportunisticTrackedMinutes,
    otherSameWindowTrackedMinutes,
    metricConfidence,
    failures,
    warnings,
    ok: failures.length === 0,
  };
}

module.exports = {
  auditSprint,
  formatMinutes,
  hasCanonicalInvestment,
  investmentLabels,
  canonicalSprintLabel,
  hasPaddedSprintLabel,
  CANONICAL_INVESTMENT_LABELS,
};
