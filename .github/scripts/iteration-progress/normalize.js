'use strict';

const KNOWN_STATUSES = new Set(['Done', 'In Progress', 'Todo']);

function parseDateOnly(value) {
  return value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
}

function iterationEndDate(iteration) {
  const end = parseDateOnly(iteration.startDate);
  end.setUTCDate(end.getUTCDate() + iteration.duration);
  return end;
}

function pickActiveIteration(iterations, referenceDate) {
  const ref = parseDateOnly(referenceDate);
  return (
    iterations.find((iteration) => {
      const start = parseDateOnly(iteration.startDate);
      const end = iterationEndDate(iteration);
      return ref >= start && ref < end;
    }) ?? null
  );
}

function normalizeProjectData({ iterations, items }, referenceDate) {
  const active = pickActiveIteration(iterations, referenceDate);
  if (!active) {
    return { hasActiveIteration: false };
  }

  let done = 0;
  let inProgress = 0;
  let todo = 0;
  const unexpectedStatuses = new Set();

  const activeItems = items.filter((item) => item.iterationId === active.id);
  for (const item of activeItems) {
    switch (item.status) {
      case 'Done':
        done += 1;
        break;
      case 'In Progress':
        inProgress += 1;
        break;
      case 'Todo':
        todo += 1;
        break;
      default:
        unexpectedStatuses.add(String(item.status));
    }
  }

  const total = activeItems.length;
  const unexpectedCount = total - done - inProgress - todo;

  return {
    hasActiveIteration: true,
    iteration: {
      title: active.title,
      startDate: active.startDate,
      endDate: iterationEndDate(active).toISOString().slice(0, 10),
    },
    done,
    inProgress,
    todo,
    unexpectedCount,
    unexpectedStatuses: Array.from(unexpectedStatuses),
    total,
  };
}

module.exports = { KNOWN_STATUSES, pickActiveIteration, normalizeProjectData };
