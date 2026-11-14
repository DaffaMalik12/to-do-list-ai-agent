# Panduan Pengguna — todoagent v0.1

Panduan singkat pemakaian fitur tugas di todoagent. Tanpa login — cukup buka halaman utama.

## 1. Menambah Tugas

1. Buka halaman utama. Kursor **otomatis** di kolom "Tambah tugas, tekan Enter…".
2. Ketik judul (maksimal 200 karakter).
3. Tekan **Enter** atau klik **Tambah**.
4. Tugas muncul **instan** di grup **Aktif**; input langsung kosong dan tetap fokus.

## 2. Menandai Tugas Selesai

1. Klik kotak centang — atau fokus dengan `Tab` lalu tekan `Space`.
2. Tugas pindah ke grup **Selesai** (bisa dilipat).
3. Klik lagi untuk mengembalikan ke **Aktif**.

## 3. Mengedit Judul Tugas

1. Klik judul → mode **edit inline**.
2. **Enter** simpan, **Esc** batal, klik di luar (blur) juga menyimpan.

## 4. Menghapus Tugas

1. Klik ikon tempat sampah di kanan item.
2. Konfirmasi dialog bawaan browser.
3. Tugas dihapus (soft delete) dan toast sukses muncul.

## 5. Mengubah Tema

Tombol tema di kanan atas header:

- **Terang** — selalu terang.
- **Gelap** — selalu gelap.
- **Sistem** — mengikuti OS.

Preferensi tersimpan otomatis. Saat membuka ulang dengan tema gelap, halaman langsung gelap (tanpa kilatan terang).

## 6. Jika Terjadi Kesalahan

- Request gagal → perubahan **dibatalkan otomatis** (rollback) dan pesan dari server tampil sebagai **toast**.
- Tugas gagal disimpan saat menambah → judul **dipulihkan** ke kolom input.
- Daftar gagal dimuat → klik **"Coba lagi"** pada panel error.
