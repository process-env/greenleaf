import { vi } from "vitest";

export const headers = vi.fn().mockResolvedValue(new Map());

export const cookies = vi.fn().mockResolvedValue({
  get: vi.fn().mockReturnValue(undefined),
  set: vi.fn(),
  delete: vi.fn(),
});
