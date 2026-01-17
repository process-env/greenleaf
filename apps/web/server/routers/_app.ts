import { router } from "../trpc";
import { strainsRouter } from "./strains";
import { cartRouter } from "./cart";
import { checkoutRouter, ordersRouter } from "./checkout";
import { adminRouter } from "./admin";

export const appRouter = router({
  strains: strainsRouter,
  cart: cartRouter,
  checkout: checkoutRouter,
  orders: ordersRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
