import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaClientWithAdapter = ReturnType<typeof makePrismaClient>;

function makePrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithAdapter | undefined;
};

export function getPrisma(): PrismaClientWithAdapter {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = makePrismaClient();
  }
  return globalForPrisma.prisma;
}
