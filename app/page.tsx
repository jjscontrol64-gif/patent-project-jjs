import Link from "next/link";
import { PatentSearchForm } from "@/components/patent-search-form";

const quickLinks = [
  "이차전지 전해질",
  "전고체 전지",
  "H01M10",
  "JP2023-145892A",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-hero-glow">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-16">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="mb-8">
            <div className="text-[3.4rem] font-bold tracking-[-0.04em] text-brand-ink md:text-[4.5rem]">
              <span className="text-brand-blue">J</span>
              <span className="text-[#ea4335]">P</span>
              <span className="text-[#fbbc04]">특</span>
              <span className="text-[#34a853]">허</span>
              <span className="text-brand-blue">검</span>
              <span className="text-[#ea4335]">색</span>
            </div>
            <p className="mt-4 text-base text-brand-muted md:text-lg">
              일본 특허를 한국어로 검색하고, 결과와 상세 요약까지 한 번에 확인합니다.
            </p>
          </div>

          <PatentSearchForm />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {quickLinks.map((keyword) => (
              <Link
                key={keyword}
                href={keyword.startsWith("JP") ? `/patent/${keyword}` : `/search?q=${encodeURIComponent(keyword)}`}
                className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-brand-ink shadow-sm transition hover:-translate-y-0.5"
              >
                {keyword}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur">
            <div className="text-sm font-semibold text-brand-blue">검색</div>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
              키워드, 출원인, 특허번호 검색과 출원일, IPC 필터를 함께 지원합니다.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur">
            <div className="text-sm font-semibold text-brand-blue">번역</div>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
              제목은 목록에서 바로 한국어로 확인하고, 상세 페이지에서는 요약 번역까지 제공합니다.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur">
            <div className="text-sm font-semibold text-brand-blue">연동</div>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
              EPO OPS와 Papago 키를 넣으면 실데이터로 동작하고, 없으면 샘플 데이터로 흐름을 검증할 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
