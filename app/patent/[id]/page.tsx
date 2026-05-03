import Link from "next/link";
import { PatentSearchForm } from "@/components/patent-search-form";
import { getPatentDetail } from "@/lib/patent-service";
import { buildDetailBackHref, normalizeSearchParams } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PatentDetailPageProps = {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function PatentDetailPage({ params, searchParams }: PatentDetailPageProps) {
  const detailResponse = await getPatentDetail(params.id);
  const normalized = normalizeSearchParams(searchParams);
  const backHref = buildDetailBackHref(normalized);

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <header className="border-b border-brand-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-brand-ink">
            <span className="text-brand-blue">JP</span>특허검색
          </Link>
          <PatentSearchForm variant="compact" initialValues={normalized} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8">
        {detailResponse.notice ? (
          <div className="mb-5 rounded-2xl border border-[#d2e3fc] bg-[#e8f0fe] px-4 py-3 text-sm text-brand-ink">
            {detailResponse.notice}
          </div>
        ) : null}

        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-brand-blue">
          <span>←</span>
          <span>검색 결과로 돌아가기</span>
        </Link>

        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-card backdrop-blur">
          <div className="mb-8">
            <div className="mb-3 inline-flex rounded-full bg-[#e8f0fe] px-3 py-1 text-xs font-semibold text-brand-blue">
              {detailResponse.item.publicationNumber}
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-brand-ink">{detailResponse.item.titleKo}</h1>
            <p className="mt-3 text-sm leading-7 text-brand-muted">{detailResponse.item.titleJa}</p>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 inline-block border-b-2 border-brand-blue pb-2 text-base font-semibold text-brand-ink">
              서지 정보
            </h2>
            <div className="overflow-hidden rounded-2xl border border-brand-line">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {[
                    ["출원번호", detailResponse.item.applicationNumber],
                    ["공개번호", detailResponse.item.publicationNumber],
                    ["출원인", detailResponse.item.applicant],
                    ["발명자", detailResponse.item.inventors.join(", ")],
                    ["출원일", detailResponse.item.applicationDate || "-"],
                    ["공개일", detailResponse.item.publicationDate || "-"],
                    ["IPC 분류", detailResponse.item.ipcClasses.join(" · ") || "-"],
                    ["국가", "일본 (JP)"],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-brand-line last:border-b-0">
                      <th className="w-36 bg-brand-paper px-4 py-3 text-left font-medium text-brand-muted">{label}</th>
                      <td className="px-4 py-3 text-brand-ink">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-4 inline-block border-b-2 border-brand-blue pb-2 text-base font-semibold text-brand-ink">
              요약
            </h2>

            <div className="mb-6">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                한국어 번역
              </div>
              <div className="rounded-r-xl border-l-4 border-brand-blue bg-brand-paper px-5 py-4 text-[15px] leading-8 text-brand-ink">
                {detailResponse.item.abstractKo}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                일본어 원문
              </div>
              <p className="px-1 text-sm leading-8 text-brand-muted">{detailResponse.item.abstractJa}</p>
            </div>
          </section>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-brand-line pt-6">
            <a
              href={detailResponse.item.jPlatPatUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-5 py-3 text-sm font-medium text-white"
            >
              J-PlatPat 원문 보기
            </a>
            <a
              href={detailResponse.item.espacenetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[#dadce0] bg-white px-5 py-3 text-sm font-medium text-brand-blue"
            >
              Espacenet 보기
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
