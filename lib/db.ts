import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

type PrismaClientWithAccelerate = ReturnType<typeof makePrismaClient>;

function makePrismaClient() {
  return new PrismaClient().$extends(withAccelerate());
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithAccelerate | undefined;
};

export function getPrisma(): PrismaClientWithAccelerate {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = makePrismaClient();
  }
  return globalForPrisma.prisma;
}
