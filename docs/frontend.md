# Frontend todoagent — Dokumentasi Teknis

Dokumen ini menjelaskan arsitektur antarmuka, komponen reusable, kontrak API yang dikonsumsi, penanganan 4 state UI, aksesibilitas, serta cara menjalankan frontend secara lokal.

## 1. Cara Menjalankan Lokal

```bash
# 1. Salin env
cp .env.example .env.local

# 2. Install dependensi
npm install

# 3. Jalankan dev server
npm run dev
# buka http://localhost:3000
```

Perintah lain (wajib lolos sebelum merge):

```bash
npx tsc --noEmit      # cek tipe
npm run lint          # eslint
npm run build         # build produksi
```

### Environment Variables Client

| Variabel | Wajib | Default | Keterangan |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Tidak | *(kosong)* | Base URL request API. Kosong = same-origin. `apiFetch` otomatis memakai `credentials: "same-origin"` bila kosong, `credentials: "include"` bila diisi absolut. |

Konfigurasi dibaca terpusat di `src/shared/config/env.ts` (`getApiBaseUrl()`).

## 2. Arsitektur Frontend (Feature-Based / Screaming Architecture)

```text
src/
├── app/                      # Next.js App Router (route + layout)
│   ├── layout.tsx            # Root layout: font, provider, MainLayout, script anti-FOUC
│   ├── page.tsx              # Halaman utama -> <TasksPage />
│   └── globals.css           # Tailwind + pemetaan @theme inline ke design token
├── features/
│   ├── tasks/                # Fitur utama v0.1
│   │   ├── api/
│   │   │   └── tasks.client.ts     # fetch wrapper /api/tasks (dukung AbortSignal)
│   │   ├── components/
│   │   │   ├── QuickAddInput.tsx   # Input cepat + Enter untuk menambah tugas
│   │   │   ├── TaskItem.tsx        # Baris tugas: checkbox, edit inline, hapus
│   │   │   ├── TaskGroup.tsx       # Grup collapsible "Aktif" / "Selesai"
│   │   │   ├── TaskList.tsx        # Daftar + Empty state (+ autofocus)
│   │   │   ├── TaskListSkeleton.tsx# Loading state daftar
│   │   │   └── TasksPage.tsx       # Komposisi halaman (orchestrator 4 state)
│   │   ├── hooks/
│   │   │   ├── queryKeys.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useCreateTask.ts
│   │   │   ├── useUpdateTask.ts
│   │   │   └── useDeleteTask.ts
│   │   ├── model/
│   │   │   ├── task.types.ts       # Sumber kebenaran type/interface Task & payload
│   │   │   └── task.schema.ts      # Schema Zod (validasi form + parsing respons)
│   │   ├── types/
│   │   │   └── index.ts            # Re-export dari model/task.types.ts (selaras redaksi tiket)
│   │   └── index.ts                # Public API fitur (client-safe, tanpa server/)
│   └── theme/
│       ├── components/ThemeToggle.tsx
│       ├── hooks/useTheme.ts
│       ├── types/theme.types.ts
│       └── index.ts
├── layouts/
│   └── MainLayout.tsx        # Header + konten + placeholder sidebar kategori
├── services/
│   └── http.ts               # Integrasi API global: apiFetch, ApiError, resolveApiUrl
└── shared/
    ├── config/env.ts
    ├── hooks/useDebounce.ts
    ├── lib/cn.ts             # clsx + tailwind-merge
    ├── lib/date.ts           # format due date ("Hari ini", "Besok", "Terlambat")
    ├── providers/            # QueryProvider + AppProviders
    ├── styles/tokens.css     # Design token light & dark
    └── ui/                   # Komponen generik: Button, Input, Checkbox, Toast, Skeleton, Collapsible
```

### Penyelarasan penamaan `model/` vs `types/`

Tiket menyebut folder `types/`, implementasi utama memakai `model/` (karena memuat skema Zod juga). Untuk memenuhi keduanya tanpa duplikasi kode, `src/features/tasks/types/index.ts` hanya **re-export** dari `model/task.types.ts`. Tidak ada definisi tipe baru di `types/`, sehingga tidak ada risiko divergensi. Import resmi untuk fitur tetap lewat `@/features/tasks`.

### Batas Client/Server

- `src/features/tasks/index.ts` **hanya** mengekspor kode client-safe. Tidak ada import ke `src/features/tasks/server/` atau `server.ts`.
- Verifikasi cepat: `grep -rn "@/features/tasks/server" src/features/tasks/{index.ts,api,components,hooks,model,types}` → harus kosong.
- Transport HTTP global ada di `src/services/http.ts` (`apiFetch`, `ApiError`); request spesifik fitur tetap di `src/features/tasks/api/tasks.client.ts`.
- `tasksClient` sengaja mengimpor `model/task.schema.ts` (Zod) untuk memvalidasi respons API sebelum masuk cache TanStack Query — ini **tidak** melanggar batas client/server.

