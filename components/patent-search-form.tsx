"use client";

import type { KeyboardEventHandler } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchParams } from "@/lib/types";
import { cleanPatentNumber, createSearchHref, isPatentNumberLike } from "@/lib/utils";

type PatentSearchFormProps = {
  variant?: "hero" | "compact";
  initialValues?: SearchParams;
  placeholder?: string;
};

export function PatentSearchForm({
  variant = "hero",
  initialValues,
  placeholder = "키워드, 특허번호, 출원인으로 검색...",
}: PatentSearchFormProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialValues?.q ?? initialValues?.patentNumber ?? "");
  const [dateFrom, setDateFrom] = useState(initialValues?.dateFrom ?? "2020-01-01");
  const [dateTo, setDateTo] = useState(initialValues?.dateTo ?? "2024-12-31");
  const [ipc, setIpc] = useState(initialValues?.ipc ?? "");
  const [showFilters, setShowFilters] = useState(variant === "hero");

  const containerClass =
    variant === "hero"
      ? "w-full max-w-[640px]"
      : "w-full max-w-[560px] rounded-full border border-brand-line bg-white/90 px-4 py-3 shadow-sm backdrop-blur";

  const inputWrapClass =
    variant === "hero"
      ? "flex items-center rounded-full border border-[#dfe1e5] bg-white px-5 py-4 shadow-search transition hover:shadow-card"
      : "flex items-center";

  const buttonGroupClass = variant === "hero" ? "mt-5 flex flex-wrap justify-center gap-3" : "hidden";
  const iconClass = "mr-3 h-5 w-5 shrink-0 text-brand-muted";

  const searchParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      dateFrom: dateFrom.trim() || undefined,
      dateTo: dateTo.trim() || undefined,
      ipc: ipc.trim() || undefined,
      page: 1,
      pageSize: initialValues?.pageSize ?? 5,
    }),
    [dateFrom, dateTo, initialValues?.pageSize, ipc, q],
  );

  const goToSearch = () => {
    router.push(createSearchHref(searchParams));
  };

  const goToPatent = () => {
    const raw = q.trim();
    if (!raw) return;

    if (isPatentNumberLike(raw)) {
      router.push(`/patent/${encodeURIComponent(cleanPatentNumber(raw))}`);
      return;
    }

    router.push(createSearchHref({ ...searchParams, patentNumber: raw }));
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      goToSearch();
    }
  };

  return (
    <div className={containerClass}>
      <div className={inputWrapClass}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79L19 20.49 20.49 19zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14" />
        </svg>
        <input
          className="w-full bg-transparent text-[15px] text-brand-ink outline-none placeholder:text-brand-muted md:text-base"
          type="text"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="검색어"
        />
        {variant === "compact" ? (
          <button
            type="button"
            onClick={goToSearch}
            className="ml-3 rounded-full bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:opacity-95"
          >
            검색
          </button>
        ) : null}
      </div>

      <div className={buttonGroupClass}>
        <button
          type="button"
          onClick={goToSearch}
          className="rounded-md bg-brand-blue px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5"
        >
          특허 검색
        </button>
        <button
          type="button"
          onClick={goToPatent}
          className="rounded-md border border-[#dadce0] bg-brand-paper px-6 py-3 text-sm text-brand-ink transition hover:bg-white"
        >
          특허번호 직접 조회
        </button>
      </div>

      {variant === "hero" ? (
        <>
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 17v2h6v-2zm0-12v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zm-6-6H3v2h4v2h2zm14-4V9H11v2zm-6-4h2V5h4V3h-4V1h-2z" />
              </svg>
              고급 필터 (날짜 · IPC)
            </button>
          </div>
          {showFilters ? (
            <div className="mt-4 rounded-2xl border border-brand-line bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
                <label className="flex flex-col gap-2 text-sm text-brand-muted">
                  <span className="font-medium">출원일 범위</span>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm text-brand-ink outline-none"
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                    />
                    <span>~</span>
                    <input
                      className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm text-brand-ink outline-none"
                      type="date"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-2 text-sm text-brand-muted">
                  <span className="font-medium">IPC 분류</span>
                  <input
                    className="rounded-md border border-[#dadce0] px-3 py-2 text-sm text-brand-ink outline-none"
                    type="text"
                    value={ipc}
                    onChange={(event) => setIpc(event.target.value)}
                    placeholder="예: H01M10"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
