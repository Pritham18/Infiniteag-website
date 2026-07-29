/* ═══════════════════════════════════════════════════════════
   INFINITEAG — cart-page.js
   Renders and edits the cart at /cart/.
   Depends on shop-config.js, plant-data.js, cart-store.js.
   ─────────────────────────────────────────────────────────── */

'use strict';

(function () {
  var cart = window.InfiniteAgCart;
  var lineTemplate = document.getElementById('cart-line-template');
  var listEl = document.getElementById('cart-list');
  var emptyEl = document.getElementById('cart-empty');
  var contentEl = document.getElementById('cart-content');
  var subtotalEl = document.getElementById('cart-subtotal');
  var checkoutLink = document.getElementById('checkout-link');
  var statusEl = document.getElementById('cart-status');
  if (!cart || !lineTemplate || !listEl) return;

  function currency(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function buildLine(item) {
    var node = lineTemplate.content.firstElementChild.cloneNode(true);
    var product = item.product;

    var img = node.querySelector('.cart-line__image');
    img.src = product.image;
    img.alt = product.imageAlt;
    img.loading = 'lazy';

    node.querySelector('.cart-line__name').textContent = product.name;
    node.querySelector('.cart-line__category').textContent = product.category;
    node.querySelector('.cart-line__price').textContent = currency(product.priceInCents) + ' each';

    var decreaseBtn = node.querySelector('[data-action="decrease"]');
    var increaseBtn = node.querySelector('[data-action="increase"]');
    var qtyInput = node.querySelector('.qty-stepper__input');
    var totalEl = node.querySelector('.cart-line__total');
    var removeBtn = node.querySelector('[data-action="remove"]');

    qtyInput.value = String(item.quantity);
    qtyInput.max = String(cart.MAX_QUANTITY);
    totalEl.textContent = currency(item.lineTotalInCents);
    decreaseBtn.disabled = item.quantity <= 1;

    var errorEl = document.createElement('p');
    errorEl.className = 'shop-card__qty-error';
    errorEl.setAttribute('role', 'alert');
    node.querySelector('.cart-line__controls').insertBefore(errorEl, totalEl);

    function applyQuantity(qty) {
      var result = cart.setItemQuantity(product.id, qty);
      if (!result.ok) {
        errorEl.textContent = 'Could not update quantity.';
      }
    }

    function readValidated() {
      var result = cart.parseQuantity(qtyInput.value);
      errorEl.textContent = result.error || '';
      return result.error ? null : result.qty;
    }

    decreaseBtn.addEventListener('click', function () {
      var qty = readValidated();
      if (qty === null) return;
      if (qty <= 1) return; // already at minimum — do not decrement below it
      applyQuantity(qty - 1);
    });

    increaseBtn.addEventListener('click', function () {
      var qty = readValidated();
      if (qty === null) return;
      applyQuantity(Math.min(cart.MAX_QUANTITY, qty + 1));
    });

    qtyInput.addEventListener('change', function () {
      var qty = readValidated();
      if (qty === null) return;
      applyQuantity(qty);
    });

    removeBtn.addEventListener('click', function () {
      cart.removeItem(product.id);
      if (statusEl) statusEl.textContent = product.name + ' removed from cart.';
    });

    return node;
  }

  function render() {
    var items = cart.getEnrichedItems();
    var isEmpty = items.length === 0;

    emptyEl.hidden = !isEmpty;
    contentEl.hidden = isEmpty;

    if (checkoutLink) {
      if (isEmpty) {
        checkoutLink.setAttribute('aria-disabled', 'true');
        checkoutLink.tabIndex = -1;
      } else {
        checkoutLink.removeAttribute('aria-disabled');
        checkoutLink.removeAttribute('tabindex');
      }
    }

    if (isEmpty) return;

    listEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    items.forEach(function (item) { frag.appendChild(buildLine(item)); });
    listEl.appendChild(frag);

    subtotalEl.textContent = currency(cart.getSubtotalInCents());
  }

  render();
  cart.subscribe(render);

  cart.mountBadge(document.getElementById('cart-badge'));
  cart.mountBadge(document.getElementById('cart-badge-mobile'));
})();
