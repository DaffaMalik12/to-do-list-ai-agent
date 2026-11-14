"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Task } from "@/features/tasks/model/task.types";
import { TaskGroup } from "@/features/tasks/components/TaskGroup";
import { Button } from "@/shared/ui/Button";

export interface TaskListProps {
  tasks: Task[];
  /** Dipanggil saat transisi ke empty state untuk fokus kembali ke QuickAddInput. */
  onRetryEmptyFocus?: () => void;
}

export function TaskList({ tasks, onRetryEmptyFocus }: TaskListProps) {
  const isEmpty = tasks.length === 0;

  const focusEmpty = useCallback(() => {
    onRetryEmptyFocus?.();
  }, [onRetryEmptyFocus]);

  // Fokus otomatis saat daftar bertransisi menjadi kosong (AC Empty state).
  useEffect(() => {
    if (!isEmpty || !focusEmpty) return undefined;
    const raf = window.requestAnimationFrame(focusEmpty);
    return () => window.cancelAnimationFrame(raf);
  }, [isEmpty, focusEmpty]);

  const { active, completed } = useMemo(() => {
    const activeTasks: Task[] = [];
    const completedTasks: Task[] = [];
    for (const task of tasks) {
      if (task.completed) completedTasks.push(task);
      else activeTasks.push(task);
    }
    return { active: activeTasks, completed: completedTasks };
  }, [tasks]);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-12 w-12 text-text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M8 10h8M8 14h5" />
          <path d="M16 3v3M8 3v3" />
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-text">Belum ada tugas</p>
          <p className="text-sm text-text-muted">
            Mulai dengan menambahkan tugas pertama Anda di kolom atas.
          </p>
        </div>
        {onRetryEmptyFocus ? (
          <Button variant="secondary" size="sm" onClick={focusEmpty}>
            Tambah tugas sekarang
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskGroup
        title="Aktif"
        tasks={active}
        defaultOpen
        emptyMessage="Semua tugas sudah selesai. Kerja bagus!"
      />
      <TaskGroup
        title="Selesai"
        tasks={completed}
        defaultOpen={completed.length > 0 && completed.length <= 5}
        emptyMessage="Belum ada tugas yang selesai."
      />
    </div>
  );
}
