'use strict';

// Thin GitHub data layer for the sprint-closure audit CLI. Kept free of audit
// logic on purpose (mirrors iteration-progress/fetch-project-data.js): it only
// gathers raw Issue + Project state and hands it to auditSprint().
//
// Requires a token with read access to the org Project (env GH_TOKEN /
// PROJECTS_TOKEN) — the CLI never runs in CI, only on demand before a sprint
// close-out, so no fixture layer is needed here.

const { parseUncheckedTasks } = require('./parse-issue-evidence.js');

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const PROJECT_QUERY = `
  query($owner: String!, $number: Int!, $cursor: String) {
    user(login: $owner) {
      projectV2(number: $number) {
        iterationField: field(name: "Iteration") {
          ... on ProjectV2IterationField {
            id
            configuration {
              iterations { id title startDate duration }
              completedIterations { id title startDate duration }
            }
          }
        }
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            iteration: fieldValueByName(name: "Iteration") {
              ... on ProjectV2ItemFieldIterationValue { iterationId }
            }
            content {
              ... on Issue {
                number
                state
                body
                repository { nameWithOwner }
                labels(first: 100) { totalCount nodes { name } }
              }
            }
          }
        }
      }
    }
  }
`;

async function graphql(query, variables, token) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${payload.errors.map((e) => e.message).join('; ')}`);
  }
  return payload.data;
}

async function restIssue(nameWithOwner, number, token) {
  const response = await fetch(`https://api.github.com/repos/${nameWithOwner}/issues/${number}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub REST request failed for #${number}: ${response.status}`);
  }
  const data = await response.json();
  return {
    number: data.number,
    state: String(data.state ?? '').toUpperCase(),
    body: data.body ?? '',
    labels: (data.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name)),
    projectStatus: null,
    projectIterationId: null,
  };
}

function iterationTitleFor(sprintNumber) {
  return `Sprint ${sprintNumber}`;
}

// Full label list for one Issue via paginated REST — used only when the GraphQL
// board query reports more labels than the 100 it returned, so a required label
// (sprint-<N> / investment:) past that page can't be mistaken for missing.
async function restLabels(nameWithOwner, number, token) {
  const labels = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${nameWithOwner}/issues/${number}/labels?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
    );
    if (!response.ok) {
      throw new Error(`GitHub REST labels request failed for #${number}: ${response.status}`);
    }
    const batch = await response.json();
    labels.push(...batch.map((l) => l.name));
    if (batch.length < 100) {
      break;
    }
  }
  return labels;
}

