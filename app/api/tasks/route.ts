import { handleCreateTask, handleListTasks } from "@/src/features/tasks/server/tasks.handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleListTasks(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateTask(request);
}
