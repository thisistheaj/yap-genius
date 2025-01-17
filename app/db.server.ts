import { PrismaClient } from "@prisma/client";
import { singleton } from "./singleton.server";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Hard-code a unique key, so we can look up the client when this module gets re-imported
const prisma = singleton("prisma", () => new PrismaClient());
prisma.$connect();

export { prisma };
