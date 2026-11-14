/**
 * Konfigurasi environment client.
 * Hanya variabel NEXT_PUBLIC_* yang boleh diakses di browser.
 */
export const clientEnv = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
} as const;

export function getApiBaseUrl(): string {
  return clientEnv.apiBaseUrl.replace(/\/$/, "");
}
