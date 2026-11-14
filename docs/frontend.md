# Dokumentasi Frontend — Pencarian Tugas (VO-9)

Aplikasi dibangun dengan **Next.js App Router** + **Feature-Based Architecture (Screaming Architecture)**. Seluruh kode aplikasi berada di `src/`, dan path alias `@/*` menunjuk ke `src/*`.

> Tiket: **VO-9** — UI pencarian tugas (debounce, empty/error state) terhubung ke `GET /api/tasks?q=`.

## 1. Struktur Modul

```text
src/
├── app/
│   ├── globals.css               # Style global (tanpa overflow-x: hidden)
│   ├── layout.tsx                # Layout root (metadata, lang=id)
│   └── page.tsx                  # Halaman utama: TaskSearchInput + TaskList
├── components/                   # (Belum ada) Komponen UI global reusable
├── config/                       # (Belum ada) Konfigurasi aplikasi
├── context/                      # (Belum ada) Global state
├── features/
│   └── tasks/
│       ├── api/
│       │   ├── listTasks.ts        # buildQueryString() + listTasks()
│       │   └── listTasks.test.ts   # Unit test serialisasi query string
│       ├── components/
│       │   ├── TaskSearchInput.tsx
│       │   └── TaskList.tsx
│       ├── hooks/
│       │   └── useTaskSearch.ts    # Debounce + AbortController + retry
│       ├── types/
│       │   └── task.ts             # Task, TaskListQuery, TaskListResult
│       └── index.ts                # Public API fitur (barrel export)
├── hooks/
│   └── useDebouncedValue.ts        # Hook debounce generik
├── layouts/                      # (Belum ada) Layout halaman lain
├── routes/                       # (Belum ada) Konfigurasi routing
├── services/
│   └── http.ts                   # Fetch wrapper global + ApiError + timeout
└── utils/
    ├── debounce.ts               # Helper debounce murni (testable)
    └── debounce.test.ts
```

Root `app/` **sudah dihapus**; jangan membuat ulang agar Next.js tidak mendeteksi dua App Router root.

## 2. Daftar Komponen & Hook

### `TaskSearchInput`

| Prop | Tipe | Wajib | Default | Keterangan |
|---|---|---|---|---|
| `value` | `string` | ✅ | — | Nilai input (controlled). |
| `onChange` | `(value: string) => void` | ✅ | — | Dipanggil tiap ketikan. |
| `onClear` | `() => void` | ❌ | — | Handler tombol clear (×). |
| `errorMessage` | `string \| null` | ❌ | `null` | Pesan validasi inline di bawah input (dari `validationError?.message`). |
| `maxLength` | `number` | ❌ | `200` | Batas panjang karakter input **dan** angka yang ditampilkan di counter. Sesuai kontrak komponen. |
| `placeholder` | `string` | ❌ | `"Cari tugas berdasarkan judul atau deskripsi…"` | — |
| `disabled` | `boolean` | ❌ | `false` | — |

Aksesibilitas:
- `type="search"`, `<label htmlFor>` eksplisit, `aria-label` pada tombol clear.
- `aria-invalid` + `aria-describedby` (error + hint) saat error.
- Counter karakter dihitung dari nilai **mentah** (selaras dengan `maxLength` browser).
- **Strategi pengumuman error (dipilih sadar):**
  - Error pada **input** memakai `aria-live="polite"` (bukan `role="alert"`), karena pesan berubah cepat saat mengetik dan `alert` bersifat menginterupsi.
  - Error pada **daftar hasil** (`TaskList`) memakai `role="alert"` karena kejadiannya diskret (sekali per kegagalan request) dan butuh perhatian segera.
- **AC5 vs `maxLength={200}`:** `maxLength={200}` memenuhi spesifikasi komponen sekaligus memenuhi AC5 di level browser (pengguna tidak bisa mengetik melewati 200 karakter). Pesan inline dari backend (`400 VALIDATION_ERROR`, `details[].path = "q"`) tetap ditampilkan lewat `errorMessage` bila backend menolak keyword panjang yang masuk dari sumber lain (URL/prefill/back-forward).

### `TaskList`

