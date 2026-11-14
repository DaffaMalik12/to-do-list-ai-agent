import type { ReactNode } from "react";
import { ThemeToggle } from "@/features/theme/components/ThemeToggle";

export interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-fg"
            >
              T
            </span>
            <span className="text-base font-semibold tracking-tight">
              todoagent
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 gap-6 px-4 py-6 md:px-6">
        {/* Placeholder sidebar kategori (v0.2). Disembunyikan di mobile. */}
        <aside
          aria-label="Sidebar kategori (akan tersedia di versi berikutnya)"
          data-placeholder="true"
          className="hidden w-56 shrink-0 lg:block"
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-text-faint md:px-6">
        todoagent v0.1 — dibuat dengan Next.js
      </footer>
    </div>
  );
}
