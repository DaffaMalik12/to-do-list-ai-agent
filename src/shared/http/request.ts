import "server-only";

import { z } from "zod";
import { MAX_BODY_BYTES } from "../../../config/database.constants";
import { ApiError, zodIssuesToDetails } from "@/shared/http/api-response";

/**
 * Membaca body JSON dengan batas ukuran yang BENAR-BENAR ditegakkan.
 *
 * Mengapa tidak cukup `content-length`?
 * Header `content-length` dapat dihilangkan (chunked/HTTP2) atau dipalsukan oleh
 * client. Karena itu kita membaca `request.body` sebagai stream dan berhenti
 * begitu akumulasi byte melampaui batas — body besar tidak pernah sepenuhnya
 * masuk memori. `content-length` dipakai hanya sebagai *fast-path* penolakan.
 *
 * Perilaku:
 * - body > maxBytes → 413 (`PAYLOAD_TOO_LARGE`), stream dibatalkan (drained).
 * - body kosong → 400 (`VALIDATION_ERROR`).
 * - JSON rusak / bukan object → 400 (`VALIDATION_ERROR`).
 */
export async function readJsonBody(
  request: Request,
  options: { maxBytes?: number } = {},
): Promise<Record<string, unknown>> {
  const maxBytes = options.maxBytes ?? MAX_BODY_BYTES;

  // Fast-path: bila client jujur mengirim content-length, tolak lebih cepat
  // tanpa membaca stream sama sekali.
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      await cancelBody(request);
      throw ApiError.payloadTooLarge(
        `Ukuran body melebihi batas ${Math.floor(maxBytes / 1024)} KB.`,
      );
    }
  }

  const raw = await readBodyWithLimit(request, maxBytes);

  if (raw.trim() === "") {
    throw ApiError.validation("Body request tidak boleh kosong.", [
      { path: "(root)", message: "Body wajib berisi JSON object." },
    ]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiError.validation("Body request bukan JSON yang valid.", [
      { path: "(root)", message: "Format JSON tidak valid." },
    ]);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw ApiError.validation("Body request harus berupa JSON object.", [
      { path: "(root)", message: "Tipe data harus object." },
    ]);
  }

  return parsed as Record<string, unknown>;
}

/** Batalkan body tanpa membaca sisa (menghindari backpressure ke socket). */
async function cancelBody(request: Request): Promise<void> {
  try {
    if (request.body) {
      await request.body.cancel();
    }
  } catch {
    /* stream sudah ditutup — abaikan. */
  }
}

/**
 * Baca seluruh body dengan batas keras `maxBytes`.
 * Begitu melewati batas → batalkan stream & lempar 413.
 */
async function readBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const stream = request.body;
  if (!stream) return "";

  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let total = 0;
  let text = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw ApiError.payloadTooLarge(
          `Ukuran body melebihi batas ${Math.floor(maxBytes / 1024)} KB.`,
        );
      }

      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return text;
}

/** Validasi nilai dengan schema Zod, melempar ApiError 400 bila gagal. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ApiError.validation(
      "Data yang dikirim tidak valid.",
      zodIssuesToDetails(result.error.issues),
    );
  }
  return result.data;
}

/** Ubah URLSearchParams menjadi object biasa (nilai kosong diabaikan). */
export function searchParamsToObject(
  params: URLSearchParams,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") result[key] = value;
  }
  return result;
}
