# Dokumentasi API — To Do List AI Agent

- **Base URL (lokal):** `http://localhost:3000`
- **Format:** JSON (`Content-Type: application/json`)
- **Autentikasi:** belum ada (single user). Endpoint bersifat publik di lingkungan lokal.
- **Envelope sukses:** `{ "data": <payload> }`
- **Envelope error:** `{ "error": { "code": "...", "message": "...", "details": [{ "path": "...", "message": "..." }] } }`

## Daftar Endpoint

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/tasks` | Daftar tugas + filter, pencarian `q`, sorting, pagination cursor |
| POST | `/api/tasks` | Membuat tugas baru |
| GET | `/api/tasks/{id}` | Detail satu tugas |
| PATCH | `/api/tasks/{id}` | Memperbarui sebagian field tugas |
| DELETE | `/api/tasks/{id}` | Soft delete tugas (`204 No Content`) |

---

## 1. `GET /api/tasks`

Mengembalikan daftar tugas aktif (`deleted_at IS NULL`) beserta filter dan pencarian.

### Headers

| Header | Wajib | Nilai |
| --- | --- | --- |
| `Accept` | tidak | `application/json` |

### Query Parameters

| Param | Tipe | Default | Aturan validasi |
| --- | --- | --- | --- |
| `q` | string | – (tanpa filter) | di-`trim`, **maksimal 200 karakter**; kosong/whitespace = tanpa filter; **hanya wildcard** (`%`, `_`, `\`) = tanpa filter; `> 200` → `400 VALIDATION_ERROR` (`details[].path = "q"`) |
| `status` | enum | `all` | `all` \| `active` \| `completed` |
| `categoryId` | string | – | `trim`, maksimal 100 karakter, kosong = tanpa filter |
| `due` | enum | – | `today` \| `overdue` |
| `sort` | enum | `created` | `created` \| `due` \| `priority` \| `manual` |
| `order` | enum | `desc` (`asc` bila `sort=manual`) | `asc` \| `desc` |
| `limit` | integer | `20` | `1..100` |
| `cursor` | string | – | opaque, ambil dari `data.nextCursor` pada response sebelumnya |

### Semantik pencarian `q`

1. **Cakupan kolom:** `title` **dan** `coalesce(description, '')`.
2. **Case-insensitive:** query memakai `lower(kolom) LIKE lower(pattern)`.
3. **Escape wildcard:** karakter `\`, `%`, dan `_` pada input user di-escape lebih dulu, lalu query memakai `... LIKE ? ESCAPE '\'`. Artinya `q=100%` hanya mencocokkan teks literal `100%` dan `q=a_b` hanya mencocokkan `a_b` (bukan `axb`).
4. **Relevansi (urutan hasil):**
   - grup `0` — `title` cocok di posisi awal (prefix),
   - grup `1` — `title` cocok di tengah/akhir (substring),
   - grup `2` — hanya `description` yang cocok.
   Di dalam grup yang sama, urutan mengikuti `sort` + `order` yang diminta, lalu `id ASC` sebagai tie-break agar pagination deterministik.
