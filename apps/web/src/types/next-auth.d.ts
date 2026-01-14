import "next-auth";
import "next-auth/adapters";

type AppUserRole = "customer" | "staff" | "manager";

declare module "next-auth" {
  interface User {
    role: AppUserRole;
  }

  interface Session {
    user?: {
      id: string;
      role: AppUserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: AppUserRole;
  }
}
