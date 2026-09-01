'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { selectE2e, globToRegExp } = require('../select-e2e.js');

const MAP_PATH = path.join(__dirname, '..', '..', '..', 'e2e-impact-map.json');

const raw = fs.readFileSync(MAP_PATH, 'utf8');
const map = JSON.parse(raw);

test('the checked-in e2e-impact-map.json is valid JSON with an entries array', () => {
  assert.ok(Array.isArray(map.entries));
  assert.ok(map.entries.length > 0);
});

test('every entry has non-empty string `when` and `run` glob arrays', () => {
  for (const entry of map.entries) {
    assert.ok(Array.isArray(entry.when) && entry.when.length > 0, `entry ${entry.area}: when`);
    assert.ok(Array.isArray(entry.run) && entry.run.length > 0, `entry ${entry.area}: run`);
    for (const g of [...entry.when, ...entry.run]) {
      assert.equal(typeof g, 'string');
      assert.doesNotThrow(() => globToRegExp(g), `glob compiles: ${g}`);
    }
  }
});

test('every `run` glob targets the Cypress e2e spec directory', () => {
  for (const entry of map.entries) {
    for (const g of entry.run) {
      assert.ok(
        g.startsWith('code/webapp/cypress/e2e/') && g.endsWith('.cy.ts'),
        `run glob out of place in ${entry.area}: ${g}`,
      );
    }
  }
});

test('a representative change in each mapped area resolves to a non-full targeted set in [wip]', () => {
  const sample = {
    attendance: 'code/api/app/Actions/Attendances/CheckInController.php',
    payroll: 'code/api/app/Services/PayrollCalculator.php',
    employees: 'code/api/app/Actions/Employee/CreateEmployee.php',
    'leaves-and-vacations': 'code/api/app/Actions/Leaves/ApproveLeave.php',
    cash: 'code/api/app/Actions/CashAdjustments/RegisterAdjustment.php',
    inventory: 'code/api/routes/api/inventory.php',
    'product-catalog-and-pricing': 'code/api/routes/api/pricing.php',
    purchasing: 'code/webapp/src/features/purchasing/suppliers/SupplierList.tsx',
    dishes: 'code/api/routes/api/dishes.php',
    'auth-and-permissions': 'code/api/routes/api/auth.php',
    'media-uploads': 'code/api/routes/api/media.php',
  };
  for (const entry of map.entries) {
    const file = sample[entry.area];
    assert.ok(file, `test needs a sample path for area "${entry.area}"`);
    const r = selectE2e({ mode: 'wip', changedFiles: [file], impactMap: map });
    assert.equal(r.selection, 'targeted', `area ${entry.area} should be targeted, got ${r.selection} (${r.reason})`);
    assert.ok(r.specs.length > 0);
  }
});

// Dependency-safety regressions the map must not reintroduce (see the file's own `_comment`).

test('a wide-blast-radius shared file (auth.store.ts) is NOT narrow-mapped — falls back to full', () => {
  const r = selectE2e({
    mode: 'wip',
    changedFiles: ['code/webapp/src/stores/auth.store.ts'],
    impactMap: map,
  });
  assert.equal(r.selection, 'full', `auth.store.ts must fall back to full, got ${r.selection} (${r.reason})`);
});

test('an Employee change pulls in the FULL attendance + payroll spec sets via `includes`', () => {
  const r = selectE2e({
    mode: 'wip',
    changedFiles: ['code/api/app/Actions/Employee/CreateEmployee.php'],
    impactMap: map,
  });
  assert.equal(r.selection, 'targeted');
  const has = (frag) => r.specs.some((s) => s.includes(frag));
  // the employees area's own specs
  assert.ok(has('employee-'), 'employee-* missing');
  // attendance area, in full (own run = attendance-* + punctuality-*)
  assert.ok(has('attendance-'), 'attendance-* missing');
  assert.ok(has('punctuality-'), 'punctuality-* missing (attendance area not pulled in full)');
  // payroll area, in full (own run = payroll-* + closed-period-* + reopen-reclose-period)
  assert.ok(has('payroll-'), 'payroll-* missing');
  assert.ok(has('closed-period-'), 'closed-period-* missing (payroll area not pulled in full)');
  assert.ok(has('reopen-reclose-period'), 'reopen-reclose-period missing');
});

test('every `includes` value names a real area', () => {
  const areas = new Set(map.entries.map((e) => e.area));
  for (const entry of map.entries) {
    for (const inc of (entry.includes || [])) {
      assert.ok(areas.has(inc), `entry "${entry.area}" includes unknown area "${inc}"`);
    }
  }
});

test('a shared inventory / catalog route change also covers dependent purchasing flows', () => {
  for (const file of [
    'code/api/routes/api/inventory.php',
    'code/api/routes/api/items.php',
    'code/api/routes/api/product-catalog.php',
    'code/api/routes/api/pricing.php',
  ]) {
    const r = selectE2e({ mode: 'wip', changedFiles: [file], impactMap: map });
    assert.equal(r.selection, 'targeted', `${file}: ${r.reason}`);
    assert.ok(r.specs.some((s) => s.includes('suppliers-')), `${file}: suppliers-* missing`);
    assert.ok(r.specs.some((s) => s.includes('purchase-')), `${file}: purchase-* missing`);
  }
});
