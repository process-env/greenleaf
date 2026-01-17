import { vi } from "vitest";

export class Resend {
  emails = {
    send: vi.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null }),
  };
}
