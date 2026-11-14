"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type ApiErrorDetail } from "@/services/http";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { listTasks } from "../api/listTasks";
import type { TaskListQuery, TaskListResult } from "../types/task";

export const MAX_KEYWORD_LENGTH = 200;
export const SEARCH_DEBOUNCE_MS = 300;

export interface UseTaskSearchParams {
  keyword: string;
  status?: TaskListQuery["status"];
  sort?: TaskListQuery["sort"];
  order?: TaskListQuery["order"];
  limit?: number;
  cursor?: string | null;
}

export interface ValidationError {
  message: string;
  details: ApiErrorDetail[];
}

export interface UseTaskSearchResult {
  data: TaskListResult | null;
  /** `true` hanya saat request pertama (belum pernah ada data sukses). */
  isLoading: boolean;
  /** `true` selama ada request berjalan (termasuk refetch). */
  isFetching: boolean;
  error: ApiError | Error | null;
  validationError: ValidationError | null;
  retry: () => void;
}

function createTooLongValidationError(): ValidationError {
  const message = `Maksimal ${MAX_KEYWORD_LENGTH} karakter`;
  return {
    message,
    details: [{ path: "q", message }],
  };
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export function useTaskSearch({
  keyword,
  status = "all",
  sort = "created",
  order = "desc",
  limit,
  cursor = null,
}: UseTaskSearchParams): UseTaskSearchResult {
  const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS);
  const trimmedKeyword = debouncedKeyword.trim();

  // Validasi memakai nilai mentah yang di-trim agar selaras dengan semantik
  // backend (q di-trim sebelum dihitung panjangnya). Pesan inline muncul
  // seketika, bukan setelah 300 ms.
  const isKeywordTooLong = keyword.trim().length > MAX_KEYWORD_LENGTH;

  const [data, setData] = useState<TaskListResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [validationError, setValidationError] = useState<ValidationError | null>(
    null,
  );
  const [retryToken, setRetryToken] = useState<number>(0);

  // ID request monotonik untuk mencegah response lama menimpa state baru.
  const requestIdRef = useRef<number>(0);
  // Controller request yang sedang berjalan.
  const abortRef = useRef<AbortController | null>(null);
  // Menandai sudah pernah ada response sukses. Disimpan di ref agar tidak
  // memicu re-render / masuk dependency effect (menghindari loop).
  const hasFetchedRef = useRef<boolean>(false);

  useEffect(() => {
    // Satu-satunya tempat pembatalan eksplisit: selalu batalkan request lama
    // sebelum memulai yang baru. Cleanup effect hanya membatalkan request
    // miliknya sendiri (mencegah double abort).
    abortRef.current?.abort();
    abortRef.current = null;

    if (isKeywordTooLong) {
      requestIdRef.current += 1;
      setIsFetching(false);
      setIsLoading(false);
      setError(null);
      setValidationError(createTooLongValidationError());
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    setIsFetching(true);
    // Skeleton hanya saat benar-benar belum pernah ada data sukses.
    if (!hasFetchedRef.current) {
      setIsLoading(true);
    }
    setValidationError(null);

    const run = async (): Promise<void> => {
      try {
        // Tidak ada fallback/retry implisit di sini: satu effect = satu
        // request (AC2). Bila backend menolak parameter yang menurut kontrak
        // valid, itu harus tampil sebagai error agar bug tidak tersamarkan.
        const result = await listTasks(
          {
            q: trimmedKeyword.length > 0 ? trimmedKeyword : undefined,
            status,
            sort,
            order,
            limit,
            cursor,
          },
          controller.signal,
        );

        if (requestIdRef.current !== currentRequestId) return;

        setData(result);
        setError(null);
        setValidationError(null);
        hasFetchedRef.current = true;
      } catch (err) {
        if (isAbortError(err)) return;
        if (requestIdRef.current !== currentRequestId) return;

        if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
          const qDetail = err.details?.find((d) => d.path === "q");
          if (qDetail) {
            setValidationError({
              message: qDetail.message,
              details: err.details ?? [{ path: "q", message: qDetail.message }],
            });
            setError(null);
          } else {
            const detailText =
              err.details && err.details.length > 0
                ? ` (${err.details.map((d) => `${d.path}: ${d.message}`).join("; ")})`
                : "";
            setError(new Error(`${err.message}${detailText}`));
            setValidationError(null);
          }
        } else {
          setError(err instanceof Error ? err : new Error("Terjadi kesalahan."));
          setValidationError(null);
        }
      } finally {
        // Pastikan status loading SELALU turun, termasuk bila parsing throw.
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    };

    void run();

    return () => {
      if (abortRef.current === controller) {
        controller.abort();
        abortRef.current = null;
      }
    };
    // `data`/`hasFetchedRef` sengaja TIDAK masuk dependency: memasukkannya
    // memicu loop request.
  }, [
    trimmedKeyword,
    isKeywordTooLong,
    status,
    sort,
    order,
    limit,
    cursor,
    retryToken,
  ]);

  const retry = useCallback((): void => {
    setError(null);
    setValidationError(null);
    setRetryToken((v) => v + 1);
  }, []);

  return {
    data,
    isLoading,
    isFetching,
    error,
    validationError,
    retry,
  };
}
