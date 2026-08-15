'use strict';

function calculatePercent({ done, total }) {
  if (total === 0) {
    return 0;
  }
  return Math.round((done / total) * 100);
}

module.exports = { calculatePercent };
