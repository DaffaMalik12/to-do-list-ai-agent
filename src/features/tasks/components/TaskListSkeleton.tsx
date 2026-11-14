import { Skeleton } from "@/shared/ui/Skeleton";

export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="Memuat daftar tugas"
      className="flex flex-col gap-2"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
        >
          <Skeleton className="h-5 w-5 shrink-0 rounded-[6px]" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}
