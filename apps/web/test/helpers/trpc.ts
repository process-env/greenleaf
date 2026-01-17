import { prisma } from "../mocks/db";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "@/server/trpc";

type TestContextOptions = {
  userId?: string | null;
  sessionId?: string | null;
};

export function createTestContext(options: TestContextOptions = {}) {
  return {
    prisma,
    userId: options.userId ?? null,
    sessionId: options.sessionId ?? "test-session-id",
  };
}

export function createTestCaller(options: TestContextOptions = {}) {
  const createCaller = createCallerFactory(appRouter);
  return createCaller(createTestContext(options));
}

export function createAuthenticatedCaller(userId = "test-user-id") {
  return createTestCaller({ userId });
}

export function createAnonymousCaller() {
  return createTestCaller({ userId: null });
}

// Re-export prisma mock for direct use in tests
export { prisma as prismaMock };
