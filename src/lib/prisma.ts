import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;

// sql: función de consulta directa a NeonDB vía HTTP.
// Úsala para campos DateTime — el adaptador PrismaNeonHTTP devuelve {} para
// DateTime en queries ORM ($queryRaw incluido). neon() retorna strings ISO correctos.
export const sql = neon(connectionString);

function createPrismaClient() {
  const adapter = new PrismaNeonHTTP(sql);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
