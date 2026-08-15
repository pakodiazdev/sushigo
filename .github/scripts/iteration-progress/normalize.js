'use strict';

const KNOWN_STATUSES = new Set(['Done', 'In Progress', 'Todo']);

function parseDateOnly(value) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Exclusive upper bound of the iteration's window — one day *past* its last
// day. Used for matching (`ref < end`); never for display.
function iterationBoundaryDate(iteration) {
  const end = parseDateOnly(iteration.startDate);
  end.setUTCDate(end.getUTCDate() + iteration.duration);
  return end;
}

// Inclusive last calendar day of the iteration — what a human expects to see
// as the "end date" (matches what GitHub Projects itself displays).
function iterationLastDay(iteration) {
  const lastDay = iterationBoundaryDate(iteration);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  return lastDay;
}

function pickActiveIteration(iterations, referenceDate) {
  const ref = parseDateOnly(referenceDate);
  return (
    iterations.find((iteration) => {
      const start = parseDateOnly(iteration.startDate);
      const end = iterationBoundaryDate(iteration);
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
      endDate: iterationLastDay(active).toISOString().slice(0, 10),
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
