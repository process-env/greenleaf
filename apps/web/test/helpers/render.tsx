import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

export * from "@testing-library/react";
export { customRender as render };
