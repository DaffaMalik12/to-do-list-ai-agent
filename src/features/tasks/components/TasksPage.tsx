"use client";

import { useCallback, useRef } from "react";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { QuickAddInput } from "@/features/tasks/components/QuickAddInput";
import { TaskListSkeleton } from "@/features/tasks/components/TaskListSkeleton";
import { TaskList } from "@/features/tasks/components/TaskList";
import { Button } from "@/shared/ui/Button";

/**
 * Urutan default sesuai kontrak backend (docs/api.md §3):
 *   sort=manual&order=asc  → urut `position` menaik.
 *
 * Server menetapkan `position` tugas baru = `max(position) + POSITION_STEP`
 * sehingga tugas terbaru selalu berada di paling BAWAH pada urutan asc.
 *
 * Agar tugas yang baru dibuat terasa "instan" di paling ATAS tanpa menunggu
 * refetch, `useCreateTask` menyisipkan item optimistis di depan array cache
 * dengan `position: -Date.now()` (nilai negatif yang tidak pernah dikirim ke
 * server). Setelah `invalidateQueries` selesai, item diganti data asli dan
 * urutan kembali mengikuti `position` dari server.
 *
 * CATATAN: nilai negatif tersebut BUKAN nilai domain produksi — murni
 * penanda lokal untuk optimistik. Jangan pernah menulis `position` negatif
 * ke payload API.
 */
export function TasksPage() {
  const query = useTasks({ sort: "manual", order: "asc", limit: 100 });
  const quickAddRef = useRef<HTMLInputElement | null>(null);

  const focusQuickAdd = useCallback(() => {
    quickAddRef.current?.focus();
  }, []);

  return (
    <section className="flex w-full flex-col gap-6">
      <QuickAddInput ref={quickAddRef} onSubmitSuccess={focusQuickAdd} />

      {query.isPending ? (
        <TaskListSkeleton rows={4} />
      ) : query.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-danger/40 bg-surface p-4"
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text">
              Gagal memuat daftar tugas
            </p>
            <p className="text-sm text-text-muted">{query.error.message}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void query.refetch();
            }}
            disabled={query.isFetching}
          >
            {query.isFetching ? "Memuat…" : "Coba lagi"}
          </Button>
        </div>
      ) : (
        <TaskList
          tasks={query.data?.items ?? []}
          onRetryEmptyFocus={focusQuickAdd}
        />
      )}
    </section>
  );
}
