/* ═══════════════════════════════════════════════════════════
   INFINITEAG — plant-shop.js
   Renders the plant catalog into filterable, accessible cards.
   Depends on shop-config.js, plant-data.js, cart-store.js
   (loaded before this file).
   ─────────────────────────────────────────────────────────── */

'use strict';

(function () {
  var catalog = window.InfiniteAgPlantCatalog;
  var cart = window.InfiniteAgCart;

  var filtersEl = document.getElementById('shop-filters');
  var gridEl = document.getElementById('shop-grid');
  var cardTemplate = document.getElementById('shop-card-template');
  if (!catalog || !cart || !filtersEl || !gridEl || !cardTemplate) return;

  var CHECK_ICON = '<svg class="shop-filter__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  var activeCategory = 'all';

  function currency(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  /* ── Filters ─────────────────────────────────────────────── */
  var filterDefs = [{ slug: 'all', label: 'All Plants' }].concat(catalog.categories);

  filterDefs.forEach(function (def) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shop-filter';
    btn.dataset.filter = def.slug;
    btn.setAttribute('aria-pressed', def.slug === activeCategory ? 'true' : 'false');
    btn.innerHTML = CHECK_ICON + '<span>' + def.label + '</span>';
    btn.addEventListener('click', function () {
      activeCategory = def.slug;
      Array.prototype.forEach.call(filtersEl.querySelectorAll('.shop-filter'), function (b) {
        b.setAttribute('aria-pressed', b.dataset.filter === activeCategory ? 'true' : 'false');
      });
      renderGrid();
    });
    filtersEl.appendChild(btn);
  });

  /* ── Cards ───────────────────────────────────────────────── */
  function announce(cardStatusEl, text) {
    cardStatusEl.textContent = text;
  }

  function buildCard(plant) {
    var node = cardTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle('shop-card--unavailable', !plant.availability);

    var img = node.querySelector('.shop-card__image');
    img.src = plant.image;
    img.alt = plant.imageAlt;
    img.loading = 'lazy';
    img.width = 400;
    img.height = 400;

    if (!plant.availability) {
      var badge = document.createElement('span');
      badge.className = 'shop-card__badge';
      badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg><span>Currently Unavailable</span>';
      node.querySelector('.shop-card__image-wrap').appendChild(badge);
    }

    node.querySelector('.shop-card__category').textContent = plant.category;
    node.querySelector('.shop-card__name').textContent = plant.name;
    node.querySelector('.shop-card__price').textContent = currency(plant.priceInCents) + ' each';

    var decreaseBtn = node.querySelector('[data-action="decrease"]');
    var increaseBtn = node.querySelector('[data-action="increase"]');
    var qtyInput = node.querySelector('.qty-stepper__input');
    var qtyError = node.querySelector('.shop-card__qty-error');
    var addBtn = node.querySelector('[data-action="add-to-cart"]');
    var statusEl = node.querySelector('.shop-card__status');

    qtyInput.max = String(cart.MAX_QUANTITY);

    function clearError() {
      qtyError.textContent = '';
      qtyInput.removeAttribute('aria-invalid');
    }

    function showError(msg) {
      qtyError.textContent = msg;
      qtyInput.setAttribute('aria-invalid', 'true');
    }

    /* Reads the raw field value and validates it explicitly — never
       silently coerces an invalid entry to something else. */
    function readValidatedQuantity() {
      var result = cart.parseQuantity(qtyInput.value);
      if (result.error) { showError(result.error); return null; }
      clearError();
      return result.qty;
    }

    function syncDecreaseState() {
      var qty = parseInt(qtyInput.value, 10);
      decreaseBtn.disabled = !plant.availability || (Number.isInteger(qty) && qty <= 1);
    }

    if (!plant.availability) {
      decreaseBtn.disabled = true;
      increaseBtn.disabled = true;
      qtyInput.disabled = true;
      addBtn.disabled = true;
      addBtn.setAttribute('aria-disabled', 'true');
      statusEl.textContent = 'This plant is currently unavailable.';
    } else {
      syncDecreaseState();

      decreaseBtn.addEventListener('click', function () {
        var qty = readValidatedQuantity();
        if (qty === null) return;
        qtyInput.value = String(Math.max(1, qty - 1));
        clearError();
        syncDecreaseState();
      });

      increaseBtn.addEventListener('click', function () {
        var qty = readValidatedQuantity();
        if (qty === null) return;
        qtyInput.value = String(Math.min(cart.MAX_QUANTITY, qty + 1));
        clearError();
        syncDecreaseState();
      });

      qtyInput.addEventListener('input', function () {
        syncDecreaseState();
      });

      addBtn.addEventListener('click', function () {
        var qty = readValidatedQuantity();
        if (qty === null) {
          qtyInput.focus();
          return;
        }
        var result = cart.addItem(plant.id, qty);
        if (result.ok) {
          announce(statusEl, 'Added ' + qty + ' ' + plant.name + ' to cart.');
          qtyInput.value = '1';
          syncDecreaseState();
        } else {
          showError('Could not add to cart. Please try again.');
        }
      });
    }

    return node;
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    var plants = catalog.plants.filter(function (p) {
      return activeCategory === 'all' || p.categorySlug === activeCategory;
    });
    var frag = document.createDocumentFragment();
    plants.forEach(function (plant) { frag.appendChild(buildCard(plant)); });
    gridEl.appendChild(frag);
  }

  renderGrid();

  /* ── Header cart badges ──────────────────────────────────── */
  cart.mountBadge(document.getElementById('cart-badge'));
  cart.mountBadge(document.getElementById('cart-badge-mobile'));
})();
