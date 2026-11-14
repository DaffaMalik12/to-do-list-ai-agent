/**
 * Helper format tanggal dueDate berbasis zona waktu browser.
 * Label: "Hari ini", "Besok", "Terlambat", atau tanggal singkat.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export type DueDateState = "overdue" | "today" | "tomorrow" | "upcoming" | "none";

export interface DueDateInfo {
  state: DueDateState;
  label: string;
  title: string;
}

export function getDueDateInfo(dueDate: string | null | undefined): DueDateInfo {
  if (!dueDate) {
    return { state: "none", label: "", title: "" };
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return { state: "none", label: "", title: "" };
  }

  const todayStart = startOfDay(new Date());
  const dueStart = startOfDay(parsed);
  const diffDays = Math.round((dueStart - todayStart) / DAY_MS);

  const title = parsed.toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: dueDate.includes("T") ? "2-digit" : undefined,
    minute: dueDate.includes("T") ? "2-digit" : undefined,
  });

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      state: "overdue",
      label: overdueDays === 1 ? "Terlambat 1 hari" : `Terlambat ${overdueDays} hari`,
      title,
    };
  }

  if (diffDays === 0) {
    return { state: "today", label: "Hari ini", title };
  }

  if (diffDays === 1) {
    return { state: "tomorrow", label: "Besok", title };
  }

  if (diffDays < 7) {
    return {
      state: "upcoming",
      label: parsed.toLocaleDateString(undefined, { weekday: "long" }),
      title,
    };
  }

  return {
    state: "upcoming",
    label: parsed.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    title,
  };
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  return getDueDateInfo(dueDate).state === "overdue";
}

/** Format ISO date untuk input type="date" pada zona waktu browser. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
