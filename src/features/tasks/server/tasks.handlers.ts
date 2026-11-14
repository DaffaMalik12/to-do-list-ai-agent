import { AppError } from "@/utils/app-error";
import { jsonError, jsonSuccess, noContent } from "@/utils/api-response";
import {
  isValidTaskId,
  parseCreateTaskBody,
  parseTaskListQuery,
  parseUpdateTaskBody,
} from "./tasks.schema";
import * as tasksService from "./tasks.service";

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.validation([{ path: "body", message: "Body request harus berupa JSON yang valid" }]);
  }
}

function assertValidTaskId(id: string): string {
  if (!isValidTaskId(id)) {
    throw AppError.validation([{ path: "id", message: "id tugas tidak valid" }]);
  }
  return id;
}

/** Layer 1: GET /api/tasks (termasuk pencarian `q`). */
export async function handleListTasks(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseTaskListQuery(searchParams);
    if (!parsed.success) throw AppError.validation(parsed.details);

    const result = await tasksService.listTasks(parsed.data);
    return jsonSuccess(result);
  } catch (error) {
    return jsonError(error);
  }
}

/** Layer 1: POST /api/tasks. */
export async function handleCreateTask(request: Request): Promise<Response> {
  try {
    const payload = await readJsonBody(request);
    const parsed = parseCreateTaskBody(payload);
    if (!parsed.success) throw AppError.validation(parsed.details);

    const task = await tasksService.createTask(parsed.data);
    return jsonSuccess(task, 201);
  } catch (error) {
    return jsonError(error);
  }
}

/** Layer 1: GET /api/tasks/{id}. */
export async function handleGetTask(id: string): Promise<Response> {
  try {
    const task = await tasksService.getTaskById(assertValidTaskId(id));
    return jsonSuccess(task);
  } catch (error) {
    return jsonError(error);
  }
}

/** Layer 1: PATCH /api/tasks/{id}. */
export async function handleUpdateTask(request: Request, id: string): Promise<Response> {
  try {
    const taskId = assertValidTaskId(id);
    const payload = await readJsonBody(request);
    const parsed = parseUpdateTaskBody(payload);
    if (!parsed.success) throw AppError.validation(parsed.details);

    const task = await tasksService.updateTaskById(taskId, parsed.data);
    return jsonSuccess(task);
  } catch (error) {
    return jsonError(error);
  }
}

/** Layer 1: DELETE /api/tasks/{id} (soft delete). */
export async function handleDeleteTask(id: string): Promise<Response> {
  try {
    await tasksService.deleteTaskById(assertValidTaskId(id));
    return noContent();
  } catch (error) {
    return jsonError(error);
  }
}
