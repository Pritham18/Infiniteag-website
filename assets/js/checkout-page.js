/* ═══════════════════════════════════════════════════════════
   INFINITEAG — checkout-page.js
   Read-only order-summary preview for /checkout/. No order is
   ever submitted, charged, or stored — the form below is layout
   only, and this script never sends its data anywhere.
   Depends on shop-config.js, plant-data.js, cart-store.js.
   ─────────────────────────────────────────────────────────── */

'use strict';

(function () {
  var cart = window.InfiniteAgCart;
  var emptyEl = document.getElementById('checkout-empty');
  var contentEl = document.getElementById('checkout-content');
  var itemsEl = document.getElementById('order-summary-items');
  var subtotalEl = document.getElementById('order-summary-subtotal');
  var itemTemplate = document.getElementById('order-summary-item-template');
  if (!cart || !emptyEl || !contentEl || !itemsEl || !itemTemplate) return;

  function currency(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function render() {
    var items = cart.getEnrichedItems();
    var isEmpty = items.length === 0;

    emptyEl.hidden = !isEmpty;
    contentEl.hidden = isEmpty;
    if (isEmpty) return;

    itemsEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    items.forEach(function (item) {
      var node = itemTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector('.order-summary__item-name').textContent = item.product.name;
      node.querySelector('.order-summary__item-qty').textContent = 'Qty ' + item.quantity;
      node.querySelector('.order-summary__item-total').textContent = currency(item.lineTotalInCents);
      frag.appendChild(node);
    });
    itemsEl.appendChild(frag);

    subtotalEl.textContent = currency(cart.getSubtotalInCents());
  }

  render();
  cart.subscribe(render);

  cart.mountBadge(document.getElementById('cart-badge'));
  cart.mountBadge(document.getElementById('cart-badge-mobile'));

  /* Defensive only — the form has no submit button, but this
     guarantees Enter-key implicit submission can never fire a
     real submission, page reload, or data send. */
  var form = document.querySelector('.checkout-form');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