| Prop | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `items` | `Task[]` | ✅ | Daftar tugas dari API. |
| `isLoading` | `boolean` | ✅ | Trigger skeleton (hanya saat belum pernah ada data sukses). |
| `isFetching` | `boolean` | ❌ | Menampilkan "Memperbarui hasil…" saat refetch. |
| `error` | `ApiError \| Error \| null` | ✅ | Jika ada, render error state + retry. **Diprioritaskan di atas `isLoading` & `items`** — data basi tidak dirender saat error. |
| `hasQuery` | `boolean` | ✅ | Membedakan empty "belum ada tugas" vs "tidak ada hasil untuk «keyword»". |
| `keyword` | `string` | ❌ | Ditampilkan di empty state hasil pencarian. |
| `onRetry` | `() => void` | ✅ | Handler tombol "Coba lagi" (memicu request ulang). |
| `onClearSearch` | `() => void` | ❌ | Handler tombol "Hapus pencarian". |

### `useTaskSearch`

```ts
const { data, isLoading, isFetching, error, validationError, retry } =
  useTaskSearch({ keyword, status: "all", sort: "created", order: "desc", limit: 50 });
```

- **Debounce 300 ms** (`SEARCH_DEBOUNCE_MS`): mengetik `a→ab→abc` < 300 ms menghasilkan **satu** request (`abc`).
- **AbortController + requestIdRef**: request lama di-abort saat keyword berubah; response lama tidak menimpa state baru (anti-race).
- **Satu effect = satu request.** **Tidak ada** fallback/retry implisit. Bila backend menolak parameter yang menurut kontrak valid (`status=all`), itu bug backend dan muncul sebagai error — tidak disamarkan oleh request kedua.
- `data` **tidak** dimasukkan ke dependency array `useEffect` (mencegah loop). Penanda "pernah sukses" disimpan di `hasFetchedRef`; hanya `ref` ini yang dipakai.
- **`isLoading`** `true` hanya sebelum ada response sukses. **`isFetching`** `true` selama request berjalan.
- **Keyword hanya whitespace** → `q` tidak dikirim.
- **Keyword ter-trim > 200 karakter** (`MAX_KEYWORD_LENGTH`) → request **tidak dikirim**; `validationError = { message: "Maksimal 200 karakter", details: [{ path: "q", … }] }` ditampilkan inline pada input.
- Error `VALIDATION_ERROR` bukan pada `q` → ditampilkan sebagai error biasa beserta detail (`path: message`).
- `retry()` memicu ulang request tanpa menghapus input user.

### `useDebouncedValue<T>(value, delay)`

Hook generik di `src/hooks/`, menunda propagasi nilai. Diekspor ulang lewat `@/features/tasks` bila perlu.

### `src/utils/debounce.ts`

`debounce(fn, delay)` murni (tanpa React) dengan `cancel()` dan `flush()`, diuji di `src/utils/debounce.test.ts`.

### `src/services/http.ts`

- Base URL dari `process.env.NEXT_PUBLIC_API_BASE_URL`; fallback same-origin.
- `fetch(..., { cache: "no-store" })`.
- **Timeout default 15000 ms** (`DEFAULT_TIMEOUT_MS`).
- **Prioritas abort deterministik:** abort dari pemanggil selalu menang. Listener user abort didaftarkan sebelum timer dan membersihkan timer; `didTimeout()` mengembalikan `false` bila user abort terjadi. Abort pemanggil diteruskan sebagai `AbortError` apa adanya; hanya timeout murni yang di-map ke `ApiError("TIMEOUT", …, 0)`.
- Parsing envelope `{ data }` / `{ error: { code, message, details } }`.
- Melempar `ApiError` (`code`, `message`, `status`, `details`) atau `ApiError("NETWORK_ERROR", …, 0)` saat gagal jaringan.

## 3. Empat State UI

| State | Pemicu | Tampilan |
|---|---|---|
| **Loading** | `isLoading === true` | 3 skeleton `animate-pulse` + `aria-busy` + `sr-only` "Memuat daftar tugas…". |
| **Empty (tanpa pencarian)** | `items.length === 0 && !hasQuery` | "Belum ada tugas." |
| **Empty (hasil pencarian)** | `items.length === 0 && hasQuery` | "Tidak ada hasil untuk «keyword»." + tombol **Hapus pencarian**. |
| **Error** | `error !== null` (diprioritaskan) | `error.message` + tombol **Coba lagi** → `retry()`. Input user tidak dihapus. |
| **Success** | `items.length > 0` | Kartu tugas (judul, badge status, deskripsi, prioritas, tenggat). Saat `isFetching` muncul "Memperbarui hasil…". |

