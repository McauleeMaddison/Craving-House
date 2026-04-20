import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductCustomizationKind,
  isStandaloneModifierProduct,
  normalizeCustomizations,
  normalizeCustomizationsForProduct,
  supportsDrinkToppings
} from "./drink-customizations.ts";

test("isStandaloneModifierProduct matches common add-on description variants", () => {
  assert.equal(isStandaloneModifierProduct({ description: "Hot dogs add-on" }), true);
  assert.equal(isStandaloneModifierProduct({ description: "hot dog add ons" }), true);
  assert.equal(isStandaloneModifierProduct({ description: "Meals addon" }), true);
  assert.equal(isStandaloneModifierProduct({ description: "Waffle toppings" }), true);
  assert.equal(isStandaloneModifierProduct({ description: "  waffle_topping  " }), true);
  assert.equal(isStandaloneModifierProduct({ description: "Hot dogs" }), false);
});

test("isStandaloneModifierProduct matches known modifier product names", () => {
  assert.equal(isStandaloneModifierProduct({ name: "Mini Marshmallows", description: "Desserts" }), true);
  assert.equal(isStandaloneModifierProduct({ name: "Chocolate Chips", description: "" }), true);
  assert.equal(isStandaloneModifierProduct({ name: "Sprinkles", description: null }), true);
  assert.equal(isStandaloneModifierProduct({ name: "Dulce de Leche", description: "Special" }), true);
  assert.equal(isStandaloneModifierProduct({ name: "Nutella", description: "Breakfast" }), true);
  assert.equal(isStandaloneModifierProduct({ name: "Soft Ice Cream", description: "Sides" }), true);
  assert.equal(isStandaloneModifierProduct({ name: "Latte", description: "Hot drinks" }), false);
});

test("getProductCustomizationKind keeps add-ons out of normal menu classification", () => {
  assert.equal(
    getProductCustomizationKind({ name: "Mozzarella", description: "Hot dog add ons", loyaltyEligible: false }),
    null
  );
  assert.equal(
    getProductCustomizationKind({ name: "Biscuit Crumbs", description: "Waffle toppings", loyaltyEligible: false }),
    null
  );
});

test("getProductCustomizationKind tolerates singular and spaced category labels", () => {
  assert.equal(
    getProductCustomizationKind({ name: "Bratwurst XXL", description: "Hot dog", loyaltyEligible: false }),
    "hotdog"
  );
  assert.equal(
    getProductCustomizationKind({ name: "Waffle Plain", description: " Waffle ", loyaltyEligible: false }),
    "waffle"
  );
  assert.equal(
    getProductCustomizationKind({ name: "6 Chicken Wings", description: "Meal", loyaltyEligible: false }),
    "meal"
  );
  assert.equal(
    getProductCustomizationKind({ name: "Chicken Cotoletta with Chips", description: "Meal", loyaltyEligible: false }),
    null
  );
});

test("supportsDrinkToppings only for coffee and hot chocolate drinks", () => {
  assert.equal(supportsDrinkToppings({ name: "Hot Chocolate", description: "Hot drinks", loyaltyEligible: false }), true);
  assert.equal(supportsDrinkToppings({ name: "Latte", description: "Hot drinks", loyaltyEligible: true }), true);
  assert.equal(supportsDrinkToppings({ name: "Breakfast Tea", description: "Hot drinks", loyaltyEligible: false }), false);
  assert.equal(supportsDrinkToppings({ name: "Chai Latte", description: "Hot drinks", loyaltyEligible: false }), false);
  assert.equal(supportsDrinkToppings({ name: "Iced Latte", description: "Cold drinks", loyaltyEligible: true }), false);
});

test("normalizeCustomizationsForProduct strips drink toppings from unsupported products", () => {
  assert.deepEqual(
    normalizeCustomizationsForProduct(
      { name: "Hot Chocolate", description: "Hot drinks", loyaltyEligible: false },
      { drinkToppings: ["mini-marshmallows"], waffleToppings: ["nutella"] }
    ),
    { drinkToppings: ["mini-marshmallows"] }
  );

  assert.equal(
    normalizeCustomizationsForProduct(
      { name: "Breakfast Tea", description: "Hot drinks", loyaltyEligible: false },
      { drinkToppings: ["mini-marshmallows"] }
    ),
    null
  );
});

test("normalizeCustomizations accepts legacy add-on keys and object payloads", () => {
  assert.deepEqual(
    normalizeCustomizations({
      sugar: "2",
      hotdogAddons: [{ key: "mozzarella" }],
      waffleAddOns: [{ id: "soft ice cream" }],
      mealAddons: [{ value: "add chips" }],
      coffeeAddOns: [{ name: "extra_shot" }]
    }),
    {
      sugar: 2,
      extras: ["extra-shot"],
      hotDogAddOns: ["mozzarella"],
      waffleToppings: ["soft-ice-cream"],
      mealAddOns: ["add-chips"]
    }
  );
});
