import { vi } from "vitest";
import type { ReactNode } from "react";

export const auth = vi.fn().mockResolvedValue({ userId: null });
export const currentUser = vi.fn().mockResolvedValue(null);
export const clerkClient = vi.fn().mockResolvedValue({
  users: {
    getUser: vi.fn().mockResolvedValue({
      publicMetadata: {},
    }),
  },
});

export const SignIn = () => null;
export const SignUp = () => null;
export const UserButton = () => null;
export const ClerkProvider = ({ children }: { children: ReactNode }) => children;

export const useAuth = () => ({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
});

export const useUser = () => ({
  isLoaded: true,
  isSignedIn: false,
  user: null,
});
