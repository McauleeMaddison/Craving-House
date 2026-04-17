"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { useCart } from "@/components/cart/CartContext";
import { apiGetJson } from "@/lib/api";
import type {
  DrinkCustomizations,
  DrinkExtra,
  DrinkTopping,
  HotDogAddOn,
  MealAddOn,
  ProductCustomizationKind,
  Syrup,
  WaffleTopping
} from "@/lib/drink-customizations";
import {
  DRINK_TOPPING_OPTIONS,
  EXTRA_OPTIONS,
  getCustomizationUiCopy,
  getProductCustomizationKind,
  HOT_DOG_ADD_ON_OPTIONS,
  MEAL_ADD_ON_OPTIONS,
  SYRUP_OPTIONS,
  supportsDrinkToppings,
  WAFFLE_TOPPING_OPTIONS
} from "@/lib/drink-customizations";
import { formatMoneyGBP } from "@/lib/sample-data";

type ProductDto = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  prepSeconds: number;
  loyaltyEligible: boolean;
};

type MenuSectionKey = "hot-drinks" | "cold-drinks" | "light-bites" | "mains" | "hot-dogs" | "waffles" | "other";

const MENU_SECTION_META: Array<{ key: MenuSectionKey; title: string; description: string }> = [
  {
    key: "hot-drinks",
    title: "Hot drinks",
    description: "Espresso, coffees, teas, and everything warm together."
  },
  {
    key: "cold-drinks",
    title: "Cold drinks",
    description: "Iced coffees, smoothies, and chilled sweet drinks together."
  },
  {
    key: "light-bites",
    title: "Light bites",
    description: "Croissants, toasties, sandwiches, and quick lunch picks."
  },
  {
    key: "mains",
    title: "Mains",
    description: "Bigger plates and meal extras."
  },
  {
    key: "hot-dogs",
    title: "Hot dogs",
    description: "Bratwurst, choripan, and hot dog add-ons."
  },
  {
    key: "waffles",
    title: "Waffles",
    description: "Waffles and topping extras in one place."
  },
  {
    key: "other",
    title: "More to try",
    description: "Everything else currently on the menu."
  }
];

const menuItemNameCollator = new Intl.Collator("en-GB", { sensitivity: "base" });

function getMenuSectionKey(item: ProductDto): MenuSectionKey {
  const description = item.description.toLowerCase();

  if (description.includes("hot drinks")) return "hot-drinks";
  if (description.includes("cold drinks")) return "cold-drinks";
  if (description.includes("sandwiches")) return "light-bites";
  if (description.includes("breakfast")) return "light-bites";
  if (description.includes("hot dogs")) return "hot-dogs";
  if (description.includes("waffle")) return "waffles";
  if (description.includes("meal")) return "mains";
  return "other";
}

