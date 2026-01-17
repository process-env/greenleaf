import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  auth: () => ({ userId: null }),
  currentUser: () => null,
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () => null,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
    userId: null,
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  }),
}));

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock environment variables for tests
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock";
process.env.CLERK_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
process.env.RESEND_API_KEY = "re_mock";
