'use strict';

// Self-rendered, theme-aware status badges (label + colored message, shields.io "flat" shape)
// so the README doesn't depend on GitHub's per-workflow badge.svg — which only reflects an
// entire workflow's status, not one job's, and stopped being meaningful once #560 unified six
// workflows into one ci.yml. Same rendering approach as .github/scripts/iteration-progress/
// (an inline <style> with a `prefers-color-scheme: dark` block, served raw from the `badges`
// branch via a repo-relative <img>, per #462).

const HEIGHT = 20;
const FONT_SIZE = 11;
const H_PADDING = 6;
// No real font metrics available in a headless script — this approximates Segoe UI/Helvetica
// at 11px closely enough for a compact badge; shields.io itself uses a similar fixed-width
// estimate rather than measuring glyphs.
const CHAR_WIDTH = 6.2;

const COLORS = {
  success: { light: '#2da44e', dark: '#3fb950' },
  failure: { light: '#cf222e', dark: '#f85149' },
  unknown: { light: '#8b949e', dark: '#8b949e' },
};

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textWidth(text) {
  return Math.round(text.length * CHAR_WIDTH) + H_PADDING * 2;
}

function renderStatusBadge({ label, message, status = 'unknown' }) {
  const color = COLORS[status] || COLORS.unknown;
  const labelWidth = textWidth(label);
  const messageWidth = textWidth(message);
  const width = labelWidth + messageWidth;
  const labelText = escapeXml(label);
  const messageText = escapeXml(message);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" ` +
    `viewBox="0 0 ${width} ${HEIGHT}" role="img" aria-label="${labelText}: ${messageText}">` +
    `<style>
      .label-bg { fill: #555; }
      .msg-bg { fill: ${color.light}; }
      @media (prefers-color-scheme: dark) {
        .label-bg { fill: #30363d; }
        .msg-bg { fill: ${color.dark}; }
      }
      text { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; fill: #fff; }
    </style>` +
    `<rect class="label-bg" width="${labelWidth}" height="${HEIGHT}" rx="3"/>` +
    `<rect class="label-bg" x="${Math.max(labelWidth - 3, 0)}" width="3" height="${HEIGHT}"/>` +
    `<rect class="msg-bg" x="${labelWidth}" width="${messageWidth}" height="${HEIGHT}" rx="3"/>` +
    `<rect class="msg-bg" x="${labelWidth}" width="3" height="${HEIGHT}"/>` +
    `<text x="${labelWidth / 2}" y="${HEIGHT / 2 + 4}" font-size="${FONT_SIZE}" text-anchor="middle">${labelText}</text>` +
    `<text x="${labelWidth + messageWidth / 2}" y="${HEIGHT / 2 + 4}" font-size="${FONT_SIZE}" text-anchor="middle">${messageText}</text>` +
    '</svg>'
  );
}

module.exports = { renderStatusBadge, HEIGHT };
