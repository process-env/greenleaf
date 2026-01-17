import { mockDeep } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

export const prisma = mockDeep<PrismaClient>();
