# todoagent

Aplikasi to-do list sederhana dengan persistensi SQLite, dibangun dengan Next.js 16 (App Router), TypeScript, Drizzle ORM, dan Tailwind CSS.

## Ringkasan Arsitektur

```text
.
├── config/                        # Konstanta DB & PRAGMA (dipakai runtime + drizzle-kit)
├── drizzle.config.ts              # Konfigurasi drizzle-kit (glob src/features/*/model/*.table.ts)
├── drizzle/                       # (hasil `drizzle-kit generate`) migrasi versioned — ikut di-commit
├── src/
│   ├── app/                       # Next.js App Router (halaman + route API)
│   │   ├── api/tasks/route.ts     # GET, POST /api/tasks
│   │   └── api/health/route.ts    # GET /api/health
│   ├── features/
│   │   ├── categories/model/      # Skema tabel categories
│   │   └── tasks/
│   │       ├── model/             # task.table.ts, task.schema.ts, task.types.ts
│   │       └── server/            # handlers → service → repository (Layer 1-3)
│   ├── shared/
│   │   ├── config/env.ts          # Validasi env server dengan Zod
│   │   ├── db/                    # client.ts (singleton), migrate.ts, schema.ts
│   │   └── http/                  # api-response.ts, request.ts
│   └── instrumentation.ts         # Migrasi + seed otomatis saat startup
└── docs/api.md                    # Dokumentasi lengkap endpoint API + Test Cases
```

Backend mengikuti **Clean/Layered Architecture**: route handler tipis hanya mengekspor fungsi dari `src/features/tasks/server/tasks.handlers.ts`, yang memanggil `tasks.service.ts` (logika bisnis) dan `tasks.repository.ts` (satu-satunya modul yang menyentuh tabel `tasks`). Semua file server diawali `import 'server-only'`.

## Menjalankan Aplikasi

```bash
# 1. Siapkan environment
cp .env.example .env.local

# 2. Install dependensi
npm install

# 3. Jalankan dev server (migrasi & seed otomatis)
npm run dev
# buka http://localhost:3000
```

## Perintah Berguna

```bash
npm run dev              # development server
npm run build            # build produksi
npm run start            # jalankan hasil build
npm run lint             # eslint
npx tsc --noEmit         # cek tipe
npx drizzle-kit generate # generate migrasi SQL dari skema (versioned → folder drizzle/)
npx drizzle-kit push     # apply skema ke database (prototyping)
```

## Environment Variables

| Variabel | Default | Keterangan |
| :--- | :--- | :--- |
| `DATABASE_PATH` | `./data/todoagent.db` | Path file SQLite; direktori induk dibuat otomatis. |
| `NODE_ENV` | `development` | `development` \| `test` \| `production`. |
| `NEXT_PUBLIC_API_BASE_URL` | *(kosong)* | Base URL API sisi client (kosong = same-origin). |

Detail lengkap variabel ada di `.env.example` dan `docs/api.md`.

## Database & Migrasi

- Driver: `better-sqlite3` + Drizzle ORM, singleton di `globalThis` agar HMR tidak membuat koneksi ganda.
- PRAGMA wajib saat open: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`.
- Migrasi + seed dijalankan otomatis oleh `src/instrumentation.ts` saat server start (idempoten). Untuk perubahan skema lanjutan gunakan `npx drizzle-kit generate` → folder `drizzle/` (versioned, lihat `docs/api.md` §5).
- Kategori default: **Inbox** (`id = "inbox"`, `is_default = 1`).
- Soft delete: kolom `deleted_at`; seluruh query daftar selalu memfilter `deleted_at IS NULL`.
- **Batas 5.000 tugas** ditegakkan di dalam transaksi `IMMEDIATE` (aman dari race condition request paralel).

## API

Dokumentasi kontrak lengkap (query params, contoh request/response, kode error, contoh `curl`, **Test Cases & bukti AC**) ada di [`docs/api.md`](docs/api.md).

Ringkasan endpoint:

| Method | Path | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status aplikasi & koneksi DB. |
| `GET` | `/api/tasks` | Daftar tugas (filter, search, sort, pagination). |
| `POST` | `/api/tasks` | Buat tugas baru. |

Endpoint `GET/PATCH/DELETE /api/tasks/[id]` direncanakan untuk tiket lanjutan (di luar scope VO-2).

Format respons: sukses `{ "data": ... }`, gagal `{ "error": { "code", "message", "details?" } }`.
