import { describe, it, expect, beforeEach } from "vitest";
import { createTestCaller, prismaMock } from "@/test/helpers/trpc";
import { TRPCError } from "@trpc/server";
import { mockReset } from "vitest-mock-extended";

describe("cartRouter", () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe("get", () => {
    it("returns empty cart when no cart exists", async () => {
      const caller = createTestCaller({ sessionId: "test-session" });
      prismaMock.cart.findUnique.mockResolvedValue(null);

      const result = await caller.cart.get();

      expect(result).toEqual({ items: [], total: 0 });
    });

    it("returns cart items with calculated totals", async () => {
      const caller = createTestCaller({ sessionId: "test-session" });

      const mockCart = {
        id: "cart-1",
        sessionId: "test-session",
        userId: null,
        items: [
          {
            id: "item-1",
            cartId: "cart-1",
            strainId: "strain-1",
            grams: 3.5,
            strain: {
              id: "strain-1",
              name: "Blue Dream",
              slug: "blue-dream",
              type: "HYBRID",
              imageUrl: "/images/blue-dream.jpg",
              inventory: [{ id: "inv-1", strainId: "strain-1", pricePerGram: 15, quantity: 100 }],
            },
          },
        ],
      };

      prismaMock.cart.findUnique.mockResolvedValue(mockCart as never);

      const result = await caller.cart.get();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].strainName).toBe("Blue Dream");
      expect(result.items[0].grams).toBe(3.5);
      expect(result.items[0].pricePerGram).toBe(15);
      expect(result.items[0].subtotal).toBe(5250); // 3.5 * 15 * 100 cents
      expect(result.total).toBe(5250);
    });

    it("prioritizes user cart over session cart", async () => {
      const caller = createTestCaller({
        userId: "user-1",
        sessionId: "test-session",
      });

      const userCart = {
        id: "user-cart",
        sessionId: null,
        userId: "user-1",
        items: [],
      };

      prismaMock.cart.findUnique.mockResolvedValue(userCart as never);

      await caller.cart.get();

      expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        include: expect.any(Object),
      });
    });
  });

  describe("add", () => {
    it("throws NOT_FOUND when strain does not exist", async () => {
      const caller = createTestCaller({ sessionId: "test-session" });

      prismaMock.strain.findUnique.mockResolvedValue(null);

      await expect(
        caller.cart.add({
          strainId: "nonexistent",
          grams: 1,
          sessionId: "test-session",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST when strain has no inventory", async () => {
      const caller = createTestCaller({ sessionId: "test-session" });

      prismaMock.strain.findUnique.mockResolvedValue({
        id: "strain-1",
        name: "Blue Dream",
        inventory: [],
      } as never);

      await expect(
        caller.cart.add({
          strainId: "strain-1",
          grams: 1,
          sessionId: "test-session",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("itemCount", () => {
    it("returns 0 when no cart exists", async () => {
      const caller = createTestCaller({ sessionId: "test-session" });
      prismaMock.cart.findUnique.mockResolvedValue(null);

      const count = await caller.cart.itemCount();

      expect(count).toBe(0);
    });

    it("returns item count from user cart", async () => {
      const caller = createTestCaller({
        userId: "user-1",
        sessionId: "test-session",
      });

      prismaMock.cart.findUnique.mockResolvedValue({
        id: "cart-1",
        userId: "user-1",
        _count: { items: 3 },
      } as never);

      const count = await caller.cart.itemCount();

      expect(count).toBe(3);
    });
  });
});
