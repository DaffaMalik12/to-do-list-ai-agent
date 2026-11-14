import "server-only";

import { z } from "zod";
import { DEFAULT_DATABASE_PATH } from "../../../config/database.constants";

/**
 * Konfigurasi environment sisi server, divalidasi dengan Zod.
 * TIDAK boleh diimpor dari komponen client.
 */
const serverEnvSchema = z.object({
  DATABASE_PATH: z
    .string()
    .trim()
    .min(1, "DATABASE_PATH tidak boleh kosong.")
    .default(DEFAULT_DATABASE_PATH),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    DATABASE_PATH: process.env.DATABASE_PATH,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Konfigurasi environment server tidak valid — ${detail}`);
  }

  return parsed.data;
}

let cached: ServerEnv | null = null;

/** Konfigurasi environment server (di-cache per proses). */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = readServerEnv();
  }
  return cached;
}

export const serverEnv = {
  get databasePath(): string {
    return getServerEnv().DATABASE_PATH;
  },
  get nodeEnv(): ServerEnv["NODE_ENV"] {
    return getServerEnv().NODE_ENV;
  },
} as const;
