export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-transparent pb-16">
      <header className="border-b border-brand-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center">
          <div className="h-8 w-36 rounded-md bg-slate-200" />
          <div className="h-12 w-full max-w-[560px] rounded-full bg-slate-200" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6" aria-busy="true" aria-live="polite">
        <div className="mb-5 flex items-center gap-3 text-sm text-brand-muted">
          <span className="h-4 w-4 rounded-full border-2 border-brand-blue/25 border-t-brand-blue motion-safe:animate-spin" />
          <span>검색 결과를 불러오는 중입니다...</span>
        </div>

        <section className="max-w-4xl rounded-[2rem] border border-white/70 bg-white/85 px-6 py-4 shadow-card backdrop-blur">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="border-b border-slate-100 py-5 last:border-b-0">
              <div className="mb-3 h-3 w-28 rounded bg-slate-200" />
              <div className="mb-2 h-6 w-4/5 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 flex gap-3">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-16 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
