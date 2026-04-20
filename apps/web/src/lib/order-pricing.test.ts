import assert from "node:assert/strict";
import test from "node:test";

import {
  getDerivedOrderFeeCents,
  getLineUnitPriceCents,
  getPickupSmallOrderFeeCents,
  PICKUP_SMALL_ORDER_FEE_CENTS,
  PICKUP_SMALL_ORDER_THRESHOLD_CENTS
} from "./order-pricing.ts";

test("getLineUnitPriceCents includes paid modifiers", () => {
  assert.equal(
    getLineUnitPriceCents(325, { sugar: 1, syrups: ["vanilla"], extras: ["extra-shot"], drinkToppings: ["sprinkles"] }),
    675
  );
});

test("getLineUnitPriceCents includes food modifier pricing", () => {
  assert.equal(
    getLineUnitPriceCents(530, { waffleToppings: ["nutella", "soft-ice-cream"] }),
    790
  );
  assert.equal(
    getLineUnitPriceCents(600, { hotDogAddOns: ["mozzarella"], mealAddOns: ["add-chips"] }),
    1050
  );
});

test("getLineUnitPriceCents supports legacy add-on payload formats", () => {
  assert.equal(
    getLineUnitPriceCents(600, {
      hotdogAddons: [{ key: "mozzarella" }],
      mealAddons: [{ value: "add chips" }],
      waffleAddOns: ["soft ice cream"]
    }),
    1200
  );
});

test("getPickupSmallOrderFeeCents applies under the threshold only", () => {
  assert.equal(getPickupSmallOrderFeeCents(PICKUP_SMALL_ORDER_THRESHOLD_CENTS - 1), PICKUP_SMALL_ORDER_FEE_CENTS);
  assert.equal(getPickupSmallOrderFeeCents(PICKUP_SMALL_ORDER_THRESHOLD_CENTS), 0);
});

test("getDerivedOrderFeeCents derives the persisted pickup fee from total", () => {
  assert.equal(
    getDerivedOrderFeeCents({ itemsSubtotalCents: 325, totalCents: 400 }),
    75
  );
});
