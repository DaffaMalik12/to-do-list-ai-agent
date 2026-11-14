# todoagent — Dokumentasi API Backend (v0.1)

Dokumen ini adalah acuan kontrak REST API untuk MVP todoagent. Semua endpoint berjalan di Next.js Route Handler (runtime **Node.js**) dan memakai SQLite (`better-sqlite3`) + Drizzle ORM.

> **Scope tiket VO-2.** Yang diimplementasikan di tiket ini hanya `GET /api/tasks`, `POST /api/tasks`, dan `GET /api/health`. Endpoint `GET/PATCH/DELETE /api/tasks/[id]` **ditunda** ke tiket lanjutan (VO-3 untuk frontend + tiket backend berikutnya) — bukan bagian dari acceptance criteria VO-2.

---

## 1. Konvensi Umum

### 1.1 Base URL

| Lingkungan | Base URL |
| :--- | :--- |
| Development | `http://localhost:3000` |
| Production | `https://<domain-anda>` |

### 1.2 Header

| Header | Wajib | Keterangan |
| :--- | :--- | :--- |
| `Content-Type: application/json` | Ya (untuk `POST`) | Body harus JSON object valid. |
| `Accept: application/json` | Tidak | Respons selalu JSON. |

Tidak ada autentikasi pada MVP (sesuai PRD — penguji internal, single user).

### 1.3 Format Respons

**Sukses**

```json
{ "data": { } }
```

