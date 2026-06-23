"use client";

import { ThemeProvider } from "next-themes";
import AuthProvider from "@/components/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="active-systems-light"
      enableSystem={true}
      themes={[
        "active-systems-light",
        "night-matrix",
        "aetheric-foundry",
        "aetheric-foundry-light",
      ]}
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
