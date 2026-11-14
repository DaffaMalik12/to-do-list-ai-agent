# QA Frontend — Test Scenarios VO-3 (Tasks v0.1)

Skenario uji QA Frontend untuk tiket VO-3. Semua item diuji manual pada browser desktop & mobile (Chrome 120+, Firefox 121+, Safari 17+).

## 1. Skenario Positif (Happy Path)

| # | Langkah | Hasil yang Diharapkan |
| :-- | :--- | :--- |
| P1 | Buka `http://localhost:3000` | Kursor otomatis di `QuickAddInput`. |
| P2 | Ketik "Belanja mingguan" lalu `Enter` | Item muncul instan di grup **Aktif** (optimistic). Input kosong, fokus tetap. |
| P3 | Refresh halaman | Tugas tetap tampil (persistensi server). |
| P4 | Klik checkbox / fokus + `Space` | Item pindah ke grup **Selesai** (collapsible), judul bercoret. `aria-checked` menjadi `true`. |
| P5 | Klik judul tugas | Mode edit inline aktif, teks tersorot. |
| P6 | Ubah judul → `Enter` | Judul tersimpan, input edit tertutup. |
| P7 | Klik ikon hapus → konfirmasi | Item hilang, toast sukses "Tugas dihapus." muncul. |
| P8 | Klik tombol tema "Gelap" | Seluruh halaman gelap instan. |
| P9 | Refresh (tema gelap) | Tidak ada FOUC. |
| P10 | Tombol "Sistem" lalu ubah tema OS | Halaman mengikuti tema OS real-time. |

## 2. Skenario Negatif (Error Handling)

| # | Skenario | Setup | Hasil |
| :-- | :--- | :--- | :--- |
| N1 | POST gagal 400 | Proxy 400 `{ error: { code: "VALIDATION_ERROR", message: "Judul tugas tidak boleh kosong." } }` | Toast menampilkan message server persis; judul dipulihkan ke input. |
| N2 | POST gagal 429 | Simulasi 429 | Toast error; item optimistis hilang; judul dipulihkan. |
| N3 | PATCH gagal saat toggle | Blokir request PATCH | Checkbox rollback ke state awal + toast error server. |
| N4 | PATCH gagal saat edit | Blokir request PATCH | Judul rollback ke nilai lama + toast error. |
| N5 | DELETE gagal | Blokir request DELETE | Item kembali ke daftar + toast error. |
| N6 | GET gagal | Matikan server | Panel error + tombol "Coba lagi" → `refetch()`. |
| N7 | Cross-origin tanpa `Access-Control-Allow-Credentials` | Base URL cross-origin tanpa CORS | Respons diblokir browser; toast error muncul. |

## 3. Skenario Edge Case

| # | Skenario | Hasil |
| :-- | :--- | :--- |
| E1 | Judul spasi saja + `Enter` | Validasi Zod menolak; pesan `role="alert"`. |
| E2 | Judul > 200 karakter | Ditolak dengan pesan maksimal 200 karakter. |
| E3 | Enter beruntun cepat | Hanya satu POST (guard `submittingRef`). |
| E4 | Spam toggle > 5× dalam 1 detik | Hanya satu PATCH; state akhir konsisten. |
| E5 | Edit: `Esc` lalu klik di luar | Tidak tersimpan. |
| E6 | Edit: kosongkan judul + `Enter` | Pesan validasi; mode edit tetap terbuka. |
| E7 | Semua tugas dihapus | Empty state + fokus otomatis ke `QuickAddInput`. |
| E8 | `prefers-reduced-motion: reduce` | Animasi dinonaktifkan; class `reduce-motion` di `<html>` sejak sebelum paint. |
| E9 | Viewport 360 px | Tanpa horizontal scroll. |
| E10 | Viewport 768 px | Tanpa overflow. |
| E11 | Viewport 1440 px | Placeholder sidebar kiri muncul; tanpa overflow. |
| E12 | Dark mode + refresh | Tanpa flash terang. |
| E13 | Mode "system" + OS berubah | Tema ikut berubah (listener runtime `useTheme`). |
| E14 | Keyboard: `Tab` ke checkbox → `Space` | Toggle berfungsi, `aria-checked` berubah. |
| E15 | Refresh berulang + HMR saat `ThemeToggle` dipakai | Jumlah listener `matchMedia` stabil (tidak duplikat). |

## 4. Matriks Cakupan AC

| AC | Skenario Uji |
| :--- | :--- |
| AC1 (optimistic add + persist) | P2, P3, N1, N2, E3 |
| AC2 (toggle + grup collapsible) | P4, N3, E4 |
| AC3 (edit inline + hapus + rollback + toast) | P5, P6, P7, N3, N4, N5, E5, E6 |
| AC4 (tema + anti-FOUC) | P8, P9, P10, E8, E12, E13, E15 |
| AC5 (responsif 360/768/1440) | E9, E10, E11 |
| AC6 (tsc + lint lolos) | `docs/frontend.md` §11 |
| AC7 (`aria-checked` checkbox) | P4, E14 + `docs/frontend.md` §8 |
| AC8 (`docs/frontend.md`) | `docs/frontend.md` |