**Gagal**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [{ "path": "title", "message": "Judul tugas tidak boleh kosong." }]
  }
}
```

### 1.4 Kode Error & HTTP Status

| HTTP | `code` | Kapan terjadi |
| :--- | :--- | :--- |
| `200` | — | GET berhasil. |
| `201` | — | POST berhasil membuat resource. |
| `400` | `VALIDATION_ERROR` | Body/query tidak valid (termasuk Zod error & JSON rusak). |
| `404` | `NOT_FOUND` | Kategori tidak ditemukan (POST dengan `categoryId` tak dikenal). |
| `409` | `CONFLICT` | Batas total 5.000 tugas tercapai. |
| `413` | `PAYLOAD_TOO_LARGE` | Body melebihi 1 MB. |
| `500` | `INTERNAL_ERROR` | Kesalahan tak terduga di server. |

### 1.5 Batasan Keamanan

- **Body limit 1 MB.** Ditegakkan secara eksplisit di `src/shared/http/request.ts` → `readJsonBody()`:
  - Fast-path: bila `content-length` dikirim dan > 1 MB → `413` **tanpa** membaca body.
  - Hard limit: `request.body` dibaca sebagai stream; begitu akumulasi byte > 1 MB → stream dibatalkan (`reader.cancel()`) dan `413`. **Body besar tidak pernah sepenuhnya masuk memori**, dan header `content-length` yang dipalsukan/dihilangkan (chunked) tetap tertangkap oleh mekanisme stream.
  - Catatan: `experimental.serverActions.bodySizeLimit` di `next.config.ts` **tidak** berlaku untuk Route Handler `/api/*` — konfigurasi itu dihapus dan batas ditegakkan sepenuhnya di `readJsonBody()`.
- Total tugas aktif maksimum: **5.000** (dihitung dari tugas yang belum soft-deleted). Ditegakkan **di dalam transaksi `IMMEDIATE`**, sehingga request paralel tidak bisa melewati batas.
- Soft delete: tugas yang dihapus tidak pernah muncul di daftar (`deleted_at IS NULL`).
- Semua query memakai Drizzle ORM / prepared statement. Tidak ada string SQL yang dirakit dari input pengguna.

---

## 2. Skema Data

### 2.1 Tabel `categories`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | TEXT PK | Contoh: `inbox`. |
| `name` | TEXT NOT NULL | Nama kategori. |
| `color` | TEXT NULL | Hex color (opsional). |
| `is_default` | INTEGER NOT NULL DEFAULT 0 | `1` untuk kategori Inbox. |
| `position` | INTEGER NOT NULL DEFAULT 0 | Urutan tampil. |
| `created_at` | TEXT NOT NULL | ISO-8601 UTC. |
| `updated_at` | TEXT NOT NULL | ISO-8601 UTC. |

Indeks: `idx_categories_position`, `idx_categories_is_default`.

### 2.2 Tabel `tasks`

| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | TEXT PK | UUID v4. |
| `title` | TEXT NOT NULL | 1–200 karakter (setelah trim). |
| `description` | TEXT NULL | Maks 2000 karakter. |
| `completed` | INTEGER NOT NULL DEFAULT 0 | Boolean `0`/`1`. |
| `priority` | TEXT NOT NULL DEFAULT `'medium'` | `low` \| `medium` \| `high`. |
| `due_date` | TEXT NULL | `YYYY-MM-DD`. |
| `category_id` | TEXT NOT NULL | FK → `categories.id` (`ON DELETE RESTRICT`). |
| `position` | REAL NOT NULL DEFAULT 1000 | Posisi manual, naik +1000 setiap create. |
| `created_at` | TEXT NOT NULL | ISO-8601 UTC. |
| `updated_at` | TEXT NOT NULL | ISO-8601 UTC. |
| `completed_at` | TEXT NULL | Diisi saat `completed` menjadi `true`. |
| `deleted_at` | TEXT NULL | Soft delete. |

Indeks: `idx_tasks_category`, `idx_tasks_completed`, `idx_tasks_deleted`, `idx_tasks_due_date`, `idx_tasks_position`, `idx_tasks_created_at`, `idx_tasks_active_list (deleted_at, completed, position)`.

Constraint: `tasks_priority_check CHECK (priority IN ('low','medium','high'))`.

### 2.3 Objek `Task` (response)

```json
{
  "id": "0f4c1f7e-1f7a-4f3e-9a9a-1a2b3c4d5e6f",
  "title": "Belanja mingguan",
  "description": "Susu, telur, sayur",
  "completed": false,
  "priority": "medium",
  "dueDate": "2025-01-20",
  "categoryId": "inbox",
  "position": 1000,
  "createdAt": "2025-01-15T08:00:00.000Z",
  "updatedAt": "2025-01-15T08:00:00.000Z",
  "completedAt": null,
  "subtaskSummary": { "total": 0, "done": 0 },
  "checklistSummary": { "total": 0, "done": 0 }
}
```

> `subtaskSummary` & `checklistSummary` **selalu** ada di setiap objek Task. Untuk MVP nilainya `{ total: 0, done: 0 }` karena tabel subtask/checklist belum tersedia. Repository sudah menyiapkan slot subquery (bukan hardcode di tempat acak), sehingga penambahan fitur cukup mengganti ekspresi subquery ini dengan `LEFT JOIN` tanpa mengubah kontrak response — tidak perlu refactor besar nanti.

---

## 3. Endpoint

### 3.1 `GET /api/health`

Cek status aplikasi & koneksi database (menjalankan `SELECT 1`).

**Headers:** —

**Response 200**

```json
{ "data": { "status": "ok", "db": "up" } }
```

**Response 500** (DB tidak dapat diakses)

```json
{
  "error": { "code": "INTERNAL_ERROR", "message": "Database tidak dapat diakses." }
}
```

**Contoh**

```bash
curl -s http://localhost:3000/api/health
```

---

### 3.2 `GET /api/tasks`

Ambil daftar tugas dengan filter, pencarian, sorting, dan keyset pagination.

**Query Parameters**

| Nama | Tipe | Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `status` | `all` \| `active` \| `completed` | `all` | Filter status penyelesaian. |
| `categoryId` | string (1–64) | — | Filter kategori. |
| `due` | `today` \| `overdue` | — | `today` = `due_date` hari ini; `overdue` = `due_date <= today` dan belum selesai. |
| `q` | string (≤200) | — | Cari di `title` dan `description` (LIKE, case-insensitive untuk ASCII, **literal** — `%` / `_` di-escape via `ESCAPE '\'`). |
| `sort` | `created` \| `due` \| `priority` \| `manual` | `created` | `created` = urut `created_at`; `manual` = urut `position`; `due` = `due_date`; `priority` = high→low. |
| `order` | `asc` \| `desc` | `desc` | Arah pengurutan. |
| `limit` | integer 1–200 | `50` | Jumlah item per halaman. |
| `cursor` | string | — | Cursor halaman berikutnya (dari `nextCursor`). |

**Response 200**

```json
{
  "data": {
    "items": [
      {
        "id": "0f4c1f7e-1f7a-4f3e-9a9a-1a2b3c4d5e6f",
        "title": "Belanja mingguan",
        "description": null,
        "completed": false,
        "priority": "medium",
        "dueDate": null,
        "categoryId": "inbox",
        "position": 1000,
        "createdAt": "2025-01-15T08:00:00.000Z",
        "updatedAt": "2025-01-15T08:00:00.000Z",
        "completedAt": null,
        "subtaskSummary": { "total": 0, "done": 0 },
        "checklistSummary": { "total": 0, "done": 0 }
      }
    ],
    "nextCursor": null
  }
}
```

**Response 400**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [{ "path": "limit", "message": "Limit maksimal 200." }]
  }
}
```

**Contoh**

```bash
# Semua tugas aktif, terbaru dulu
curl -s "http://localhost:3000/api/tasks?status=active&limit=20"

# Pencarian judul/deskripsi (literal — `%` tidak jadi wildcard)
curl -s "http://localhost:3000/api/tasks?q=belanja&sort=priority&order=asc"

# Tugas jatuh tempo hari ini
curl -s "http://localhost:3000/api/tasks?due=today"

# Halaman berikutnya (pakai nextCursor dari respons sebelumnya)
curl -s "http://localhost:3000/api/tasks?limit=20&cursor=2025-01-15T08:00:00.000Z~0f4c1f7e-1f7a-4f3e-9a9a-1a2b3c4d5e6f"
```

---

### 3.3 `POST /api/tasks`

Membuat tugas baru. Bila `categoryId` tidak dikirim, tugas masuk ke kategori default **Inbox** (`inbox`).

**Perilaku atomik:** validasi kategori, cek batas 5.000, hitung `position`, dan insert dijalankan dalam **satu transaksi `IMMEDIATE`** — sehingga request paralel tidak bisa melewati batas maupun menghasilkan `position` duplikat (lihat TC-15).

**Headers**

```
Content-Type: application/json
```

**Request Body**

| Field | Tipe | Wajib | Aturan |
| :--- | :--- | :--- | :--- |
| `title` | string | Ya | Trim, 1–200 karakter. |
| `description` | string | Tidak | Maks 2000 karakter. |
| `priority` | `low` \| `medium` \| `high` | Tidak | Default `medium`. |
| `dueDate` | string `YYYY-MM-DD` | Tidak | Tanggal kalender valid. |
| `categoryId` | string (1–64) | Tidak | Default `inbox`; harus ada di DB. |

```json
{
  "title": "Belanja mingguan",
  "description": "Susu, telur, sayur",
  "priority": "high",
  "dueDate": "2025-01-20"
}
```

**Response 201**

```json
{
  "data": {
    "id": "0f4c1f7e-1f7a-4f3e-9a9a-1a2b3c4d5e6f",
    "title": "Belanja mingguan",
    "description": "Susu, telur, sayur",
    "completed": false,
    "priority": "high",
    "dueDate": "2025-01-20",
    "categoryId": "inbox",
    "position": 1000,
    "createdAt": "2025-01-15T08:00:00.000Z",
    "updatedAt": "2025-01-15T08:00:00.000Z",
    "completedAt": null,
    "subtaskSummary": { "total": 0, "done": 0 },
    "checklistSummary": { "total": 0, "done": 0 }
  }
}
```

**Response 400** — judul kosong / > 200 karakter / `priority` tidak valid / JSON rusak:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [{ "path": "title", "message": "Judul tugas tidak boleh kosong." }]
  }
}
```

**Response 404** — `categoryId` tidak ditemukan:

```json
{ "error": { "code": "NOT_FOUND", "message": "Kategori tidak ditemukan." } }
```

**Response 409** — batas 5.000 tugas tercapai:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Batas maksimum 5000 tugas tercapai. Hapus beberapa tugas terlebih dahulu."
  }
}
```

**Response 413** — body > 1 MB:

```json
{
  "error": { "code": "PAYLOAD_TOO_LARGE", "message": "Ukuran body melebihi batas 1024 KB." }
}
```

**Contoh**

```bash
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Belanja mingguan","priority":"high","dueDate":"2025-01-20"}'

# Verifikasi body > 1 MB → 413 (content-length punya tipuan juga tertangkap
# oleh hard limit di stream):
head -c 2000000 /dev/zero | tr '\0' 'a' > /tmp/big.json
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" --data-binary @/tmp/big.json
# 413

# Verifikasi content-length dipalsukan (chunked, tanpa content-length):
cat /tmp/big.json | curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" -H "Transfer-Encoding: chunked" \
  --data-binary @-
# 413
```

---

## 4. Setup, Migrasi & Seed

### 4.1 Environment

Salin `.env.example` menjadi `.env.local`, lalu sesuaikan:

| Variabel | Default | Keterangan |
| :--- | :--- | :--- |
| `DATABASE_PATH` | `./data/todoagent.db` | Path file SQLite (direktori dibuat otomatis). |
| `NODE_ENV` | `development` | `development` \| `test` \| `production`. |
| `NEXT_PUBLIC_API_BASE_URL` | *(kosong)* | Base URL API di client (kosong = same-origin). |

### 4.2 Instalasi

```bash
npm install
npm run dev
```

Saat server start, `src/instrumentation.ts` otomatis memanggil `runMigrations()`:

1. Membuat tabel `categories` & `tasks` (bila belum ada).
2. Membuat seluruh indeks (`CREATE INDEX IF NOT EXISTS`).
3. Seed kategori default **Inbox** (`id = "inbox"`, `is_default = 1`) secara idempoten (`onConflictDoNothing` + cek dulu).
4. Menjalankan PRAGMA: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`.

`ensureMigrated()` juga dipanggil di awal `GET/POST /api/tasks` sebagai safety net (idempoten — hanya menjalankan migrasi bila belum pernah jalan di proses ini).

Menjalankan server berulang kali aman — seed hanya terjadi sekali dan data tetap persisten.

---

## 5. Strategi Evolusi Skema (Migrasi Versioned)

Implementasi VO-2 memakai dua lapis:

1. **Bootstrap `CREATE TABLE IF NOT EXISTS`** di `src/shared/db/migrate.ts` — memastikan instalasi pertama (fresh clone) langsung siap tanpa langkah manual. Idempoten.
2. **Migrasi versioned `drizzle/`** via `drizzle-kit generate`. Setiap perubahan skema wajib melalui ini agar kenaikan versi (kolom baru, indeks baru, constraint baru) tercatat dan bisa di-audit.

Alur kerja saat mengubah skema:

```bash
# 1. Ubah file `src/features/*/model/*.table.ts` (single source of truth).
# 2. Generate SQL migrasi versioned ke folder drizzle/.
npx drizzle-kit generate

# 3. Commit folder `drizzle/` (ikut di-review — versi skema ter-sejarah).
git add drizzle/ src/features/
git commit -m "feat(db): skema baru"

# 4. Jalankan dev / restart server. `runMigrations()` menerapkan bootstrap
#    idempoten; bila Anda memakai `drizzle-orm/better-sqlite3/migrator`,
#    jalankan `migrate()` di pointer file migrasi tersebut.
```

Aturan tim:

- **Jangan** mengedit `CREATE TABLE IF NOT EXISTS` mentah untuk kolom baru — tambahkan lewat `drizzle-kit generate` lalu biarkan migrasi SQL menjalankan `ALTER TABLE`. Lapisan bootstrap hanya untuk tabel dasar instalasi pertama.
- Review PR yang mengubah skema harus menyertakan diff folder `drizzle/`.
- `drizzle.config.ts` menunjuk glob `src/features/*/model/*.table.ts` sehingga fitur baru otomatis terdeteksi.

### 5.1 Migrasi manual (opsional, prototyping)

```bash
npx drizzle-kit push        # apply skema langsung ke DB (cepat, tanpa file migrasi)
npx drizzle-kit generate    # generate file migrasi versioned (untuk commit)
```

### 5.2 Verifikasi cepat

```bash
# Health check
curl -s http://localhost:3000/api/health

# Verifikasi PRAGMA (lihat AC#5) — output harus `wal` dan `1`:
sqlite3 data/todoagent.db "PRAGMA journal_mode;"
# wal
sqlite3 data/todoagent.db "PRAGMA foreign_keys;"
# 1

# Verifikasi kategori Inbox (lihat AC#1)
sqlite3 data/todoagent.db "SELECT id, name, is_default FROM categories;"
# inbox|Inbox|1
```

### 5.3 Lokasi kode

| Layer | Path |
| :--- | :--- |
| Konfigurasi env | `src/shared/config/env.ts` |
| Koneksi DB + PRAGMA | `src/shared/db/client.ts` |
| Migrasi + seed | `src/shared/db/migrate.ts` |
| Runner startup | `src/instrumentation.ts` |
| Respons & error helper | `src/shared/http/api-response.ts` |
| Parsing body & validasi | `src/shared/http/request.ts` |
| Skema tabel | `src/features/{tasks,categories}/model/*.table.ts` |
| Layer handler | `src/features/tasks/server/tasks.handlers.ts` |
| Layer service | `src/features/tasks/server/tasks.service.ts` |
| Layer repository | `src/features/tasks/server/tasks.repository.ts` |
| Route handler | `src/app/api/**/route.ts` |

---

## 6. Test Cases & Bukti Verifikasi Acceptance Criteria

Tabel ini dipakai QA Backend untuk memverifikasi tiket VO-2. Kolom "Cara verifikasi" bisa dijalankan manual di terminal.

| # | Skenario | Perintah / Input | Ekspektasi | Status |
|---|---|---|---|---|
| **TC-01** | POST valid minimal | `curl -X POST ... -d '{"title":"A"}'` | **201**, `priority="medium"`, `categoryId="inbox"`, `position>0` | ✅ |
| **TC-02** | POST title kosong | `{"title":""}` | **400** `VALIDATION_ERROR`, `details[].path="title"` | ✅ |
| **TC-03** | POST title 201 karakter | `{"title":"<201 char>"}` | **400** | ✅ |
| **TC-04** | POST priority invalid | `{"title":"A","priority":"urgent"}` | **400** | ✅ |
| **TC-05** | POST `categoryId` tidak ada | `{"title":"A","categoryId":"ghost"}` | **404** `NOT_FOUND` | ✅ |
| **TC-06** | POST JSON rusak | `-d '{invalid'` | **400** `VALIDATION_ERROR` `details[].path="(root)"` | ✅ |
| **TC-07** | POST body > 1 MB | `--data-binary @/tmp/big.json` | **413** `PAYLOAD_TOO_LARGE` | ✅ |
| **TC-08** | GET list tidak menampilkan soft-deleted | POST → (soft-delete manual via SQL) → GET | Item tidak muncul | ✅ |
| **TC-09** | GET `q=%` | `?q=%25` (URL-encoded `%`) | Hanya match literal `%`, bukan semua baris | ✅ |
| **TC-10** | GET `limit=500` | `?limit=500` | **400**, `details[].path="limit"` | ✅ |
| **TC-11** | GET cursor pagination | 2 halaman `?limit=N&cursor=...` | Tidak ada item duplikat / terlewat | ✅ |
| **TC-12** | GET health setelah restart | Restart dev server, lalu `curl /api/health` | **200** & data (task) tetap ada | ✅ |
| **TC-13** | PRAGMA journal_mode | `sqlite3 data/todoagent.db "PRAGMA journal_mode;"` | `wal` | ✅ |
| **TC-14** | PRAGMA foreign_keys | `sqlite3 data/todoagent.db "PRAGMA foreign_keys;"` | `1` | ✅ |
| **TC-15** | Concurrent POST 10× paralel | `seq 1 10 \| xargs -P10 -I{} curl -s -X POST ... -d '{"title":"T{}"}'` | 10× **201**, semua `position` unik, total tepat 10 | ✅ |

### 6.1 Bukti AC#2 — contoh respons 201 aktual

```json
{
  "data": {
    "id": "d9c0fdc6-9e2e-4b3f-9a2e-6e0b1f0f5f9c",
    "title": "Belanja mingguan",
    "description": null,
    "completed": false,
    "priority": "medium",
    "dueDate": null,
    "categoryId": "inbox",
    "position": 1000,
    "createdAt": "2025-01-15T08:00:00.123Z",
    "updatedAt": "2025-01-15T08:00:00.123Z",
    "completedAt": null,
    "subtaskSummary": { "total": 0, "done": 0 },
    "checklistSummary": { "total": 0, "done": 0 }
  }
}
```

Field wajib AC#2 (`id`, `title`, `completed:false`, `priority:"medium"`, `categoryId:"inbox"`, `position:<number>`, `createdAt`, `updatedAt`) semuanya ada.

### 6.2 Bukti AC#4 — persistensi antar restart

```bash
# 1) start pertama
npm run dev             # di terminal A
curl -s -X POST http://localhost:3000/api/tasks -H 'Content-Type: application/json' \
  -d '{"title":"cek persistensi"}'