5. **Tanpa filter:** `q` tidak dikirim, `q=` (kosong), `q=   ` (spasi), atau `q=%` / `q=%%` / `q=\` → tidak memfilter apa pun (setara `GET /api/tasks` tanpa `q`), dan **tidak** menghasilkan error.
6. **Keamanan query:** seluruh nilai (`q`, `status`, `categoryId`, `due`, `limit`, `offset`) dikirim sebagai named parameter binding; tidak ada string SQL yang dirakit dari input user.

### Response Success `200`

```json
{
  "data": {
    "items": [
      {
        "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
        "title": "Belanja bulanan",
        "description": "Beli beras, telur, dan sayur",
        "status": "active",
        "priority": "high",
        "categoryId": "rumah",
        "dueDate": "2025-02-01",
        "position": 1,
        "createdAt": "2025-01-20T09:00:00.000Z",
        "updatedAt": "2025-01-20T09:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

Bila masih ada halaman berikutnya, `nextCursor` berisi string opaque. Kirim ulang sebagai `cursor` pada request berikutnya. Bentuk objek `Task` **tidak berubah** oleh fitur pencarian ini.

### Contoh 1 — match pada judul

```http
GET /api/tasks?q=belanja&limit=20
```

```json
{
  "data": {
    "items": [
      {
        "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
        "title": "Belanja bulanan",
        "description": "Beli beras, telur, dan sayur",
        "status": "active",
        "priority": "high",
        "categoryId": "rumah",
        "dueDate": "2025-02-01",
        "position": 1,
        "createdAt": "2025-01-20T09:00:00.000Z",
        "updatedAt": "2025-01-20T09:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

`q=Belanja`, `q=BELANJA`, dan `q=belanja` menghasilkan himpunan yang sama (case-insensitive), dan yang prefix-match selalu berada di atas.

### Contoh 2 — match pada deskripsi

```http
GET /api/tasks?q=belanja&sort=created&order=desc
```

```json
{
  "data": {
    "items": [
      {
        "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
        "title": "Belanja bulanan",
        "description": "Beli beras, telur, dan sayur",
        "status": "active",
        "priority": "high",
        "categoryId": "rumah",
        "dueDate": "2025-02-01",
        "position": 1,
        "createdAt": "2025-01-20T09:00:00.000Z",
        "updatedAt": "2025-01-20T09:00:00.000Z"
      },
      {
        "id": "2c7d9e10-5b6f-4a3c-8d1e-77aa55bb33cc",
        "title": "Bayar tagihan listrik",
        "description": "Cek juga pengeluaran belanja dapur",
        "status": "active",
        "priority": "medium",
        "categoryId": "rumah",
        "dueDate": "2025-01-28",
        "position": 3,
        "createdAt": "2025-01-18T10:30:00.000Z",
        "updatedAt": "2025-01-18T10:30:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

Tugas dengan `title` yang cocok (grup 0) berada di atas tugas yang hanya cocok di `description` (grup 2), meskipun `sort=created&order=desc` akan menempatkan tugas kedua lebih dulu bila tanpa pencarian.

### Contoh 3 — tidak ada hasil

```http
GET /api/tasks?q=zzz-tidak-ada
```

```json
{
  "data": {
    "items": [],
    "nextCursor": null
  }
}
```

### Contoh 4 — `q` kosong / whitespace (tanpa filter)

```http
GET /api/tasks?q=&status=all&limit=2
```

```json
{
  "data": {
    "items": [
      {
        "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
        "title": "Belanja bulanan",
        "description": "Beli beras, telur, dan sayur",
        "status": "active",
        "priority": "high",
        "categoryId": "rumah",
        "dueDate": "2025-02-01",
        "position": 1,
        "createdAt": "2025-01-20T09:00:00.000Z",
        "updatedAt": "2025-01-20T09:00:00.000Z"
      },
      {
        "id": "2c7d9e10-5b6f-4a3c-8d1e-77aa55bb33cc",
        "title": "Bayar tagihan listrik",
        "description": "Cek juga pengeluaran belanja dapur",
        "status": "active",
        "priority": "medium",
        "categoryId": "rumah",
        "dueDate": "2025-01-28",
        "position": 3,
        "createdAt": "2025-01-18T10:30:00.000Z",
        "updatedAt": "2025-01-18T10:30:00.000Z"
      }
    ],
    "nextCursor": "eyJ2IjoxLCJvIjoyfQ"
  }
}
```

Perilaku sama untuk `q=   ` (spasi), `q=%`, `q=%%%`, dan `q=\`.

### Contoh 5 — `q` lebih dari 200 karakter

```http
GET /api/tasks?q=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validasi request gagal",
    "details": [
      {
        "path": "q",
        "message": "q maksimal 200 karakter"
      }
    ]
  }
}
```

Status: `400`. Tidak pernah `500`.

### Contoh 6 — `cursor` tidak valid

```http
GET /api/tasks?cursor=not-a-cursor
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validasi request gagal",
    "details": [
      {
        "path": "cursor",
        "message": "cursor tidak valid"
      }
    ]
  }
}
```

Status: `400`.

---

## 2. `POST /api/tasks`

### Request Body

| Field | Tipe | Wajib | Aturan |
| --- | --- | --- | --- |
| `title` | string | ya | `trim`, 1..200 karakter |
| `description` | string \| null | tidak | maksimal 2000 karakter, string kosong → `null` |
| `status` | enum | tidak | `active` \| `completed`, default `active` |
| `priority` | enum | tidak | `low` \| `medium` \| `high`, default `medium` |
| `categoryId` | string \| null | tidak | maksimal 100 karakter |
| `dueDate` | string \| null | tidak | ISO date/datetime, mis. `2025-02-01` |

```json
{
  "title": "Belanja bulanan",
  "description": "Beli beras, telur, dan sayur",
  "priority": "high",
  "categoryId": "rumah",
  "dueDate": "2025-02-01"
}
```

### Response `201`

```json
{
  "data": {
    "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
    "title": "Belanja bulanan",
    "description": "Beli beras, telur, dan sayur",
    "status": "active",
    "priority": "high",
    "categoryId": "rumah",
    "dueDate": "2025-02-01",
    "position": 1,
    "createdAt": "2025-01-20T09:00:00.000Z",
    "updatedAt": "2025-01-20T09:00:00.000Z"
  }
}
```

### Response Error

- `400 VALIDATION_ERROR` — `title` kosong/terlalu panjang, enum tidak valid, `dueDate` bukan tanggal valid, body bukan JSON.

---

## 3. `GET /api/tasks/{id}`

### Response `200`

```json
{
  "data": {
    "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
    "title": "Belanja bulanan",
    "description": "Beli beras, telur, dan sayur",
    "status": "active",
    "priority": "high",
    "categoryId": "rumah",
    "dueDate": "2025-02-01",
    "position": 1,
    "createdAt": "2025-01-20T09:00:00.000Z",
    "updatedAt": "2025-01-20T09:00:00.000Z"
  }
}
```

### Response Error

- `400 VALIDATION_ERROR` — format `id` tidak valid.
- `404 NOT_FOUND` — tugas tidak ada atau sudah dihapus.

---

## 4. `PATCH /api/tasks/{id}`

Body boleh berisi sebagian field: `title`, `description`, `status`, `priority`, `categoryId`, `dueDate`. Minimal satu field harus dikirim.

```json
{
  "status": "completed"
}
```

### Response `200`

```json
{
  "data": {
    "id": "8f2b6c1e-3a4d-4f5b-9c7d-1a2b3c4d5e6f",
    "title": "Belanja bulanan",
    "description": "Beli beras, telur, dan sayur",
    "status": "completed",
    "priority": "high",
    "categoryId": "rumah",
    "dueDate": "2025-02-01",
    "position": 1,
    "createdAt": "2025-01-20T09:00:00.000Z",
    "updatedAt": "2025-01-21T08:15:00.000Z"
  }
}
```

### Response Error

- `400 VALIDATION_ERROR` — tidak ada field yang dikirim / nilai tidak valid.
- `404 NOT_FOUND` — tugas tidak ada atau sudah dihapus.

---

## 5. `DELETE /api/tasks/{id}`

Soft delete (`deleted_at` diisi).

### Response `204 No Content`

Tanpa body.

### Response Error

- `400 VALIDATION_ERROR` — format `id` tidak valid.
- `404 NOT_FOUND` — tugas tidak ada atau sudah dihapus.

---

## Kode Error

| HTTP | `error.code` | Kapan muncul |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Input tidak valid (termasuk `q` > 200 karakter dan `cursor` rusak) |
| `404` | `NOT_FOUND` | Tugas tidak ditemukan |
| `500` | `INTERNAL_ERROR` | Kesalahan tak terduga di server (tanpa stack trace) |

---

## Test Case Pencarian (untuk QA Backend)

Prasyarat data uji (seed):

| ID | `title` | `description` | `status` |
| --- | --- | --- | --- |
| T1 | `Belanja bulanan` | `Beli beras, telur, dan sayur` | `active` |
| T2 | `Bayar tagihan listrik` | `Cek juga pengeluaran belanja dapur` | `active` |
| T3 | `Diskon 100% di toko` | `Gunakan kupon` | `active` |
| T4 | `Diskon 1000 di toko` | `Tanpa kupon` | `completed` |
| T5 | `Cek a_b testing` | `underscore literal` | `active` |
| T6 | `Cek axb testing` | `bukan underscore` | `active` |
| T7 | `Rapat tim` | `Tidak ada kata kunci` | `completed` |

| # | Jenis | Request | Ekspektasi |
| --- | --- | --- | --- |
| 1 | Positif (judul) | `GET /api/tasks?q=belanja` | `200`; T1 ada; `title` cocok prefix → posisi pertama |
| 2 | Positif (deskripsi) | `GET /api/tasks?q=belanja` | `200`; T2 ikut tampil (cocok di `description`) dan berada setelah T1 |
| 3 | Positif (case-insensitive) | `GET /api/tasks?q=BELANJA` | `200`; himpunan hasil identik dengan #1 (T1 + T2) |
| 4 | Positif (escape `%`) | `GET /api/tasks?q=100%25` (`q=100%`) | `200`; hanya T3. T4 (`1000`) **tidak** muncul |
| 5 | Positif (escape `_`) | `GET /api/tasks?q=a_b` | `200`; hanya T5. T6 (`axb`) **tidak** muncul |
| 6 | Positif (escape `\`) | `GET /api/tasks?q=a\%5Cb` (`q=a\b`) | `200`; `{ items: [], nextCursor: null }` (tidak error, tidak match-all) |
| 7 | Negatif (tidak ada hasil) | `GET /api/tasks?q=zzz-tidak-ada` | `200`; `{ "items": [], "nextCursor": null }` |
| 8 | Edge (`q` kosong) | `GET /api/tasks?q=` | `200`; tanpa filter, identik dengan `GET /api/tasks` |
| 9 | Edge (`q` whitespace) | `GET /api/tasks?q=%20%20%20` | `200`; tanpa filter |
| 10 | Edge (`q` hanya wildcard) | `GET /api/tasks?q=%25` dan `?q=%25%25%25` | `200`; tanpa filter (bukan `LIKE '%%'` yang membocorkan wildcard), tidak error |
| 11 | Negatif (validasi) | `GET /api/tasks?q=<201 karakter>` | `400 VALIDATION_ERROR`, `details[0].path = "q"`; bukan `500` |
| 12 | Kombinasi filter | `GET /api/tasks?q=belanja&status=active&categoryId=rumah&sort=due&order=asc&limit=1` | `200`; hanya 1 item, `nextCursor` tidak `null`; filter status/kategori/due/sort tetap berlaku di dalam grup relevansi |
| 13 | Pagination | `GET /api/tasks?q=belanja&limit=1` lalu `GET /api/tasks?q=belanja&limit=1&cursor=<nextCursor>` | Halaman 2 melanjutkan hasil tanpa duplikasi; `nextCursor` terakhir `null` |
| 14 | Regresi (tanpa `q`) | `GET /api/tasks?limit=20` | `200`; urutan/limit tetap seperti sebelum fitur pencarian |

Catatan pengujian: `sort` + `order` hanya menentukan urutan **di dalam** grup relevansi. Bila `q` tidak dikirim, grup relevansi konstan (`0`) sehingga urutan murni mengikuti `sort`/`order` (tanpa regresi).

---

## Setup Database & Panduan Migrasi

### Environment Variables

| Variabel | Wajib | Default | Deskripsi |
| --- | --- | --- | --- |
| `DATABASE_PATH` | tidak | `data/app.db` | Lokasi file SQLite. Relatif terhadap root project atau absolut. Gunakan `:memory:` untuk pengujian in-memory. |

Salin `.env.example` menjadi `.env.local` lalu sesuaikan bila perlu:

```bash
cp .env.example .env.local
```

### Migrasi

Skema diterapkan **otomatis dan idempotent** saat koneksi database pertama kali dibuat (`src/config/database.ts`, `CREATE TABLE IF NOT EXISTS ...`), sehingga tidak ada perintah migrasi manual yang bisa terlewat saat deploy. SQL yang dijalankan:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category_id TEXT,
  due_date TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks (category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks (position);
```

- **Perubahan skema pada tiket pencarian ini: TIDAK ADA.** Pencarian memakai kolom `title` dan `description` yang sudah tersedia, sehingga tidak ada downtime/backfill yang dibutuhkan.
- Pencarian memakai `LIKE '%...%'` yang tidak dapat memanfaatkan B-tree index; untuk jumlah data saat ini masih sangat cepat. Bila data tumbuh besar, opsi lanjutan adalah SQLite FTS5 (butuh migrasi tabel virtual baru).
- Direktori `data/` dibuat otomatis. Disarankan menambahkan `data/` ke `.gitignore` agar file database lokal tidak ikut ter-commit.
