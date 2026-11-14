"use client";

import type { ApiError } from "@/services/http";
import type { Task } from "../types/task";

export interface TaskListProps {
  items: Task[];
  isLoading: boolean;
  isFetching?: boolean;
  error: ApiError | Error | null;
  hasQuery: boolean;
  keyword?: string;
  onRetry: () => void;
  onClearSearch?: () => void;
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Memuat daftar tugas…</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-2 h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      ))}
    </div>
  );
}

export function TaskList({
  items,
  isLoading,
  isFetching = false,
  error,
  hasQuery,
  keyword = "",
  onRetry,
  onClearSearch,
}: TaskListProps) {
  // Error diprioritaskan di atas loading & data: data lama tidak dirender
  // saat error non-null agar pengguna tidak melihat isi basi.
  if (error) {
    return (
      <div
        role="alert"
        className="flex min-w-0 flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      >
        <p className="font-medium">Gagal memuat daftar tugas.</p>
        <p className="w-full break-words">{error.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="min-w-0 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        {hasQuery ? (
          <>
            <p className="break-words font-medium">
              Tidak ada hasil untuk {"\u201C"}
              <span className="break-all text-zinc-900 dark:text-zinc-100">
                {keyword}
              </span>
              {"\u201D"}.
            </p>
            <p className="mt-1">Coba kata kunci lain atau hapus pencarian.</p>
            {onClearSearch ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Hapus pencarian
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="font-medium">Belum ada tugas.</p>
            <p className="mt-1">Tambahkan tugas baru untuk mulai beraktivitas.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {isFetching ? (
        <p
          aria-live="polite"
          className="text-xs text-zinc-500 dark:text-zinc-400"
        >
          Memperbarui hasil…
        </p>
      ) : null}
      <ul className="flex min-w-0 flex-col gap-3">
        {items.map((task) => (
          <li
            key={task.id}
            className="flex min-w-0 flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <h2 className="min-w-0 flex-1 break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {task.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  task.status === "completed"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                }`}
              >
                {task.status === "completed" ? "Selesai" : "Aktif"}
              </span>
            </div>
            {task.description ? (
              <p className="line-clamp-2 break-words text-sm text-zinc-600 dark:text-zinc-400">
                {task.description}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                Prioritas: {task.priority}
              </span>
              {task.dueDate ? (
                <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                  Tenggat: {new Date(task.dueDate).toLocaleDateString("id-ID")}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