function AddToCartButton(props: { onAdd: () => void; disabled?: boolean }) {
  const [added, setAdded] = useState(false);
  const disabled = Boolean(props.disabled);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  return (
    <button
      className={`btn ${added ? "btnAdded" : ""}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setAdded(true);
        if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => setAdded(false), 900);
        props.onAdd();
      }}
      type="button"
    >
      {disabled ? "Unavailable" : added ? "Added to cart" : "Add to cart"}
    </button>
  );
}

export function MenuClient() {
  const { data, status } = useSession();
  const role = (data?.user as any)?.role as string | undefined;
  const isManager = status === "authenticated" && role === "manager";
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<Record<string, DrinkCustomizations>>({});

  function updateCustom(productId: string, next: DrinkCustomizations) {
    setCustom((prev) => ({ ...prev, [productId]: next }));
  }

  function toggleArrayOption<K extends keyof DrinkCustomizations>(
    productId: string,
    field: K,
    key: NonNullable<DrinkCustomizations[K]> extends Array<infer T> ? T : never
  ) {
    const current = (custom[productId]?.[field] as string[] | undefined) ?? [];
    const next = current.includes(String(key))
      ? current.filter((x) => x !== String(key))
      : [...current, String(key)];

    updateCustom(productId, {
      ...(custom[productId] ?? {}),
      [field]: next
    } as DrinkCustomizations);
  }

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products;
    if (!q) return list;
    return list.filter((x) => {
      return (
        x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q)
      );
    });
  }, [query, products]);

  const groupedItems = useMemo(() => {
    return MENU_SECTION_META.map((section) => ({
      ...section,
      items: items
        .filter((item) => getMenuSectionKey(item) === section.key)
        .sort((a, b) => menuItemNameCollator.compare(a.name, b.name))
    })).filter((section) => section.items.length > 0);
  }, [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiGetJson<{ products: ProductDto[] }>("/api/menu");
      if (!mounted) return;
      if (res.ok) setProducts(res.data.products);
      else setProducts([]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function renderMenuItem(item: ProductDto) {
    const customizationKind = getProductCustomizationKind(item);
    const canCustomize = customizationKind !== null;
    const canAddDrinkToppings = supportsDrinkToppings(item);
    const uiCopy = customizationKind ? getCustomizationUiCopy(customizationKind) : null;

    return (
      <article key={item.id} className="surface u-pad-16">
        <div className="u-flex-between">
          <div>
            <div className="u-fw-800">{item.name}</div>
            <div className="muted u-mt-6 u-lh-15">{item.description}</div>
          </div>
          <div className="u-text-right">
            <div className="u-fw-800">{formatMoneyGBP(item.priceCents)}</div>
            <div className="muted u-mt-6 u-fs-12">Prep: {Math.round(item.prepSeconds / 60)}m</div>
          </div>
        </div>

        <div className="u-flex-between-wrap u-mt-14">
          <div className="rowWrap">
            <div className="pill">{item.available ? "Available now" : "Temporarily unavailable"}</div>
            <div className="pill">{item.loyaltyEligible ? "Earns stamp" : "No stamp"}</div>
          </div>
          <div className="u-flex-wrap-gap-10-center">
            {canCustomize ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={!item.available}
                onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
              >
                {uiCopy?.buttonLabel}
              </button>
            ) : null}
            <AddToCartButton
              disabled={!item.available}
              onAdd={() => cart.add(item.id, 1, canCustomize ? custom[item.id] ?? null : null)}
            />
          </div>
        </div>

        {!item.available ? (
          <p className="muted u-mt-10 u-fs-12 u-lh-16">
            {/* Note: Availability controlled by admin/manager */}
            This item is temporarily unavailable.
          </p>
        ) : null}

        {canCustomize && customizationKind && expanded[item.id] && item.available ? (
          <div className="surface surfaceInset u-pad-14 u-mt-12">
            <div className="u-fw-900">{uiCopy?.title}</div>
            <div className="muted u-mt-8 u-lh-16">{uiCopy?.help}</div>

            <div className="u-mt-12 u-grid-gap-12">
              {customizationKind === "drink" ? (
                <>
                  <label className="u-grid-gap-8">
                    <span className="muted u-fs-13">Sugar</span>
                    <select
                      className="input"
                      value={String(custom[item.id]?.sugar ?? 0)}
                      onChange={(e) => {
                        const sugar = Number(e.target.value) as 0 | 1 | 2 | 3 | 4;
                        const next = { ...(custom[item.id] ?? {}) };
                        if (sugar === 0) delete next.sugar;
                        else next.sugar = sugar;
                        updateCustom(item.id, next);
                      }}
                    >
                      <option value="0">0 (none)</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </label>

                  <div className="u-grid-gap-8">
                    <span className="muted u-fs-13">Syrups</span>
                    <div className="rowWrap">
                      {SYRUP_OPTIONS.map((s) => {
                        const selected = Boolean(custom[item.id]?.syrups?.includes(s.key));
                        return (
                          <button
                            key={s.key}
                            type="button"
                            className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                            onClick={() => toggleArrayOption(item.id, "syrups", s.key as Syrup)}
                          >
                            {s.label} (+{formatMoneyGBP(s.priceCents)})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="u-grid-gap-8">
                    <span className="muted u-fs-13">Coffee add-ons</span>
                    <div className="rowWrap">
                      {EXTRA_OPTIONS.map((extra) => {
                        const selected = Boolean(custom[item.id]?.extras?.includes(extra.key));
                        return (
                          <button
                            key={extra.key}
                            type="button"
                            className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                            onClick={() => toggleArrayOption(item.id, "extras", extra.key as DrinkExtra)}
                          >
                            {extra.label} (+{formatMoneyGBP(extra.priceCents)})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {canAddDrinkToppings ? (
                    <div className="u-grid-gap-8">
                      <span className="muted u-fs-13">Coffee & hot chocolate toppings</span>
                      <div className="rowWrap">
                        {DRINK_TOPPING_OPTIONS.map((option) => {
                          const selected = Boolean(custom[item.id]?.drinkToppings?.includes(option.key));
                          return (
                            <button
                              key={option.key}
                              type="button"
                              className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                              onClick={() => toggleArrayOption(item.id, "drinkToppings", option.key as DrinkTopping)}
                            >
                              {option.label} (+{formatMoneyGBP(option.priceCents)})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {customizationKind === "hotdog" ? (
                <div className="u-grid-gap-8">
                  <span className="muted u-fs-13">Hot dog add-ons</span>
                  <div className="rowWrap">
                    {HOT_DOG_ADD_ON_OPTIONS.map((option) => {
                      const selected = Boolean(custom[item.id]?.hotDogAddOns?.includes(option.key));
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                          onClick={() => toggleArrayOption(item.id, "hotDogAddOns", option.key as HotDogAddOn)}
                        >
                          {option.label} (+{formatMoneyGBP(option.priceCents)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {customizationKind === "waffle" ? (
                <div className="u-grid-gap-8">
                  <span className="muted u-fs-13">Waffle toppings</span>
                  <div className="rowWrap">
                    {WAFFLE_TOPPING_OPTIONS.map((option) => {
                      const selected = Boolean(custom[item.id]?.waffleToppings?.includes(option.key));
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                          onClick={() => toggleArrayOption(item.id, "waffleToppings", option.key as WaffleTopping)}
                        >
                          {option.label} (+{formatMoneyGBP(option.priceCents)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {customizationKind === "meal" ? (
                <div className="u-grid-gap-8">
                  <span className="muted u-fs-13">Meal add-ons</span>
                  <div className="rowWrap">
                    {MEAL_ADD_ON_OPTIONS.map((option) => {
                      const selected = Boolean(custom[item.id]?.mealAddOns?.includes(option.key));
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={`btn btn-secondary btnCompact ${selected ? "btnActive" : ""}`}
                          onClick={() => toggleArrayOption(item.id, "mealAddOns", option.key as MealAddOn)}
                        >
                          {option.label} (+{formatMoneyGBP(option.priceCents)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <>
      <div className="surface u-pad-16">
        <div className="u-flex-between-wrap">
          <div className="customerPageIntro">
            <div className="rowWrap">
              <div className="pill">Grouped menu</div>
              <div className="pill">
                {items.length} item{items.length === 1 ? "" : "s"}
              </div>
            </div>
            <div>
              <h1 className="u-title-26">Menu</h1>
              <p className="muted u-mt-8 u-lh-16">
                Hot drinks and cold drinks stay grouped together, with the rest of the food organised by type.
              </p>
            </div>
            <div className="customerPageActionRow">
              <Link className="btn btn-secondary" href="/">
                Home
              </Link>
              <Link className="btn" href="/cart">
                Go to cart
              </Link>
            </div>
          </div>
          <div className="menuSearchWrap">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              aria-label="Search menu"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <section className="surface u-pad-16 u-mt-12">
          <div className="u-fw-900">Loading menu…</div>
          <p className="muted u-mt-8 u-lh-16">Fetching today’s items.</p>
        </section>
      ) : items.length === 0 ? (
        <section className="surface u-pad-16 u-mt-12">
          <div className="u-fw-900">No matching items</div>
          <p className="muted u-mt-8 u-lh-16">
            Try a different search, or check back shortly.
          </p>
          {isManager ? (
            <div className="u-flex-wrap-gap-10 u-mt-10">
              <Link className="btn" href="/manager/products">
                Add products (manager)
              </Link>
              <Link className="btn btn-secondary" href="/manager">
                Manager home
              </Link>
            </div>
          ) : (
            <p className="muted u-mt-10 u-fs-12 u-lh-16">
              If you’re the owner/manager, sign in and use the manager portal to add products.
            </p>
          )}
        </section>
      ) : (
        <section className="menuGroups u-mt-12">
          {groupedItems.map((section) => (
            <div key={section.key} className="menuGroup">
              <div className="menuGroupHeader">
                <div className="menuGroupTitleRow">
                  <h2 className="menuGroupTitle">{section.title}</h2>
                  <div className="pill">
                    {section.items.length} item{section.items.length === 1 ? "" : "s"}
                  </div>
                </div>
                <p className="menuGroupCopy">{section.description}</p>
              </div>
              <div className="grid-2">{section.items.map((item) => renderMenuItem(item))}</div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
