// Seed initial products for local development
// Run: npm -w apps/web run prisma:seed

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      name: "Grilled Ham & Cheese",
      description: "Breakfast",
      priceCents: 600,
      available: true,
      prepSeconds: 300,
      loyaltyEligible: false
    },
    {
      name: "Panini Ham & Cheese",
      description: "Breakfast",
      priceCents: 650,
      available: true,
      prepSeconds: 300,
      loyaltyEligible: false
    },
    {
      name: "The Toasted Temptation",
      description: "Breakfast - Panini chicken, mozzarella, and pesto",
      priceCents: 690,
      available: true,
      prepSeconds: 330,
      loyaltyEligible: false
    },
    {
      name: "Protein Tuna Turner",
      description: "Breakfast - Panini tuna melt",
      priceCents: 690,
      available: true,
      prepSeconds: 330,
      loyaltyEligible: false
    },
    {
      name: "Tornado",
      description: "Breakfast - Panini protein chicken cheese melt",
      priceCents: 690,
      available: true,
      prepSeconds: 330,
      loyaltyEligible: false
    },
    {
      name: "Croissant Ham & Cheese",
      description: "Breakfast",
      priceCents: 330,
      available: true,
      prepSeconds: 180,
      loyaltyEligible: false
    },
    {
      name: "Croissant",
      description: "Breakfast",
      priceCents: 180,
      available: true,
      prepSeconds: 60,
      loyaltyEligible: false
    },
    {
      name: "Croissant Chocolate",
      description: "Breakfast",
      priceCents: 180,
      available: true,
      prepSeconds: 60,
      loyaltyEligible: false
    },
    {
      name: "Espresso",
      description: "Hot drinks",
      priceCents: 250,
      available: true,
      prepSeconds: 80,
      loyaltyEligible: true
    },
    {
      name: "Cappuccino",
      description: "Hot drinks",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Americano",
      description: "Hot drinks",
      priceCents: 310,
      available: true,
      prepSeconds: 90,
      loyaltyEligible: true
    },
    {
      name: "Flat White",
      description: "Hot drinks",
      priceCents: 325,
      available: true,
      prepSeconds: 110,
      loyaltyEligible: true
    },
    {
      name: "Mocha",
      description: "Hot drinks",
      priceCents: 380,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Cortado",
      description: "Hot drinks",
      priceCents: 320,
      available: true,
      prepSeconds: 100,
      loyaltyEligible: true
    },
    {
      name: "Latte",
      description: "Hot drinks",
      priceCents: 320,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Chai Latte",
      description: "Hot drinks",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: false
    },
    {
      name: "Turmeric Latte",
      description: "Hot drinks",
      priceCents: 330,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: false
    },
    {
      name: "Hot Chocolate",
      description: "Hot drinks",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: false
    },
    {
      name: "Breakfast Tea",
      description: "Hot drinks",
      priceCents: 210,
      available: true,
      prepSeconds: 90,
      loyaltyEligible: false
    },
    {
      name: "Herbal Tea",
      description: "Hot drinks",
      priceCents: 210,
      available: true,
      prepSeconds: 90,
      loyaltyEligible: false
    },
    {
      name: "Peppermint Tea",
      description: "Hot drinks",
      priceCents: 210,
      available: true,
      prepSeconds: 90,
      loyaltyEligible: false
    },
    {
      name: "Green Tea",
      description: "Hot drinks",
      priceCents: 210,
      available: true,
      prepSeconds: 90,
      loyaltyEligible: false
    },
    {
      name: "Bratwurst XXL",
      description: "Hot dogs",
      priceCents: 750,
      available: true,
      prepSeconds: 360,
      loyaltyEligible: false
    },
    {
      name: "Cheese Bratwurst XXL",
      description: "Hot dogs",
      priceCents: 800,
      available: true,
      prepSeconds: 360,
      loyaltyEligible: false
    },
    {
      name: "Choripan",
      description: "Hot dogs",
      priceCents: 600,
      available: true,
      prepSeconds: 330,
      loyaltyEligible: false
    },
    {
      name: "Mozzarella",
      description: "Hot dogs add-on",
      priceCents: 100,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Shoestring Potatoes",
      description: "Hot dogs add-on",
      priceCents: 100,
      available: true,
      prepSeconds: 60,
      loyaltyEligible: false
    },
    {
      name: "Chicken Cotoletta with Chips",
      description: "Meals",
      priceCents: 800,
      available: true,
      prepSeconds: 420,
      loyaltyEligible: false
    },
    {
      name: "Meat Cotoletta with Chips",
      description: "Meals",
      priceCents: 900,
      available: true,
      prepSeconds: 420,
      loyaltyEligible: false
    },
    {
      name: "6 Chicken Wings",
      description: "Meals",
      priceCents: 595,
      available: true,
      prepSeconds: 360,
      loyaltyEligible: false
    },
    {
      name: "Homemade Rice",
      description: "Meals",
      priceCents: 395,
      available: true,
      prepSeconds: 180,
      loyaltyEligible: false
    },
    {
      name: "6 Parmesan Wings",
      description: "Meals",
      priceCents: 610,
      available: true,
      prepSeconds: 360,
      loyaltyEligible: false
    },
    {
      name: "6 Buffalo Wings",
      description: "Meals",
      priceCents: 610,
      available: true,
      prepSeconds: 360,
      loyaltyEligible: false
    },
    {
      name: "Add Chips",
      description: "Meals add-on",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: false
    },
    {
      name: "Iced Caramel",
      description: "Cold drinks",
      priceCents: 390,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Iced Hazelnut",
      description: "Cold drinks",
      priceCents: 360,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Iced Latte",
      description: "Cold drinks",
      priceCents: 320,
      available: true,
      prepSeconds: 110,
      loyaltyEligible: true
    },
    {
      name: "Iced Mocha",
      description: "Cold drinks",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Iced Chocolate",
      description: "Cold drinks",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: false
    },
    {
      name: "Protein Coffee",
      description: "Cold drinks",
      priceCents: 350,
      available: true,
      prepSeconds: 120,
      loyaltyEligible: true
    },
    {
      name: "Affogato",
      description: "Cold drinks",
      priceCents: 410,
      available: true,
      prepSeconds: 150,
      loyaltyEligible: true
    },
    {
      name: "Smoothies",
      description: "Cold drinks",
      priceCents: 480,
      available: true,
      prepSeconds: 180,
      loyaltyEligible: false
    },
    {
      name: "Waffle Plain",
      description: "Waffles",
      priceCents: 530,
      available: true,
      prepSeconds: 300,
      loyaltyEligible: false
    },
    {
      name: "Waffle Protein",
      description: "Waffles",
      priceCents: 680,
      available: true,
      prepSeconds: 300,
      loyaltyEligible: false
    },
    {
      name: "Biscuit Crumbs",
      description: "Waffle topping",
      priceCents: 110,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Nutella",
      description: "Waffle topping",
      priceCents: 110,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Dulce de Leche",
      description: "Waffle topping",
      priceCents: 130,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Sprinkles",
      description: "Waffle topping",
      priceCents: 110,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Chocolate Chips",
      description: "Waffle topping",
      priceCents: 120,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Mini Marshmallows",
      description: "Waffle topping",
      priceCents: 120,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "Soft Ice Cream",
      description: "Waffle topping",
      priceCents: 150,
      available: true,
      prepSeconds: 30,
      loyaltyEligible: false
    },
    {
      name: "The Italian Grill",
      description: "Sandwiches - Focaccia, salami, ham, prosciutto, mozzarella, and mustard",
      priceCents: 650,
      available: true,
      prepSeconds: 330,
      loyaltyEligible: false
    },
    {
      name: "The Spaniard",
      description: "Sandwiches - Panini, serrano ham, and tomato",
      priceCents: 550,
      available: true,
      prepSeconds: 330,
      loyaltyEligible: false
    }
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          description: product.description,
          priceCents: product.priceCents,
          available: product.available,
          prepSeconds: product.prepSeconds,
          loyaltyEligible: product.loyaltyEligible
        }
      });
      continue;
    }
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
