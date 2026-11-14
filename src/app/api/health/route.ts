import { isDatabaseUp } from "@/shared/db/client";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/** GET /api/health — status aplikasi & koneksi database. */
export function GET(): Response {
  const dbUp = isDatabaseUp();

  if (!dbUp) {
    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Database tidak dapat diakses.",
        },
      },
      { status: 500 },
    );
  }

  return Response.json(
    { data: { status: "ok", db: "up" } },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
