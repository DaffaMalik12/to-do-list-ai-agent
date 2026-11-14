import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module SQLite harus di-externalize agar tidak di-bundle.
  serverExternalPackages: ["better-sqlite3"],
  // Catatan: `experimental.serverActions.bodySizeLimit` TIDAK berlaku untuk
  // Route Handler `/api/*` — hanya untuk Server Actions. Batas 1 MB untuk API
  // ditegakkan secara eksplisit di `src/shared/http/request.ts` → `readJsonBody()`
  // (membaca stream request.body dan membatalkan saat melampaui batas).
};

export default nextConfig;
