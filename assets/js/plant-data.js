/* ═══════════════════════════════════════════════════════════
   INFINITEAG — plant-data.js
   Single source of truth for the plant catalog. Names and
   categories are transcribed verbatim from products/index.html
   (#herbs-panel, #shrubs-panel, #vegetables-panel, #fruits-panel)
   so the shop never drifts from the Products page.

   image: one shared temporary placeholder — no image-generation
   tool was available in this environment. Swap this mapping for
   real photography later without touching any other file.
   ─────────────────────────────────────────────────────────── */

'use strict';

(function (root) {
  var config = root.InfiniteAgShopConfig ||
    (typeof require === 'function' ? require('./shop-config.js') : null);

  var PLACEHOLDER_IMAGE = '/assets/images/plant-placeholder.svg';

  /* categorySlug matches the existing data-plant-tab values used on
     the Products page; category is the exact display spelling used
     in the plant-tabs UI and section heading there. */
  var CATEGORIES = [
    { slug: 'herbs', label: 'Herbs' },
    { slug: 'shrubs', label: 'Shrubs' },
    { slug: 'vegetables', label: 'Vegetables' },
    { slug: 'fruits', label: 'Fruits' },
  ];

  var RAW_PLANTS = [
    /* Herbs — products/index.html #herbs-panel */
    { slug: 'rosemary', name: 'Rosemary', category: 'herbs' },
    { slug: 'mint', name: 'Mint', category: 'herbs' },
    { slug: 'parsley', name: 'Parsley', category: 'herbs' },
    { slug: 'cilantro', name: 'Cilantro', category: 'herbs' },
    { slug: 'thyme', name: 'Thyme', category: 'herbs' },
    { slug: 'oregano', name: 'Oregano', category: 'herbs' },
    { slug: 'chives', name: 'Chives', category: 'herbs' },
    { slug: 'dill', name: 'Dill', category: 'herbs' },

    /* Shrubs — products/index.html #shrubs-panel */
    { slug: 'azaleas', name: 'Azaleas', category: 'shrubs' },
    { slug: 'camellias', name: 'Camellias', category: 'shrubs' },
    { slug: 'hydrangeas', name: 'Hydrangeas', category: 'shrubs' },
    { slug: 'gardenias', name: 'Gardenias', category: 'shrubs' },
    { slug: 'yaupon-holly', name: 'Yaupon Holly', category: 'shrubs' },
    { slug: 'inkberry-holly', name: 'Inkberry Holly', category: 'shrubs' },
    { slug: 'american-holly', name: 'American Holly', category: 'shrubs' },
    { slug: 'loropetalum', name: 'Loropetalum', category: 'shrubs' },
    { slug: 'boxwood', name: 'Boxwood', category: 'shrubs' },
    { slug: 'crape-myrtle', name: 'Crape Myrtle', category: 'shrubs' },
    { slug: 'american-beautyberry', name: 'American Beautyberry', category: 'shrubs' },
    { slug: 'wax-myrtle', name: 'Wax Myrtle', category: 'shrubs' },

    /* Vegetables — products/index.html #vegetables-panel */
    { slug: 'tomatoes', name: 'Tomatoes', category: 'vegetables' },
    { slug: 'cucumbers', name: 'Cucumbers', category: 'vegetables' },
    { slug: 'squash-zucchini', name: 'Squash/Zucchini', category: 'vegetables' },
    { slug: 'okra', name: 'Okra', category: 'vegetables' },
    { slug: 'bell-peppers', name: 'Bell Peppers', category: 'vegetables' },
    { slug: 'hot-peppers', name: 'Hot Peppers', category: 'vegetables' },
    { slug: 'bittermelon', name: 'Bittermelon', category: 'vegetables' },

    /* Fruits — products/index.html #fruits-panel */
    { slug: 'watermelon', name: 'Watermelon', category: 'fruits' },
    { slug: 'cantaloupe', name: 'Cantaloupe', category: 'fruits' },
    { slug: 'strawberries', name: 'Strawberries', category: 'fruits' },
    { slug: 'figs', name: 'Figs', category: 'fruits' },
    { slug: 'blueberries', name: 'Blueberries', category: 'fruits' },
    { slug: 'blackberries', name: 'Blackberries', category: 'fruits' },
  ];

  function categoryLabel(slug) {
    var match = CATEGORIES.filter(function (c) { return c.slug === slug; })[0];
    return match ? match.label : slug;
  }

  var PLANTS = RAW_PLANTS.map(function (p) {
    return {
      id: p.slug,
      slug: p.slug,
      name: p.name,
      category: categoryLabel(p.category),
      categorySlug: p.category,
      priceInCents: config ? config.plantPriceInCents : 1500,
      image: PLACEHOLDER_IMAGE,
      imageAlt: p.name + ' — representative plant image, actual appearance may vary',
      /* Default availability. Flip individual entries to false as needed;
         no plant is ever removed from its category for being unavailable. */
      availability: true,
    };
  });

  var Catalog = Object.freeze({
    categories: CATEGORIES,
    plants: PLANTS,
    getById: function (id) {
      return PLANTS.filter(function (p) { return p.id === id; })[0] || null;
    },
  });

  root.InfiniteAgPlantCatalog = Catalog;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Catalog;
  }
})(typeof window !== 'undefined' ? window : globalThis);
