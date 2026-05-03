"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PatentSearchForm } from "@/components/patent-search-form";
import { SearchResponse } from "@/lib/types";
import { createSearchHref } from "@/lib/utils";

type SearchResultsClientProps = {
  response: SearchResponse;
  searchParams: {
    q?: string;
    patentNumber?: string;
    dateFrom?: string;
    dateTo?: string;
    ipc?: string;
    page?: number;
    pageSize?: number;
  };
};

export function SearchResultsClient({ response, searchParams }: SearchResultsClientProps) {
  const [showTranslated, setShowTranslated] = useState(true);
  const totalPages = Math.max(1, Math.ceil(response.totalResults / response.pageSize));
  const pageNumbers = useMemo(() => {
    const pages = new Set<number>([1, totalPages, response.page]);
    if (response.page > 1) pages.add(response.page - 1);
    if (response.page < totalPages) pages.add(response.page + 1);
    return Array.from(pages).sort((a, b) => a - b);
  }, [response.page, totalPages]);

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <header className="border-b border-brand-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-brand-ink">
            <span className="text-brand-blue">JP</span>특허검색
          </Link>
          <PatentSearchForm variant="compact" initialValues={searchParams} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6">
        {response.notice ? (
          <div className="mb-5 rounded-2xl border border-[#d2e3fc] bg-[#e8f0fe] px-4 py-3 text-sm text-brand-ink">
            {response.notice}
          </div>
        ) : null}

        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-brand-muted">
            약 {response.totalResults.toLocaleString("ko-KR")}건 · {(response.elapsedMs / 1000).toFixed(2)}초 ·{" "}
            {response.source === "epo" ? "실시간 EPO" : "샘플 데이터"}
          </div>
          <button
            type="button"
            onClick={() => setShowTranslated((current) => !current)}
            className="inline-flex w-fit items-center gap-3 rounded-full border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink shadow-sm"
          >
            <span>한국어 번역</span>
            <span className={`relative h-5 w-10 rounded-full ${showTranslated ? "bg-brand-blue" : "bg-slate-300"}`}>
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                  showTranslated ? "left-[1.15rem]" : "left-0.5"
                }`}
              />
            </span>
            <span className={showTranslated ? "font-medium text-brand-blue" : "text-brand-muted"}>
              {showTranslated ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {(searchParams.dateFrom || searchParams.dateTo || searchParams.ipc) && (
          <div className="mb-5 flex flex-wrap gap-2 text-sm text-brand-muted">
            {searchParams.dateFrom || searchParams.dateTo ? (
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                출원일 {searchParams.dateFrom ?? "전체"} ~ {searchParams.dateTo ?? "전체"}
              </span>
            ) : null}
            {searchParams.ipc ? <span className="rounded-full bg-white px-3 py-1 shadow-sm">IPC {searchParams.ipc}</span> : null}
          </div>
        )}

        <section className="max-w-4xl">
          {response.items.length === 0 ? (
            <div className="rounded-3xl border border-brand-line bg-white/85 p-10 text-center shadow-card">
              <p className="text-lg font-semibold text-brand-ink">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm text-brand-muted">검색어를 바꾸거나 날짜, IPC 필터를 완화해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-2 rounded-[2rem] border border-white/70 bg-white/85 px-6 py-4 shadow-card backdrop-blur">
              {response.items.map((item) => (
                <article key={item.id} className="border-b border-slate-100 py-5 last:border-b-0">
                  <div className="mb-1 text-xs font-semibold text-brand-blue">{item.publicationNumber}</div>
                  <Link
                    href={`/patent/${encodeURIComponent(item.id)}?${new URLSearchParams({
                      ...(searchParams.q ? { q: searchParams.q } : {}),
                      ...(searchParams.patentNumber ? { patentNumber: searchParams.patentNumber } : {}),
                      ...(searchParams.dateFrom ? { dateFrom: searchParams.dateFrom } : {}),
                      ...(searchParams.dateTo ? { dateTo: searchParams.dateTo } : {}),
                      ...(searchParams.ipc ? { ipc: searchParams.ipc } : {}),
                      ...(searchParams.page ? { page: String(searchParams.page) } : {}),
                    }).toString()}`}
                    className="block text-xl font-medium leading-8 text-[#1a0dab] transition hover:text-brand-blue"
                  >
                    {showTranslated ? item.titleKo : item.titleJa}
                  </Link>
                  <div className="mt-1 text-sm leading-6 text-brand-muted">{showTranslated ? item.titleJa : item.titleKo}</div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-brand-muted">
                    <span>
                      <span className="mr-1 text-slate-400">출원인</span>
                      {item.applicant}
                    </span>
                    <span>
                      <span className="mr-1 text-slate-400">출원일</span>
                      {item.applicationDate}
                    </span>
                    <span>
                      <span className="mr-1 text-slate-400">IPC</span>
                      {item.ipcClasses[0] ?? "-"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {response.items.length > 0 && totalPages > 1 ? (
          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="페이지네이션">
            <Link
              href={createSearchHref({ ...searchParams, page: Math.max(1, response.page - 1) })}
              className="flex h-10 w-10 items-center justify-center rounded-full text-brand-blue hover:bg-white"
            >
              ‹
            </Link>
            {pageNumbers.map((pageNumber, index) => {
              const previous = pageNumbers[index - 1];
              const gapBefore = previous && pageNumber - previous > 1;
              return (
                <div key={pageNumber} className="flex items-center gap-2">
                  {gapBefore ? <span className="px-1 text-sm text-brand-muted">…</span> : null}
                  <Link
                    href={createSearchHref({ ...searchParams, page: pageNumber })}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${
                      pageNumber === response.page
                        ? "bg-brand-blue font-semibold text-white"
                        : "text-brand-blue hover:bg-white"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                </div>
              );
            })}
            <Link
              href={createSearchHref({ ...searchParams, page: Math.min(totalPages, response.page + 1) })}
              className="flex h-10 w-10 items-center justify-center rounded-full text-brand-blue hover:bg-white"
            >
              ›
            </Link>
          </nav>
        ) : null}
      </main>
    </div>
  );
}
