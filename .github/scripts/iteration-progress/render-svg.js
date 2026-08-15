'use strict';

const WIDTH = 420;
const HEIGHT = 92;

// Theme handling relies on the SVG being embedded via a repo-relative <img> in
// README.md, which GitHub serves raw (not proxied through camo) — so the
// `@media (prefers-color-scheme: dark)` block below is honored by the browser
// exactly like it would be for any other inline SVG.
const STYLE = `
  <style>
    :root {
      --bg: #ffffff;
      --border: #d0d7de;
      --text: #1f2328;
      --muted: #656d76;
      --track: #eaeef2;
      --fill: #2da44e;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117;
        --border: #30363d;
        --text: #e6edf3;
        --muted: #8b949e;
        --track: #21262d;
        --fill: #3fb950;
      }
    }
    text { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  </style>
`;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function frame(content, { height = HEIGHT } = {}) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img">` +
    STYLE +
    `<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${height - 1}" rx="6" fill="var(--bg)" stroke="var(--border)"/>` +
    content +
    '</svg>'
  );
}

function renderProgressSvg({ iteration, done, inProgress, todo, total, percent }) {
  const barX = 16;
  const barY = 44;
  const barWidth = WIDTH - 32;
  const barHeight = 10;
  const fillWidth = total === 0 ? 0 : Math.round((barWidth * percent) / 100);

  const title = escapeXml(iteration.title);
  const dateRange = escapeXml(`${iteration.startDate} → ${iteration.endDate}`);
  const summary = escapeXml(`Done ${done} · In Progress ${inProgress} · Todo ${todo} · Total ${total}`);

  const content = `
    <text x="16" y="24" font-size="13" font-weight="600" fill="var(--text)">${title}</text>
    <text x="${WIDTH - 16}" y="24" font-size="11" fill="var(--muted)" text-anchor="end">${dateRange}</text>
    <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="5" fill="var(--track)"/>
    <rect x="${barX}" y="${barY}" width="${fillWidth}" height="${barHeight}" rx="5" fill="var(--fill)"/>
    <text x="${WIDTH - 16}" y="${barY - 4}" font-size="11" fill="var(--muted)" text-anchor="end">${percent}%</text>
    <text x="16" y="76" font-size="11" fill="var(--muted)">${summary}</text>
  `;

  return frame(content);
}

function renderNoActiveIterationSvg() {
  const height = 56;
  const content = `
    <text x="16" y="32" font-size="13" fill="var(--muted)">No active iteration</text>
  `;
  return frame(content, { height });
}

module.exports = { renderProgressSvg, renderNoActiveIterationSvg, WIDTH, HEIGHT };
