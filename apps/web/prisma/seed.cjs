// Seed initial products for local development
// Run: npm -w apps/web run prisma:seed

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      name: "Latte",
      description: "Smooth espresso with steamed milk.",
      priceCents: 380,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Flat White",
      description: "Strong, silky, and balanced.",
      priceCents: 360,
      available: true,
      prepSeconds: 110,
      loyaltyEligible: true
    },
    {
      name: "Americano",
      description: "Espresso topped with hot water.",
      priceCents: 320,
      available: true,
      prepSeconds: 70,
      loyaltyEligible: true
    },
    {
      name: "Butter Croissant",
      description: "Flaky and warm (when available).",
      priceCents: 290,
      available: true,
      prepSeconds: 60,
      loyaltyEligible: false
    }
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) continue;
    await prisma.product.create({ data: product });
  }

  const settings = await prisma.loyaltyProgramSettings.findFirst();
  if (!settings) {
    await prisma.loyaltyProgramSettings.create({ data: { rewardStamps: 5 } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

