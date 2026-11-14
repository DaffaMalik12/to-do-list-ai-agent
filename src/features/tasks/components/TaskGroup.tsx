"use client";

import type { Task } from "@/features/tasks/model/task.types";
import { TaskItem } from "@/features/tasks/components/TaskItem";
import { Collapsible } from "@/shared/ui/Collapsible";

export interface TaskGroupProps {
  title: string;
  tasks: Task[];
  defaultOpen?: boolean;
  emptyMessage?: string;
}

export function TaskGroup({
  title,
  tasks,
  defaultOpen = true,
  emptyMessage,
}: TaskGroupProps) {
  return (
    <Collapsible title={title} count={tasks.length} defaultOpen={defaultOpen}>
      {tasks.length > 0 ? (
        <ul role="list" className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      ) : (
        <p className="px-1 py-2 text-sm text-text-faint">
          {emptyMessage ?? "Belum ada tugas di bagian ini."}
        </p>
      )}
    </Collapsible>
  );
}
