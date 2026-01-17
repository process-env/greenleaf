import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@greenleaf/db";
import { cookies } from "next/headers";

export const createTRPCContext = async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("cart_session")?.value;

  return {
    prisma,
    sessionId,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
