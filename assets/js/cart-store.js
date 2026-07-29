/* ═══════════════════════════════════════════════════════════
   INFINITEAG — cart-store.js
   Centralized plant-shop cart state. Persists only
   {productId, quantity} pairs to localStorage — names and
   prices are always resolved live from InfiniteAgPlantCatalog,
   never trusted from storage. No customer/contact/payment data
   is ever stored here.
   ─────────────────────────────────────────────────────────── */

'use strict';

(function (root) {
  var config = root.InfiniteAgShopConfig ||
    (typeof require === 'function' ? require('./shop-config.js') : null);
  var catalog = root.InfiniteAgPlantCatalog ||
    (typeof require === 'function' ? require('./plant-data.js') : null);

  var STORAGE_KEY = config.cartStorageKey;
  var MAX_QTY = config.maximumQuantityPerProduct;

  /* In-memory fallback so this module never throws if localStorage is
     unavailable (private browsing, quota exceeded, non-browser test env).
     Probed once at module load, not on every read/write. */
  var memoryFallback = Object.create(null);
  var storage = (function () {
    try {
      if (typeof localStorage !== 'undefined') {
        var probeKey = '__infiniteag_probe__';
        localStorage.setItem(probeKey, '1');
        localStorage.removeItem(probeKey);
        return localStorage;
      }
    } catch (e) { /* fall through to memory */ }
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memoryFallback, k) ? memoryFallback[k] : null; },
      setItem: function (k, v) { memoryFallback[k] = String(v); },
    };
  })();

  function isValidQuantity(q) {
    return typeof q === 'number' && Number.isInteger(q) && q >= 1 && q <= MAX_QTY;
  }

  /* Shared by every page's quantity stepper so validation wording and
     rules never drift between the shop and cart pages. */
  function parseQuantity(raw) {
    raw = String(raw).trim();
    if (raw === '') return { qty: null, error: 'Enter a quantity.' };
    if (!/^\d+$/.test(raw)) return { qty: null, error: 'Enter a whole number.' };
    var qty = parseInt(raw, 10);
    if (qty < 1) return { qty: null, error: 'Minimum quantity is 1.' };
    if (qty > MAX_QTY) return { qty: null, error: 'Maximum quantity is ' + MAX_QTY + ' per plant (temporary limit).' };
    return { qty: qty, error: null };
  }

  /* Drops unknown product ids and invalid quantities rather than
     guessing or clamping — malformed/stale entries are discarded. */
  function sanitize(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    var seen = Object.create(null);
    var out = [];
    rawItems.forEach(function (entry) {
      if (!entry || typeof entry !== 'object') return;
      var productId = entry.productId;
      var quantity = entry.quantity;
      if (typeof productId !== 'string' || !catalog.getById(productId)) return;
      if (!isValidQuantity(quantity)) return;
      if (seen[productId]) return; // no duplicate rows for the same plant
      seen[productId] = true;
      out.push({ productId: productId, quantity: quantity });
    });
    return out;
  }

  function readItems() {
    var raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      return [];
    }
    if (!raw) return [];
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return []; // malformed JSON never crashes the app
    }
    return sanitize(parsed);
  }

  function writeItems(items) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { /* storage unavailable/full — cart just won't persist */ }
  }

  var state = readItems();
  var listeners = [];

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(getItems()); } catch (e) { /* listener errors shouldn't break the cart */ }
    });
  }

  function persist() {
    writeItems(state);
    notify();
  }

  function getItems() {
    return state.map(function (i) { return { productId: i.productId, quantity: i.quantity }; });
  }

  /* Joins persisted {productId, quantity} with the live catalog so the
     UI never trusts a persisted name/price. */
  function getEnrichedItems() {
    return state.reduce(function (acc, item) {
      var product = catalog.getById(item.productId);
      if (!product) return acc; // catalog changed since persisting; skip silently
      acc.push({
        product: product,
        quantity: item.quantity,
        lineTotalInCents: product.priceInCents * item.quantity,
      });
      return acc;
    }, []);
  }

  function getTotalUnits() {
    return getEnrichedItems().reduce(function (sum, i) { return sum + i.quantity; }, 0);
  }

  function getSubtotalInCents() {
    return getEnrichedItems().reduce(function (sum, i) { return sum + i.lineTotalInCents; }, 0);
  }

  function addItem(productId, quantity) {
    var product = catalog.getById(productId);
    if (!product) return { ok: false, error: 'unknown-product' };
    if (!product.availability) return { ok: false, error: 'unavailable' };
    if (!isValidQuantity(quantity)) return { ok: false, error: 'invalid-quantity' };

    var existing = state.filter(function (i) { return i.productId === productId; })[0];
    var nextQty = (existing ? existing.quantity : 0) + quantity;
    if (nextQty > MAX_QTY) nextQty = MAX_QTY;

    if (existing) {
      existing.quantity = nextQty;
    } else {
      state.push({ productId: productId, quantity: nextQty });
    }
    persist();
    return { ok: true };
  }

  function setItemQuantity(productId, quantity) {
    if (!isValidQuantity(quantity)) return { ok: false, error: 'invalid-quantity' };
    var existing = state.filter(function (i) { return i.productId === productId; })[0];
    if (!existing) return { ok: false, error: 'not-in-cart' };
    existing.quantity = quantity;
    persist();
    return { ok: true };
  }

  function removeItem(productId) {
    state = state.filter(function (i) { return i.productId !== productId; });
    persist();
    return { ok: true };
  }

  function clear() {
    state = [];
    persist();
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  /* Convenience: wires a header badge element to live cart totals.
     Hides the badge at zero rather than showing "0". */
  function mountBadge(el) {
    if (!el) return;
    function render() {
      var units = getTotalUnits();
      el.textContent = String(units);
      el.hidden = units === 0;
      var link = el.closest ? el.closest('a') : null;
      if (link) {
        link.setAttribute('aria-label', units === 0
          ? 'View cart, empty'
          : 'View cart, ' + units + (units === 1 ? ' item' : ' items'));
      }
    }
    render();
    subscribe(render);
  }

  var api = {
    MAX_QUANTITY: MAX_QTY,
    getItems: getItems,
    getEnrichedItems: getEnrichedItems,
    getTotalUnits: getTotalUnits,
    getSubtotalInCents: getSubtotalInCents,
    addItem: addItem,
    setItemQuantity: setItemQuantity,
    removeItem: removeItem,
    clear: clear,
    subscribe: subscribe,
    mountBadge: mountBadge,
    isValidQuantity: isValidQuantity,
    parseQuantity: parseQuantity,
    _sanitize: sanitize, // exposed for the self-check only
  };

  root.InfiniteAgCart = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