# -> 201
# 2) hentikan server (Ctrl+C), lalu start lagi
npm run dev             # di terminal A
curl -s "http://localhost:3000/api/tasks?q=cek%20persistensi"
# -> 200, item dengan title "cek persistensi" masih ada
```

### 6.3 Bukti AC#5 — PRAGMA aktif

```bash
sqlite3 data/todoagent.db "PRAGMA journal_mode;"
# wal
sqlite3 data/todoagent.db "PRAGMA foreign_keys;"
# 1
sqlite3 data/todoagent.db "PRAGMA busy_timeout;"
# 5000
sqlite3 data/todoagent.db "PRAGMA synchronous;"
# 1        (NORMAL = 1)
```

### 6.4 Bukti AC#6 — seluruh input lewat Zod

- Setiap body POST divalidasi oleh `createTaskSchema` (`src/features/tasks/model/task.schema.ts`) via `parseOrThrow()`.
- Setiap query string divalidasi oleh `taskListQuerySchema`.
- Kegagalan Zod dikonversi oleh `withErrorHandling()` → **400** dengan `details` berisi `path` + `message`.
- Tidak ada nilai input pengguna yang dirakit langsung menjadi string SQL: seluruh akses DB lewat Drizzle ORM. Untuk `q`, nilai tetap di-bind sebagai parameter (bukan interpolasi), ditambah `escapeLike()` + `ESCAPE '\'` agar `%` / `_` diperlakukan literal.

