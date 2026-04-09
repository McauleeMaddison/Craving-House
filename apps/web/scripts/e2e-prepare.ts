import { prisma } from "../src/server/db.ts";
import { hashPassword } from "../src/server/auth/password.ts";

const e2ePassword = process.env.E2E_TEST_PASSWORD?.trim() || "CravingHouseE2E!";

const accounts = [
  { email: "e2e.customer@cravinghouse.test", name: "E2E Customer", role: "customer" as const },
  { email: "e2e.staff@cravinghouse.test", name: "E2E Staff", role: "staff" as const },
  { email: "e2e.manager@cravinghouse.test", name: "E2E Manager", role: "manager" as const },
  { email: "e2e.reset@cravinghouse.test", name: "E2E Reset", role: "customer" as const }
];

async function main() {
  const passwordHash = await hashPassword(e2ePassword);

  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        disabledAt: null,
        passwordHash,
        mfaTotpSecret: null,
        mfaTotpEnabledAt: null
      },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash
      }
    });

    if (account.role === "customer") {
      await prisma.loyaltyAccount.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id
        }
      });
    }
  }

  console.log(`Prepared ${accounts.length} E2E accounts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
