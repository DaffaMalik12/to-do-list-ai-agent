import "server-only";

import { created, ok, withErrorHandling } from "@/shared/http/api-response";
import {
  parseOrThrow,
  readJsonBody,
  searchParamsToObject,
} from "@/shared/http/request";
import { createTaskSchema, taskListQuerySchema } from "@/features/tasks/model/task.schema";
import { tasksService } from "@/features/tasks/server/tasks.service";
import { ensureMigrated } from "@/shared/db/migrate";

export const runtime = "nodejs";

/**
 * LAYER 1 — handler HTTP fitur tasks (scope tiket VO-2).
 * Tanggung jawab: parse & validasi request, panggil service, bentuk response.
 *
 * `ensureMigrated()` di sini adalah guard idempoten; ia membuat file ini
 * selalu aman (mis. saat unit test / route di-invoke di luar startup penuh)
 * sehingga bukan dead code.
 */

/** GET /api/tasks */
export const listTasksHandler = withErrorHandling(async (request: Request) => {
  ensureMigrated();

  const url = new URL(request.url);
  const query = parseOrThrow(
    taskListQuerySchema,
    searchParamsToObject(url.searchParams),
  );

  const result = tasksService.list(query);
  return ok({ items: result.items, nextCursor: result.nextCursor });
});

/** POST /api/tasks */
export const createTaskHandler = withErrorHandling(async (request: Request) => {
  ensureMigrated();

  const body = await readJsonBody(request);
  const payload = parseOrThrow(createTaskSchema, body);

  return created(tasksService.create(payload));
});
