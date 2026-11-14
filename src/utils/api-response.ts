import { NextResponse } from "next/server";
import { AppError } from "./app-error";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/** Response sukses selalu dibungkus `{ data: ... }`. */
export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status, headers: NO_STORE_HEADERS });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

/**
 * Response error selalu berbentuk `{ error: { code, message, details? } }`.
 * Error tak terduga tidak pernah membocorkan stack trace ke client.
 */
export function jsonError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
        },
      },
      { status: error.status, headers: NO_STORE_HEADERS },
    );
  }

  console.error("[api] unhandled error:", error instanceof Error ? error.message : error);

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" } },
    { status: 500, headers: NO_STORE_HEADERS },
  );
}
