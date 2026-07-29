/* ═══════════════════════════════════════════════════════════
   INFINITEAG — shop-config.js
   Single source of truth for plant-shop business values.
   Values marked null/'pending' are NOT confirmed — do not guess
   them elsewhere. Stripe and delivery/tax logic connect later.
   ─────────────────────────────────────────────────────────── */

'use strict';

(function (root) {
  var ShopConfig = Object.freeze({
    currency: 'USD',
    plantPriceInCents: 1500,
    fulfillmentMethod: 'local delivery',

    /* Temporary configurable UI limit only — not an inventory or
       business rule. Raise/lower freely; has no backend meaning. */
    maximumQuantityPerProduct: 10,

    /* Pending business rules — must stay null until confirmed. */
    deliveryFeeInCents: null,
    minimumOrderInCents: null,
    freeDeliveryThresholdInCents: null,
    allowedZipCodes: null,
    deliveryZones: null,
    salesTaxMode: 'pending',

    stripeEnabled: false,

    cartStorageKey: 'infiniteag:plant-cart:v1',
  });

  root.InfiniteAgShopConfig = ShopConfig;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShopConfig;
  }
})(typeof window !== 'undefined' ? window : globalThis);
