const CURSOR_VERSION = 1;
const MAX_OFFSET = 1_000_000;

interface CursorPayload {
  v: number;
  o: number;
}

/**
 * Cursor opaque untuk pagination daftar tugas.
 * Client tidak boleh menganggap isinya stabil; hanya boleh memakai nilai
 * `nextCursor` yang dikembalikan API.
 */
export function encodeCursor(offset: number): string {
  const payload: CursorPayload = { v: CURSOR_VERSION, o: Math.max(0, Math.trunc(offset)) };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/** Mengembalikan offset atau `null` bila cursor tidak valid / dimanipulasi. */
export function decodeCursor(cursor: string): number | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;

    const payload = parsed as Partial<CursorPayload>;
    if (payload.v !== CURSOR_VERSION) return null;
    if (typeof payload.o !== "number" || !Number.isInteger(payload.o)) return null;
    if (payload.o < 0 || payload.o > MAX_OFFSET) return null;

    return payload.o;
  } catch {
    return null;
  }
}
