import { vi } from "vitest";

export class Resend {
  emails = {
    send: vi.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null }),
  };

  constructor(_apiKey?: string) {
    // Mock constructor accepts optional apiKey parameter
  }
}
