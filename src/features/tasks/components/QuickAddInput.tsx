"use client";

import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useCreateTask } from "@/features/tasks/hooks/useCreateTask";
import { quickAddSchema } from "@/features/tasks/model/task.schema";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";

export interface QuickAddInputProps {
  /** Dipanggil setiap submit sukses. */
  onSubmitSuccess?: () => void;
  className?: string;
}

export const QuickAddInput = forwardRef<HTMLInputElement, QuickAddInputProps>(
  function QuickAddInput({ onSubmitSuccess, className }, ref) {
    const [title, setTitle] = useState("");
    const [error, setError] = useState<string | null>(null);
    // Guard sinkron: cegah double-submit Enter beruntun sebelum render ulang.
    const submittingRef = useRef(false);
    const createTask = useCreateTask();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (submittingRef.current || createTask.isPending) return;

      const parsed = quickAddSchema.safeParse({ title });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Judul tidak valid.");
        return;
      }

      setError(null);
      const submittedTitle = parsed.data.title;
      // Kosongkan input lebih awal agar pengguna bisa langsung mengetik tugas
      // berikutnya (input beruntun). `submittedTitle` disimpan terpisah.
      setTitle("");
      submittingRef.current = true;

      createTask.mutate(
        { title: submittedTitle },
        {
          onSuccess: () => {
            onSubmitSuccess?.();
          },
          onError: () => {
            // Pulihkan teks yang hilang bila server menolak (mis. 400/422/429).
            // Tidak menimpa apa pun bila pengguna sudah mengetik teks baru.
            setTitle((current) => (current.length === 0 ? submittedTitle : current));
          },
          onSettled: () => {
            submittingRef.current = false;
            // Kembalikan fokus untuk input beruntun.
            if (typeof window !== "undefined") {
              window.requestAnimationFrame(() => inputRef.current?.focus());
            }
          },
        },
      );

      // Tetap fokus segera setelah submit (sebelum request selesai).
      inputRef.current?.focus();
    };

    return (
      <form
        onSubmit={handleSubmit}
        className={cn("flex flex-col gap-1.5", className)}
        noValidate
      >
        <label htmlFor="quick-add-input" className="sr-only">
          Tambah tugas baru
        </label>
        <div className="flex items-center gap-2">
          <input
            id="quick-add-input"
            ref={setRefs}
            name="title"
            type="text"
            value={title}
            autoFocus
            autoComplete="off"
            placeholder="Tambah tugas, tekan Enter…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "quick-add-error" : undefined}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError(null);
            }}
            className={cn(
              "h-12 w-full rounded-lg border bg-surface px-4 text-base text-text shadow-sm",
              "placeholder:text-text-faint",
              "transition-colors duration-[var(--dur-fast)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              error ? "border-danger" : "border-border-strong focus:border-primary",
            )}
          />
          <Button
            type="submit"
            disabled={createTask.isPending || title.trim().length === 0}
            aria-label="Tambah tugas"
            className="h-12 shrink-0 px-5"
          >
            {createTask.isPending ? "…" : "Tambah"}
          </Button>
        </div>
        {error ? (
          <p id="quick-add-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </form>
    );
  },
);
