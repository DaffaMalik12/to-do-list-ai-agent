# To Do List AI Agent

Aplikasi to-do list berbasis **Next.js (App Router)** dengan backend REST API berlapis (Clean/Layered Architecture) dan database **SQLite**.

## Arsitektur Backend (Layered)

```text
src/
├── config/
│   └── database.ts                 # Koneksi SQLite + migrasi idempotent
├── features/
│   └── tasks/
│       ├── types.ts                # Kontrak domain (Task, query, payload)
│       └── server/
│           ├── tasks.handlers.ts   # LAYER 1: HTTP request/response
│           ├── tasks.schema.ts     # Validasi & normalisasi input
│           ├── tasks.service.ts    # LAYER 2: logika bisnis (pencarian, cursor)
│           └── tasks.repository.ts # LAYER 3: query SQL berparameter
└── utils/                          # AppError, response helper, escape LIKE, cursor
app/api/tasks/                      # Route handler (pemetaan URL → Layer 1)
docs/api.md                         # Dokumentasi API
```

Aturan layer: Controller/Handler hanya urusan HTTP, logika bisnis di `*.service.ts`, dan seluruh query database (termasuk pencarian `q`) berada di `*.repository.ts` dengan **parameter binding**.

## Menjalankan Aplikasi

```bash
npm install
cp .env.example .env.local   # opsional, default DATABASE_PATH=./data/app.db
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Database

- Database SQLite dibuat otomatis pada path `DATABASE_PATH` (default `data/app.db`).
- Skema dibuat otomatis dan idempotent saat koneksi pertama (`CREATE TABLE IF NOT EXISTS ...`) — tidak ada perintah migrasi manual.
- Detail skema, variabel environment, dan panduan migrasi: lihat [docs/api.md](docs/api.md#setup-database--panduan-migrasi).
- Disarankan menambahkan `data/` ke `.gitignore` agar file database lokal tidak ter-commit.

## API

Dokumentasi lengkap (kontrak, contoh request/response JSON, kode error, dan test case pencarian) ada di **[docs/api.md](docs/api.md)**.

Ringkasan endpoint:

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/tasks` | Daftar tugas + filter `q`, `status`, `categoryId`, `due`, `sort`, `order`, `limit`, `cursor` |
| POST | `/api/tasks` | Membuat tugas |
| GET | `/api/tasks/{id}` | Detail tugas |
| PATCH | `/api/tasks/{id}` | Memperbarui tugas |
| DELETE | `/api/tasks/{id}` | Soft delete tugas |

Contoh pencarian:

```bash
curl "http://localhost:3000/api/tasks?q=belanja&status=active&sort=due&order=asc&limit=20"
```

`q` di-trim, maksimal **200 karakter**, case-insensitive pada `title` + `description`, wildcard `%` `_` `\` di-escape (literal), dan hasil diurutkan berdasarkan relevansi (title prefix → title substring → description) sebelum `sort`/`order` yang diminta.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # jalankan hasil build
npm run lint    # eslint
```
