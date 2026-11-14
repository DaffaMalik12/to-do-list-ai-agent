import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type ZodIssue } from "zod";

/** Kode error yang dipakai konsisten di seluruh API. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface ApiSuccessBody<T> {
  data: T;
}

/** Error domain yang membawa status HTTP & kode error standar. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details: ApiErrorDetail[]): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static notFound(message = "Data tidak ditemukan."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static payloadTooLarge(message = "Ukuran payload melebihi batas."): ApiError {
    return new ApiError(413, "PAYLOAD_TOO_LARGE", message);
  }

  static internal(message = "Terjadi kesalahan pada server."): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

/** Ubah daftar issue Zod menjadi detail `{ path, message }`. */
export function zodIssuesToDetails(
  issues: ReadonlyArray<ZodIssue>,
): ApiErrorDetail[] {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

/** Response sukses standar `{ data: ... }` (200). */
export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status: 200, ...init });
}

/** Response pembuatan resource standar `{ data: ... }` (201). */
export function created<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status: 201, ...init });
}

/** Response error standar `{ error: { code, message, details? } }`. */
export function fail(error: ApiError): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    { status: error.status },
  );
}

/**
 * Bungkus handler route agar seluruh error (ApiError, ZodError, tak terduga)
 * dikonversi menjadi response JSON standar tanpa membocorkan stack trace.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return fail(error);
      }

      if (error instanceof ZodError) {
        return fail(
          ApiError.validation(
            "Data yang dikirim tidak valid.",
            zodIssuesToDetails(error.issues),
          ),
        );
      }

      // Jangan pernah mengirim stack trace ke client.
      console.error("[api] unhandled error:", error);
      return fail(ApiError.internal());
    }
  };
}
