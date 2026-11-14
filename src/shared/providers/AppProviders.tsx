"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/shared/providers/QueryProvider";
import { ToastProvider } from "@/shared/ui/Toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
