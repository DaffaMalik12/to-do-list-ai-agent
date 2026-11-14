"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TaskSearchInput, TaskList, useTaskSearch } from "@/features/tasks";
import type { TaskListQuery } from "@/features/tasks";

const SEARCH_PAGE_LIMIT = 50;

function HomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // `searchParams.toString()` stabil secara referensi antar render selama isi
  // URL tidak berubah, sehingga aman dipakai sebagai dependency effect.
  const searchParamsString = searchParams.toString();
  const keywordFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return params.get("q") ?? "";
  }, [searchParamsString]);

  const [keyword, setKeyword] = useState<string>(keywordFromUrl);

  // Guard agar effect URL→state tidak menimpa ketikan yang sedang berlangsung.
  const isEditingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isEditingRef.current) return;
    setKeyword((current) => (current === keywordFromUrl ? current : keywordFromUrl));
  }, [keywordFromUrl]);

  // Reset guard setelah render berikutnya selesai.
  useEffect(() => {
    if (!isEditingRef.current) return;
    const timer = setTimeout(() => {
      isEditingRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [keyword]);

  const query = useMemo<TaskListQuery>(
    () => ({
      status: "all",
      sort: "created",
      order: "desc",
      limit: SEARCH_PAGE_LIMIT,
    }),
    [],
  );

  const { data, isLoading, isFetching, error, validationError, retry } =
    useTaskSearch({ keyword, ...query });

  // Sinkronkan state → URL (shareable / back-forward aman).
  useEffect(() => {
    const trimmed = keyword.trim();
    const params = new URLSearchParams(searchParamsString);
    const current = params.get("q") ?? "";
    if (trimmed === current) return;

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [keyword, pathname, router, searchParamsString]);

  const handleKeywordChange = useCallback((value: string) => {
    isEditingRef.current = true;
    setKeyword(value);
  }, []);

  const handleClearKeyword = useCallback(() => {
    isEditingRef.current = false;
    setKeyword("");
  }, []);

  const trimmedKeyword = keyword.trim();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Daftar Tugas
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cari tugas berdasarkan judul atau deskripsi.
        </p>
      </header>

      {/*
        Mobile-first: input lebar penuh. Desktop (lg): baris sejajar dengan
        slot kontrol filter (tiket berikutnya). Semua wrapper `min-w-0`
        sehingga tidak ada overflow horizontal di 320–375 px.
      */}
      <section
        aria-label="Pencarian tugas"
        className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6"
      >
        <div className="w-full min-w-0 lg:flex-1">
          <TaskSearchInput
            value={keyword}
            onChange={handleKeywordChange}
            onClear={handleClearKeyword}
            errorMessage={validationError?.message ?? null}
            maxLength={200}
          />
        </div>
        <div aria-hidden="true" className="hidden shrink-0 lg:block lg:w-64" />
      </section>

      <section aria-label="Hasil tugas" className="min-w-0">
        <TaskList
          items={data?.items ?? []}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          hasQuery={trimmedKeyword.length > 0}
          keyword={trimmedKeyword}
          onRetry={retry}
          onClearSearch={handleClearKeyword}
        />
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Memuat…</div>}>
      <HomeContent />
    </Suspense>
  );
}
