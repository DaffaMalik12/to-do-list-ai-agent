import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/shared/providers/AppProviders";
import { MainLayout } from "@/layouts/MainLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "todoagent",
  description: "Kelola tugas Anda dengan cepat dan sederhana.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
  ],
};

/**
 * Inline script anti-FOUC (fail-safe, jalan sekali sebelum paint).
 *
 * Tanggung jawab script ini SANGAT TERBATAS:
 *  1. Terapkan class `dark` pada <html> sesuai `localStorage['todoagent-theme']`
 *     (fallback `system` → `prefers-color-scheme`).
 *  2. Terapkan class `reduce-motion` bila `prefers-reduced-motion: reduce`.
 *  3. Setel `color-scheme` agar scrollbar/form control langsung benar.
 *
 * Script ini TIDAK mendaftarkan listener `matchMedia` apa pun. Seluruh listener
 * runtime ditangani `useTheme()` (lihat `src/features/theme/hooks/useTheme.ts`)
 * sehingga TIDAK ADA listener duplikat / kebocoran memori saat HMR maupun unmount.
 */
export const themeInitScript = `(function(){try{
  var THEME_KEY='todoagent-theme';
  var root=document.documentElement;
  var pref='system';
  try{var v=localStorage.getItem(THEME_KEY);if(v==='light'||v==='dark'||v==='system'){pref=v;}}catch(e){}
  var mode=(pref==='system')?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):pref;
  if(mode==='dark'){root.classList.add('dark');}else{root.classList.remove('dark');}
  root.style.colorScheme=mode;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){root.classList.add('reduce-motion');}
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          // Script statis (tanpa input pengguna) — aman untuk dangerouslySetInnerHTML.
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>
          <MainLayout>{children}</MainLayout>
        </AppProviders>
      </body>
    </html>
  );
}