## 3. Komponen Reusable (`src/shared/ui/`)

| Komponen | Deskripsi | Aksesibilitas |
| :--- | :--- | :--- |
| `Button` | Variant `primary \| secondary \| ghost \| danger`, size `sm \| md`. `type="button"` default. | `focus-visible` ring, `disabled` state. |
| `Input` | Input dengan `label` wajib; opsional `hideLabel` dan `error`. | `label htmlFor`, `aria-invalid`, `aria-describedby`, error `role="alert"`. |
| `Checkbox` | Kontrol ARIA (`role="checkbox"`) dengan animasi centang 150–250 ms. Input native disembunyikan dari a11y tree. | `role="checkbox"` + **`aria-checked` eksplisit** (AC7 terpenuhi), `aria-labelledby` ke label, `tabIndex={0}`, toggle via `Space`. |
| `Toast` / `ToastProvider` / `useToast` | Notifikasi auto-dismiss 5 detik. | `role="alert"` + `aria-live="assertive"` untuk error, `role="status"` untuk sukses/info. |
| `Skeleton` | Placeholder loading. | `aria-hidden="true"`. |
| `Collapsible` | Section lipat untuk grup "Aktif"/"Selesai". | `aria-expanded`, `aria-controls`. |

Helper `src/shared/lib/date.ts` `getDueDateInfo()` mengembalikan label berbasis **zona waktu browser**: `Hari ini`, `Besok`, `Terlambat N hari`, nama hari, atau tanggal singkat (`12 Mar`).

## 4. Kontrak API yang Dikonsumsi

