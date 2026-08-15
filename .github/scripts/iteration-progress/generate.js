#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { fetchProjectData } = require('./fetch-project-data.js');
const { normalizeProjectData } = require('./normalize.js');
const { calculatePercent } = require('./calculate.js');
const { renderProgressSvg, renderNoActiveIterationSvg } = require('./render-svg.js');

const PROJECT_OWNER = process.env.PROJECT_OWNER || 'pakodiazdev';
const PROJECT_NUMBER = Number(process.env.PROJECT_NUMBER || 7);
const OUTPUT_PATH = path.join(__dirname, '..', '..', 'badges', 'iteration-progress.svg');

async function main() {
  const token = process.env.PROJECTS_TOKEN;
  if (!token) {
    throw new Error('PROJECTS_TOKEN environment variable is required');
  }

  const projectData = await fetchProjectData({ owner: PROJECT_OWNER, number: PROJECT_NUMBER, token });
  const stats = normalizeProjectData(projectData, new Date());

  if (!stats.hasActiveIteration) {
    console.log('No active iteration for today — rendering the empty-state badge.');
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, renderNoActiveIterationSvg());
    return;
  }

  if (stats.unexpectedCount > 0) {
    console.log(
      `::warning::${stats.unexpectedCount} item(s) in "${stats.iteration.title}" have unexpected ` +
        `Status values: ${stats.unexpectedStatuses.join(', ')}`,
    );
  }

  const percent = calculatePercent(stats);
  const svg = renderProgressSvg({ ...stats, percent });

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, svg);

  console.log(
    `Rendered "${stats.iteration.title}": ${stats.done}/${stats.total} done (${percent}%) -> ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
});