## 4. Kontrak API yang Dipakai

```http
GET /api/tasks?cursor=<opaque>&limit=50&order=desc&q=belanja&sort=created&status=all
```

| Param | Nilai di UI | Catatan |
|---|---|---|
| `q` | keyword ter-trim | **Dibuang** bila kosong/hanya spasi. Di-encode otomatis oleh `URLSearchParams` (tepat sekali). |
| `status` | `"all"` | Dikirim sesuai kontrak literal VO-6. Tidak ada fallback. |
| `sort` | `"created"` | Fixed di halaman utama. |
| `order` | `"desc"` | Fixed di halaman utama. |
| `limit` | `50` | Pagination cursor belum di-UI. |
| `cursor` | — | Disiapkan untuk tombol "muat lagi". |

Urutan parameter di-`sort()` deterministik (mudah diverifikasi di DevTools Network). Tidak ada parameter kosong/null yang dikirim.

| Input pengguna | Query string |
|---|---|
| `belanja` | `q=belanja` |
| `100%` | `q=100%25` |
| `belanja mingguan` | `q=belanja+mingguan` |
| `   ` (spasi) | tanpa `q` |

Response sukses: `{ "data": { "items": Task[], "nextCursor": null } }`
Response error: `{ "error": { "code", "message", "details"?: [{ "path", "message" }] } }`

`details[].path === "q"` → pesan inline pada input (bukan toast generik).

## 5. Variabel Lingkungan

`.env.example` (di-commit) dan `.env.local` (tidak di-commit; `.env*` sudah di-ignore):

```bash
# Base URL API backend. Kosong = same-origin.
NEXT_PUBLIC_API_BASE_URL=
```

Hanya `NEXT_PUBLIC_*` yang aman dibaca di browser. Jangan menaruh secret di sini.

## 6. Menjalankan Lokal & Verifikasi

```bash
npm install
cp .env.example .env.local    # opsional, isi bila backend di host lain
npm run dev                   # http://localhost:3000

# Verifikasi kualitas (harus hijau):
npm run lint
npm run typecheck             # tsc --noEmit
npm test                      # unit test debounce + buildQueryString
npm run build
# atau semuanya sekaligus:
npm run verify
```

`npm test` menggunakan daftar file eksplisit (portable di shell POSIX tanpa `globstar` dan di CI/Docker), dijalankan dengan `tsx --test`.

### Alur interaksi

1. Pengguna mengetik di `TaskSearchInput`.
2. `page.tsx` menyimpan `keyword` dan menulis `?q=` ke URL via `router.replace` agar shareable/bookmarkable.
3. `useTaskSearch` menunggu 300 ms, lalu memanggil `listTasks()`.
4. Request lama di-`abort` saat keyword berubah; hasil lama tidak menimpa tampilan baru.
5. `TaskList` me-render Success / Empty / Error.

**Sinkronisasi URL ↔ input (anti-race):** `isEditingRef` mencegah effect URL→state menimpa ketikan aktif saat `router.replace` berjalan. Dependency effect memakai `searchParams.toString()` (string stabil) sehingga tidak memicu `replace` berulang.

## 7. Responsivitas

- Mobile-first ≤ 375 px: input `w-full`, semua wrapper `min-w-0`, teks panjang `break-words`/`break-all`, flex `flex-wrap`.
- Desktop ≥ 1280 px: `section` pencarian `lg:flex-row`, input `lg:flex-1`, slot kontrol filter `lg:w-64` disiapkan untuk tiket berikutnya.
- `overflow-x: hidden` global **tidak** dipakai; anti-overflow ditangani di level komponen.

## 8. Catatan AC6 (kontrol filter di desktop)

Nilai filter masih fixed (`status=all`, `sort=created`, `order=desc`) karena tiket UI filter belum ada. Layout sudah menyediakan slot sejajar sehingga penambahan kontrol filter tidak memerlukan perubahan struktural. Verifikasi AC6 pada tiket ini: tidak ada overflow horizontal pada 375 px dan 1280 px, kontrol dapat dioperasikan.

## 9. Catatan Migrasi `app/` → `src/app/`

Root `app/` sudah dihapus dan digantikan `src/app/`. Jalankan `npm run build` untuk memastikan hanya satu App Router root terdeteksi.