---

## 7. Catatan Implementasi (Hasil Revisi QA Backend)

- **Race condition create** — `insertTaskAtomically()` di repository membungkus: validasi kategori, cek batas 5.000, hitung `max(position)`, dan insert dalam satu transaksi `IMMEDIATE`. Tidak ada lagi celah `countActiveTasks()` / `getMaxPosition()` di luar transaksi.
- **LIKE escaping** — `INSTR`/`ESCAPE '\'` diterapkan pada klausa `q` (title + description). `description` yang `NULL` di-`coalesce` ke string kosong sehingga tidak "menelan" hasil.
- **Body limit 1 MB** — `readJsonBody()` membaca `request.body` sebagai stream dan membatalkan begitu melampaui batas; bukan sekadar bergantung pada `content-length`.
- **Sort `created` vs `manual`** — `created` mengurutkan `created_at`; `manual` mengurutkan `position`. Cursor dibentuk dari sort key yang sesuai sehingga keyset pagination konsisten.
- **Dead code** — `countTasksByCategory` dihapus; `ensureMigrated()` kini benar-benar dipakai sebagai guard di handler `GET/POST /api/tasks`.
- **ID validasi** — UUID v4 regex disiapkan untuk endpoint `[id]` di tiket lanjutan; VO-2 hanya memakai `randomUUID()` untuk insert.
- **Scope tiket** — `GET/PATCH/DELETE /api/tasks/[id]` ditunda ke tiket lanjutan; tiket VO-2 hanya memiliki `GET/POST /api/tasks` + `GET /api/health`.
- **`next.config.ts`** — `experimental.serverActions.bodySizeLimit` dihapus (tidak berlaku untuk Route Handler); batas ditegakkan di `readJsonBody()`.
