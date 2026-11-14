import {
  handleDeleteTask,
  handleGetTask,
  handleUpdateTask,
} from "@/src/features/tasks/server/tasks.handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return handleGetTask(id);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateTask(request, id);
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteTask(id);
}