| Method | Path | Deskripsi | Respons Sukses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks?status=&categoryId=&due=&q=&sort=&order=&limit=&cursor=` | Daftar tugas | **200** `{ data: { items: Task[], nextCursor: string \| null } }` |
| `POST` | `/api/tasks` | Buat tugas. Body: `{ title, description?, priority?, dueDate?, categoryId? }` | **201** `{ data: Task }` |
| `PATCH` | `/api/tasks/:id` | Update parsial | **200** `{ data: Task }` |
| `DELETE` | `/api/tasks/:id` | Soft delete | **204** (tanpa body) |

Error selalu berformat `{ error: { code, message, details? } }` dan `message`-nya **wajib** ditampilkan di toast saat request gagal (lihat §5).

### 4.1 Nilai `sort` yang Diterima Backend

| Nilai | Arti |
| :--- | :--- |
| `created` | Urut `created_at`. |
| `due` | Urut `due_date`. |
| `priority` | Bobot prioritas (high→low). |
| `manual` | Urut `position` (dipakai `TasksPage`). |

Tidak boleh menambah nilai di luar daftar ini — backend menolak dengan 400 `VALIDATION_ERROR`. `TaskListSort` di `src/features/tasks/model/task.types.ts` adalah *single source of truth*.

## 5. Optimistic Update & Rollback

Pola TanStack Query v5 di semua hook mutasi:

1. `onMutate`: `cancelQueries`, snapshot semua cache `tasks`, terapkan perubahan optimistis.
2. `onError`: rollback snapshot + toast berisi `error.message` server.
3. `onSettled`: `invalidateQueries({ queryKey: tasksKeys.lists() })`.

Detail:
- **`useCreateTask`**: item optimistis diberi `position: -Date.now()` (**penanda lokal saja**; server tidak pernah menerima field `position` — server menetapkan `max(position) + POSITION_STEP`).
- **`useUpdateTask`**: merge parsial per-field; `completedAt` diperbarui saat `completed` berubah.
- **`useDeleteTask`**: filter dari cache; `onSuccess` memunculkan toast sukses.

### Guard double-submit / double-commit / double-toggle

- `QuickAddInput`: `submittingRef` (sinkron) + `createTask.isPending`. `onError` memulihkan teks judul yang gagal (hanya bila input masih kosong).
- `TaskItem`: `committingRef` memisahkan Enter vs blur; `Esc` tidak commit. `togglingRef` + `isUpdatingThis` (per id) mencegah spam toggle.

## 6. Empat State UI Wajib

| State | Perilaku |
| :--- | :--- |
| **Loading** | `<TaskListSkeleton rows={4} />` — 4 baris skeleton (bukan spinner layar penuh). |
| **Empty** | Ilustrasi + teks ramah + tombol "Tambah tugas sekarang"; `useEffect` memfokuskan `QuickAddInput` saat daftar bertransisi kosong. |
| **Error** | Pesan `query.error.message` dari server + tombol "Coba lagi" → `query.refetch()`. |
| **Success** | Grup **Aktif** (terbuka) & **Selesai** (collapsible). |

## 7. Tema & Anti-FOUC

- Preferensi disimpan di `localStorage` dengan key **`todoagent-theme`** (`light | dark | system`).
- **Inline script anti-FOUC** (`themeInitScript` di `src/app/layout.tsx`) hanya menetapkan class `dark`/`reduce-motion` **sekali** sebelum paint, sesuai `localStorage` + `prefers-color-scheme`/`prefers-reduced-motion`.
- **Pembagian listener (perbaikan QA):** inline script **tidak** mendaftarkan `matchMedia` listener. Semua listener runtime (tema OS, reduced-motion, storage lintas tab, custom event `todoagent:theme-change`) didaftarkan **hanya** oleh `useTheme()` dan dibersihkan pada cleanup. Tidak ada risiko listener duplikat/leak saat HMR.
- Design token di `src/shared/styles/tokens.css` (light & dark) dipetakan ke util Tailwind v4 via `@theme inline` di `src/app/globals.css`.
- `prefers-reduced-motion: reduce` menetralkan seluruh durasi transisi (`--dur-*`) dan animasi melalui class `reduce-motion` di `<html>`.

## 8. Aksesibilitas (WCAG 2.1 AA)

- Setiap kontrol memiliki `label` atau `aria-label`.
- **Checkbox (AC7)**: dirender sebagai `role="checkbox"` dengan **`aria-checked` eksplisit**, `aria-labelledby` menunjuk label yang selalu dirender (`sr-only` saat `hideLabel`), nama aksesibel dijamin. Keyboard: `Space` toggle, `Tab` fokus.
- **Status prioritas**: satu elemen `aria-label` ("Prioritas sedang") + teks visual (`Sedang`) yang ditandai `aria-hidden`, sehingga screen reader hanya membaca keterangan lengkap satu kali.
- Fokus ring selalu tampil (`:focus-visible` global). Ikon dekoratif `aria-hidden="true"`.
- `ThemeToggle` memakai `role="radiogroup"` + `aria-checked` per tombol.
- Navigasi keyboard: `Tab` antar kontrol, `Enter` simpan edit / tambah tugas, `Esc` batal edit, `Space` toggle checkbox.

## 9. Responsivitas

- Mobile-first: satu kolom, `max-w-3xl`, `px-4` (mobile) → `md:px-6` (tablet/desktop).
- Breakpoint target: **360 / 768 / 1024 / 1440 px** tanpa horizontal scroll (baris meta memakai `flex-wrap`, judul `min-w-0 truncate`, tombol aksi `shrink-0`).
- Sidebar kategori (`lg:block`) dan sheet detail **masih placeholder** sesuai tiket v0.2.

## 10. Alur Interaksi Pengguna

1. Buka halaman → kursor otomatis di `QuickAddInput` (autofocus).
2. Ketik judul → `Enter`/klik Tambah → item muncul instan (optimistic) di "Aktif". Input dikosongkan dan tetap fokus.
3. Klik checkbox → item berpindah ke grup "Selesai" (collapsible).
4. Klik judul → edit inline. `Enter` simpan, `Esc` batal, blur simpan.
5. Klik ikon hapus → konfirmasi native → soft delete → toast sukses.
6. Request gagal → rollback + toast `error.message` server (POST gagal memulihkan teks input).
7. Tombol tema: Terang / Gelap / Sistem, persist tanpa FOUC.

Panduan pengguna akhir: **`docs/user-guide.md`**.
Skenario uji QA: **`docs/qa/vo-3-test-scenarios.md`**.

## 11. Verifikasi Build & Uji Manual

```bash
$ npx tsc --noEmit   # 0 error
$ npm run lint       # 0 error / 0 warning
$ npm run build      # sukses
```

### Bukti uji manual a11y & responsivitas

| Area | Langkah | Hasil |
| :--- | :--- | :--- |
| Keyboard penuh | Tab dari header tema → input → semua kontrol task → kembali | Urutan fokus logis; ring fokus selalu terlihat; tidak ada "focus trap". |
| Checkbox Space/Enter | Fokus ke checkbox → `Space` | Status toggle; `aria-checked` berubah true/false (terverifikasi via aksesibilitas inspector). |
| Screen reader (VoiceOver) | Baca item tugas | Terbaca: "Tandai 'Belanja mingguan' sebagai selesai, checkbox, tidak dicentang"; prioritas terbaca sekali ("Prioritas sedang"). |
| Responsif 360 px | DevTools responsive 360×800 | Tanpa horizontal scroll; tombol hapus tetap ≥24 px. |
| Responsif 768 px | DevTools 768×1024 | Layout satu kolom lebar, tanpa overflow. |
| Responsif 1440 px | DevTools 1440×900 | Placeholder sidebar kiri muncul; konten utama proporsional. |
| Anti-FOUC | Dark aktif → hard refresh | Tidak ada kilatan terang; `<html class="dark">` pada frame pertama. |
| Listener tidak duplikat | React DevTools → Profiler, buka/tutup ThemeToggle berkali-kali + HMR | Jumlah listener `matchMedia` stabil (hanya milik `useTheme`), tidak bertambah. |
