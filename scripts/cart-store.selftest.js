/* ═══════════════════════════════════════════════════════════
   Dev-only self-check for the plant-shop cart logic.
   Not loaded by any page — run with: node scripts/cart-store.selftest.js
   No test framework in this repo, so this is a plain assert script
   (matches the rest of the codebase: no build step, no bundler).
   ─────────────────────────────────────────────────────────── */

'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const catalog = require(path.join(__dirname, '..', 'assets', 'js', 'plant-data.js'));
const cart = require(path.join(__dirname, '..', 'assets', 'js', 'cart-store.js'));

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('  ok — ' + name);
}

console.log('Catalog data integrity');
check('has all four categories with the exact existing spelling', () => {
  const labels = catalog.categories.map(c => c.label);
  assert.deepEqual(labels, ['Herbs', 'Shrubs', 'Vegetables', 'Fruits']);
});
check('every plant is $15.00 (1500 cents)', () => {
  assert.ok(catalog.plants.every(p => p.priceInCents === 1500));
});
check('no duplicate ids/slugs', () => {
  const ids = catalog.plants.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
});
check('category counts match products/index.html panels', () => {
  const count = slug => catalog.plants.filter(p => p.categorySlug === slug).length;
  assert.equal(count('herbs'), 8);
  assert.equal(count('shrubs'), 12);
  assert.equal(count('vegetables'), 7);
  assert.equal(count('fruits'), 6);
});

console.log('Shared quantity-field parsing (used by both the shop and cart pages)');
check('parseQuantity accepts a valid whole number', () => {
  assert.deepEqual(cart.parseQuantity('4'), { qty: 4, error: null });
});
check('parseQuantity rejects empty, non-numeric, decimal, and over-max input', () => {
  assert.equal(cart.parseQuantity('').qty, null);
  assert.equal(cart.parseQuantity('abc').qty, null);
  assert.equal(cart.parseQuantity('2.5').qty, null);
  assert.equal(cart.parseQuantity(String(cart.MAX_QUANTITY + 1)).qty, null);
});

console.log('Cart quantity validation');
check('rejects zero, negative, decimal, NaN, and over-max quantities', () => {
  const plant = catalog.plants[0];
  assert.equal(cart.addItem(plant.id, 0).ok, false);
  assert.equal(cart.addItem(plant.id, -1).ok, false);
  assert.equal(cart.addItem(plant.id, 1.5).ok, false);
  assert.equal(cart.addItem(plant.id, NaN).ok, false);
  assert.equal(cart.addItem(plant.id, cart.MAX_QUANTITY + 1).ok, false);
  assert.equal(cart.getTotalUnits(), 0);
});
check('accepts a valid quantity at the minimum boundary', () => {
  cart.clear();
  const plant = catalog.plants[0];
  const result = cart.addItem(plant.id, 1);
  assert.equal(result.ok, true);
  assert.equal(cart.getTotalUnits(), 1);
});

console.log('Cart merge + math');
check('adding the same plant twice merges quantity into one row', () => {
  cart.clear();
  const plant = catalog.plants[0];
  cart.addItem(plant.id, 2);
  cart.addItem(plant.id, 3);
  const items = cart.getItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 5);
});
check('adding multiple different plants keeps separate rows', () => {
  cart.clear();
  cart.addItem(catalog.plants[0].id, 1);
  cart.addItem(catalog.plants[1].id, 2);
  assert.equal(cart.getItems().length, 2);
  assert.equal(cart.getTotalUnits(), 3);
});
check('line totals and subtotal use integer cents', () => {
  cart.clear();
  cart.addItem(catalog.plants[0].id, 3); // 3 x 1500 = 4500
  cart.addItem(catalog.plants[1].id, 2); // 2 x 1500 = 3000
  const enriched = cart.getEnrichedItems();
  const lineTotals = enriched.map(i => i.lineTotalInCents).sort((a, b) => a - b);
  assert.deepEqual(lineTotals, [3000, 4500]);
  assert.equal(cart.getSubtotalInCents(), 7500);
  enriched.forEach(i => assert.equal(Number.isInteger(i.lineTotalInCents), true));
});
check('setItemQuantity updates an existing line, rejects invalid input', () => {
  cart.clear();
  cart.addItem(catalog.plants[0].id, 1);
  assert.equal(cart.setItemQuantity(catalog.plants[0].id, 4).ok, true);
  assert.equal(cart.getTotalUnits(), 4);
  assert.equal(cart.setItemQuantity(catalog.plants[0].id, 0).ok, false);
  assert.equal(cart.getTotalUnits(), 4); // unchanged after rejected update
});
check('removeItem drops the line entirely', () => {
  cart.clear();
  cart.addItem(catalog.plants[0].id, 1);
  cart.removeItem(catalog.plants[0].id);
  assert.equal(cart.getItems().length, 0);
});

console.log('Persisted-data validation (sanitize)');
check('drops unknown product ids', () => {
  const out = cart._sanitize([{ productId: 'not-a-real-plant', quantity: 2 }]);
  assert.equal(out.length, 0);
});
check('drops invalid quantities (zero, decimal, string, too large)', () => {
  const id = catalog.plants[0].id;
  const out = cart._sanitize([
    { productId: id, quantity: 0 },
    { productId: id, quantity: 2.5 },
    { productId: id, quantity: '3' },
    { productId: id, quantity: cart.MAX_QUANTITY + 100 },
  ]);
  assert.equal(out.length, 0);
});
check('drops duplicate rows for the same product, keeping the first', () => {
  const id = catalog.plants[0].id;
  const out = cart._sanitize([
    { productId: id, quantity: 2 },
    { productId: id, quantity: 5 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].quantity, 2);
});
check('malformed shapes (not an array, null entries, missing fields) never throw', () => {
  assert.deepEqual(cart._sanitize(null), []);
  assert.deepEqual(cart._sanitize('not json'), []);
  assert.deepEqual(cart._sanitize([null, undefined, {}, { productId: 123 }]), []);
});

cart.clear();
console.log(`\n${passed} checks passed.`);
