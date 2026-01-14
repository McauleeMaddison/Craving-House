export type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  prepSeconds: number;
  loyaltyEligible: boolean;
};

export const sampleMenu: MenuItem[] = [
  {
    id: "latte",
    name: "Latte",
    description: "Smooth espresso with steamed milk.",
    priceCents: 380,
    prepSeconds: 120,
    loyaltyEligible: true
  },
  {
    id: "flat-white",
    name: "Flat White",
    description: "Strong, silky, and balanced.",
    priceCents: 360,
    prepSeconds: 110,
    loyaltyEligible: true
  },
  {
    id: "americano",
    name: "Americano",
    description: "Espresso topped with hot water.",
    priceCents: 320,
    prepSeconds: 70,
    loyaltyEligible: true
  },
  {
    id: "croissant",
    name: "Butter Croissant",
    description: "Flaky and warm (when available).",
    priceCents: 290,
    prepSeconds: 60,
    loyaltyEligible: false
  }
];

export function formatMoneyGBP(cents: number): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

