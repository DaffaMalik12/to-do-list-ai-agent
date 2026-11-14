"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useDeleteTask } from "@/features/tasks/hooks/useDeleteTask";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import { inlineEditSchema } from "@/features/tasks/model/task.schema";
import type { Task } from "@/features/tasks/model/task.types";
import { cn } from "@/shared/lib/cn";
import { getDueDateInfo } from "@/shared/lib/date";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";

export interface TaskItemProps {
  task: Task;
}

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Prioritas rendah",
  medium: "Prioritas sedang",
  high: "Prioritas tinggi",
};

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-priority-low",
  medium: "bg-priority-medium",
  high: "bg-priority-high",
};

/**
 * `TaskItem` dirender oleh `TaskGroup` di dalam `<ul role="list">`.
 * Elemen `<li>` sudah implisit memiliki role `listitem`, jadi tidak perlu
 * menambahkan `role` manual; menambahkannya justru berlebihan.
 *
 * Perbaikan temuan QA (label prioritas): teks visual dan label SR kini menjadi
 * SATU sumber. Teks singkat ("Sedang") tetap terlihat, keterangan lengkap
 * disampaikan lewat `aria-label` pada pembungkus status sehingga tidak ada
 * dua pembacaan yang saling bertabrakan.
 */
export function TaskItem({ task }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [editError, setEditError] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement | null>(null);
  // Guard anti double-commit Enter + blur pada mode edit.
  const committingRef = useRef(false);
  // Guard sinkron anti toggle spam (proteksi tambahan di samping isPending).
  const togglingRef = useRef(false);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isUpdatingThis =
    updateTask.isPending && updateTask.variables?.id === task.id;
  const isDeletingThis = deleteTask.isPending && deleteTask.variables === task.id;

  useEffect(() => {
    if (editing) {
      editRef.current?.focus();
      editRef.current?.select();
    } else {
      committingRef.current = false;
    }
  }, [editing]);

  // Lepas guard toggle setelah mutasi selesai.
  useEffect(() => {
    if (!isUpdatingThis) {
      togglingRef.current = false;
    }
  }, [isUpdatingThis]);

  const dueInfo = getDueDateInfo(task.dueDate);

  const startEdit = () => {
    setDraft(task.title);
    setEditError(null);
    committingRef.current = false;
    setEditing(true);
  };

  const cancelEdit = useCallback(() => {
    // Tandai commit guard agar blur yang mungkin muncul tidak memicu commit.
    committingRef.current = true;
    setEditing(false);
    setEditError(null);
    setDraft(task.title);
  }, [task.title]);

  const commitEdit = useCallback(() => {
    if (committingRef.current) return;
    committingRef.current = true;

    const parsed = inlineEditSchema.safeParse({ title: draft });
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Judul tidak valid.");
      // Izinkan user memperbaiki dan menekan Enter lagi.
      committingRef.current = false;
      return;
    }

    const nextTitle = parsed.data.title;
    if (nextTitle === task.title) {
      setEditing(false);
      return;
    }

    setEditing(false);
    updateTask.mutate({ id: task.id, input: { title: nextTitle } });
  }, [draft, task.id, task.title, updateTask]);

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  const handleEditBlur = () => {
    // Hanya commit bila belum dipicu oleh Enter / Esc.
    if (committingRef.current) {
      committingRef.current = false;
      return;
    }
    commitEdit();
  };

  const handleToggle = () => {
    if (togglingRef.current || isUpdatingThis) return;
    togglingRef.current = true;
    updateTask.mutate({ id: task.id, input: { completed: !task.completed } });
  };

  const handleDelete = () => {
    if (isDeletingThis) return;
    const confirmed = window.confirm(`Hapus tugas "${task.title}"?`);
    if (!confirmed) return;
    deleteTask.mutate(task.id);
  };

  const priorityText =
    task.priority === "high"
      ? "Tinggi"
      : task.priority === "low"
        ? "Rendah"
        : "Sedang";

  return (
    <li
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-surface p-3",
        "transition-colors duration-[var(--dur-fast)] hover:border-border-strong",
        task.completed && "opacity-70",
      )}
    >
      <span className="pt-0.5">
        <Checkbox
          label={`Tandai "${task.title}" sebagai ${
            task.completed ? "belum selesai" : "selesai"
          }`}
          hideLabel
          checked={task.completed}
          onChange={handleToggle}
          disabled={isUpdatingThis || isDeletingThis}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {editing ? (
          <input
            ref={editRef}
            type="text"
            value={draft}
            aria-label={`Edit judul tugas ${task.title}`}
            aria-invalid={editError ? true : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              if (editError) setEditError(null);
            }}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            className={cn(
              "h-8 w-full rounded-md border bg-bg px-2 text-sm text-text",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              editError
                ? "border-danger"
                : "border-border-strong focus:border-primary",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title="Klik untuk mengedit"
            className={cn(
              "w-full min-w-0 truncate rounded-sm text-left text-sm font-medium text-text",
              "transition-colors duration-[var(--dur-fast)] hover:text-primary",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              task.completed && "line-through decoration-2 opacity-60",
            )}
          >
            {task.title}
          </button>
        )}

        {editError ? (
          <p role="alert" className="text-xs text-danger">
            {editError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span
            className="inline-flex items-center gap-1.5"
            aria-label={PRIORITY_LABEL[task.priority]}
          >
            <span
              aria-hidden="true"
              className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[task.priority])}
            />
            <span aria-hidden="true">{priorityText}</span>
          </span>

          {dueInfo.state !== "none" ? (
            <span
              title={dueInfo.title}
              className={cn(
                dueInfo.state === "overdue"
                  ? "font-medium text-danger"
                  : "text-text-muted",
              )}
            >
              {dueInfo.label}
            </span>
          ) : null}

          {task.subtaskSummary.total > 0 ? (
            <span>
              {task.subtaskSummary.done}/{task.subtaskSummary.total} subtask
            </span>
          ) : null}

          {task.checklistSummary.total > 0 ? (
            <span>
              {task.checklistSummary.done}/{task.checklistSummary.total} checklist
            </span>
          ) : null}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        aria-label={`Hapus tugas ${task.title}`}
        title="Hapus tugas"
        onClick={handleDelete}
        disabled={isDeletingThis}
        className="h-8 w-8 shrink-0 px-0 text-text-faint hover:text-danger"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </Button>
    </li>
  );
}
