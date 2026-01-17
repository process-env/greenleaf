import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@greenleaf/db";
import { cookies } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const createTRPCContext = async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("cart_session")?.value;
  const { userId } = await auth();

  return {
    prisma,
    sessionId,
    userId,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

// Admin procedure - requires admin role
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const client = await clerkClient();
  const user = await client.users.getUser(ctx.userId);

  if (user.publicMetadata?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  return next({ ctx });
});
