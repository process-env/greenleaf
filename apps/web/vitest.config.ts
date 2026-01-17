import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        ".next",
        "test",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/*",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@clerk/nextjs/server": path.resolve(__dirname, "./test/mocks/clerk.ts"),
      "@clerk/nextjs": path.resolve(__dirname, "./test/mocks/clerk.ts"),
      "@greenleaf/db": path.resolve(__dirname, "./test/mocks/db.ts"),
      "next/headers": path.resolve(__dirname, "./test/mocks/next-headers.ts"),
      "server-only": path.resolve(__dirname, "./test/mocks/server-only.ts"),
      "resend": path.resolve(__dirname, "./test/mocks/resend.ts"),
      "@react-email/components": path.resolve(__dirname, "./test/mocks/react-email.tsx"),
    },
  },
});
