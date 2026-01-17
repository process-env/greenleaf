import { describe, it, expect } from "vitest";
import { cn, formatPrice, formatGrams, slugify } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});

describe("formatPrice", () => {
  it("formats cents to USD", () => {
    expect(formatPrice(1000)).toBe("$10.00");
    expect(formatPrice(1599)).toBe("$15.99");
    expect(formatPrice(99)).toBe("$0.99");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("handles large amounts", () => {
    expect(formatPrice(100000)).toBe("$1,000.00");
  });
});

describe("formatGrams", () => {
  it("formats grams >= 1", () => {
    expect(formatGrams(1)).toBe("1g");
    expect(formatGrams(3.5)).toBe("3.5g");
    expect(formatGrams(28)).toBe("28g");
  });

  it("converts to milligrams when < 1g", () => {
    expect(formatGrams(0.5)).toBe("500mg");
    expect(formatGrams(0.1)).toBe("100mg");
    expect(formatGrams(0.25)).toBe("250mg");
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("blue dream")).toBe("blue-dream");
  });

  it("removes special characters", () => {
    expect(slugify("OG Kush #1")).toBe("og-kush-1");
    expect(slugify("Girl Scout Cookies!")).toBe("girl-scout-cookies");
  });

  it("removes leading/trailing hyphens", () => {
    expect(slugify("  hello  ")).toBe("hello");
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles multiple consecutive spaces/special chars", () => {
    expect(slugify("super   lemon   haze")).toBe("super-lemon-haze");
  });
});