// Best-effort: Issues touched inside the sprint window that carry an investment:
// or sprint-<N> label but never made it onto the Project board. Without this,
// off-board same-window work is invisible to the audit. Failures here are
// downgraded to a warning so the report still renders.
async function searchWindowIssues({ nameWithOwner, sprintNumber, since, token }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since ?? '')) {
    console.warn(
      '::warning::no valid sprint "started" date — skipping the off-board same-window issue search (the audit will also FAIL sprint-window-unknown)',
    );
    return [];
  }
  // Comma-separated `label:` is AND semantics on GitHub search, and the three
  // investment: labels are mutually exclusive — so run one search per candidate
  // label and merge. Each is independently best-effort.
  const candidateLabels = [
    'investment: product',
    'investment: product-engineering',
    'investment: dev-platform',
    `sprint-${sprintNumber}`,
  ];
  const merged = new Map();
  const MAX_PAGES = 10; // 1000 results per label — well beyond any real sprint
  for (const label of candidateLabels) {
    const query = `repo:${nameWithOwner} is:issue updated:>=${since} label:"${label}"`;
    try {
      let page = 1;
      let total = 0;
      let fetched = 0;
      for (; page <= MAX_PAGES; page += 1) {
        const url = `https://api.github.com/search/issues?per_page=100&page=${page}&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        total = data.total_count ?? total;
        const items = data.items ?? [];
        fetched += items.length;
        for (const item of items) {
          merged.set(item.number, {
            number: item.number,
            state: String(item.state ?? '').toUpperCase(),
            body: item.body ?? '',
            labels: (item.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name)),
            projectStatus: null,
            projectIterationId: null,
          });
        }
        if (items.length < 100) {
          break;
        }
      }
      if (fetched < total) {
        console.warn(
          `::warning::same-window search for label "${label}" hit the ${MAX_PAGES}-page cap (${fetched}/${total}); some off-board same-window work may be under-reported`,
        );
      }
    } catch (error) {
      console.warn(
        `::warning::same-window issue search for label "${label}" failed (${error.message}); off-board same-window work may be under-reported`,
      );
    }
  }
  return [...merged.values()];
}

async function fetchAuditData({
  owner,
  repo,
  projectNumber,
  sprintNumber,
  scopeRefs = [],
  opportunisticRefs = [],
  sprintStarted = null,
  token,
}) {
  if (!token) {
    throw new Error('A GitHub token is required (set GH_TOKEN or PROJECTS_TOKEN)');
  }
  const defaultRepo = `${owner}/${repo}`;
  const key = (r, n) => `${r || defaultRepo}#${n}`;

  // 1. Walk the project board once. Keep cross-repo items too — a sprint doc can
  //    legitimately scope issues from another repo (Sprint 003 / sushigo-dev-lab).
  const boardIssues = new Map();
  let iterationField = null;
  let cursor = null;
  let hasNext = true;
  while (hasNext) {
    const data = await graphql(PROJECT_QUERY, { owner, number: projectNumber, cursor }, token);
    const project = data?.user?.projectV2;
    if (!project) {
      throw new Error(`Project #${projectNumber} not found for owner "${owner}"`);
    }
    iterationField = project.iterationField ?? iterationField;
    for (const node of project.items.nodes) {
      const content = node.content;
      if (!content?.number) {
        continue;
      }
      const itemRepo = content.repository?.nameWithOwner ?? defaultRepo;
      let labels = (content.labels?.nodes ?? []).map((l) => l.name);
      if ((content.labels?.totalCount ?? 0) > labels.length) {
        // More labels than the query returned — refetch the full list so a
        // required label past the first page is never seen as missing.
        labels = await restLabels(itemRepo, content.number, token);
      }
      boardIssues.set(key(itemRepo, content.number), {
        number: content.number,
        repo: itemRepo === defaultRepo ? null : itemRepo,
        state: String(content.state ?? '').toUpperCase(),
        body: content.body ?? '',
        labels,
        projectStatus: node.status?.name ?? null,
        projectIterationId: node.iteration?.iterationId ?? null,
      });
    }
    hasNext = project.items.pageInfo.hasNextPage;
    cursor = project.items.pageInfo.endCursor;
  }

  // 2. Resolve the sprint's iteration by title.
  const allIterations = [
    ...(iterationField?.configuration?.iterations ?? []),
    ...(iterationField?.configuration?.completedIterations ?? []),
  ];
  const wantTitle = iterationTitleFor(sprintNumber);
  const match = allIterations.find((it) => it.title === wantTitle);
  const activeIteration = match ? { id: match.id, title: match.title } : null;

  // 3. Backfill scoped / opportunistic issues not on the board — each from its
  //    own recorded repo.
  const needed = new Map();
  for (const ref of [...scopeRefs, ...opportunisticRefs]) {
    needed.set(key(ref.repo, ref.number), ref);
  }
  for (const [k, ref] of needed) {
    if (!boardIssues.has(k)) {
      const refRepo = ref.repo || defaultRepo;
      const rec = await restIssue(refRepo, ref.number, token);
      if (rec) {
        rec.repo = refRepo === defaultRepo ? null : refRepo;
        boardIssues.set(k, rec);
      }
    }
  }

  // 4. Backfill off-board, in-window labelled issues so same-window activity
  //    (issue #587 §5) is not silently dropped just because it never reached the
  //    Project board. (Default repo only — best-effort.)
  const windowIssues = await searchWindowIssues({
    nameWithOwner: defaultRepo,
    sprintNumber,
    since: sprintStarted,
    token,
  });
  for (const rec of windowIssues) {
    const k = key(null, rec.number);
    if (!boardIssues.has(k)) {
      rec.repo = null;
      boardIssues.set(k, rec);
    }
  }

  // 5. Verify each `#NNN` a scoped issue's disposition points at actually exists
  //    (default repo). A typo'd follow-up target -> WARN deferral-target-missing.
  const scopeKeys = new Set([...scopeRefs, ...opportunisticRefs].map((r) => key(r.repo, r.number)));
  const dispositionRefs = new Set();
  for (const [k, rec] of boardIssues) {
    if (!scopeKeys.has(k)) {
      continue;
    }
    for (const n of parseUncheckedTasks(rec.body ?? '').dispositionRefs ?? []) {
      dispositionRefs.add(n);
    }
  }
  const missingRefs = [];
  for (const n of dispositionRefs) {
    if (!boardIssues.has(key(null, n))) {
      try {
        const exists = await restIssue(defaultRepo, n, token);
        if (!exists) {
          missingRefs.push(n);
        }
      } catch {
        // best-effort — an API hiccup must not turn a real deferral into a WARN
      }
    }
  }

  return { issues: [...boardIssues.values()], activeIteration, missingRefs };
}

module.exports = { fetchAuditData, iterationTitleFor, searchWindowIssues, restLabels, PROJECT_QUERY };
