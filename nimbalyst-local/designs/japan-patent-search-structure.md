# 일본 특허 검색 서비스 — 구조 설계

> 소스: `nimbalyst-local/plans/japan-patent-search-service.md` + 목업 3종  
> 생성: 2026-05-03

---

## 1. 디렉토리 구조

```
patent-project/
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # 루트 레이아웃 (html, body)
│   │   ├── page.tsx                          # / → 메인 검색 페이지
│   │   ├── search/
│   │   │   └── page.tsx                      # /search?q=... → 검색 결과 목록
│   │   ├── patent/
│   │   │   └── [id]/
│   │   │       └── page.tsx                  # /patent/[id] → 특허 상세
│   │   └── api/
│   │       ├── patents/
│   │       │   ├── search/
│   │       │   │   └── route.ts              # GET /api/patents/search
│   │       │   └── [id]/
│   │       │       └── route.ts              # GET /api/patents/[id]
│   │       └── translate/
│   │           └── route.ts                  # POST /api/translate
│   │
│   ├── components/
│   │   ├── search/
│   │   │   ├── SearchBox.tsx                 # 검색 입력 + 버튼 (메인 페이지용 large)
│   │   │   └── FilterPanel.tsx               # 날짜 범위 + IPC 코드 필터 (collapsible)
│   │   ├── results/
│   │   │   ├── ResultsMeta.tsx               # 결과 건수 + 번역 토글 행
│   │   │   ├── PatentCard.tsx                # 특허 1건 카드 (♻️ shared)
│   │   │   ├── PatentList.tsx                # PatentCard 목록 + 로딩/에러 상태
│   │   │   └── Pagination.tsx                # 페이지 버튼 (♻️ shared)
│   │   ├── detail/
│   │   │   ├── BiblioTable.tsx               # 서지 정보 테이블
│   │   │   ├── AbstractSection.tsx           # 한국어/일본어 요약 블록 (동시 표시)
│   │   │   └── ExternalLinks.tsx             # J-PlatPat + Espacenet 버튼
│   │   └── ui/
│   │       ├── ResultsHeader.tsx             # 로고 + compact SearchBar (♻️ shared — 결과/상세)
│   │       ├── TranslateToggle.tsx           # KR ↔ JP 토글 스위치 (♻️ shared)
│   │       └── BackLink.tsx                  # ← 검색 결과로 돌아가기 (♻️ shared)
│   │
│   ├── lib/
│   │   ├── epo/
│   │   │   ├── auth.ts                       # EPO OPS OAuth2 토큰 발급 + 캐싱 (20분)
│   │   │   ├── search.ts                     # CQL 쿼리 빌더 + 검색 XML → PatentSummary[] 파서
│   │   │   └── detail.ts                     # biblio + abstract XML → PatentDetail 파서
│   │   ├── papago/
│   │   │   └── translate.ts                  # Papago n2mt POST 클라이언트
│   │   └── utils/
│   │       └── xml.ts                        # XML 파싱 유틸리티 (EPO OPS 응답용)
│   │
│   └── types/
│       └── index.ts                          # 모든 TypeScript 인터페이스
│
├── .env.local                                # API 키 (gitignore)
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 2. 컴포넌트 계층

### `/` → `app/page.tsx`

```
page.tsx
├── Logo                    props: (static)
├── SearchBox               props: onSearch(query, filters)
│   ├── [input]             — 검색어 텍스트
│   ├── [button] 특허 검색
│   └── [button] 특허번호 검색
├── FilterToggle            props: isOpen, onToggle
└── FilterPanel             props: filters, onChange, isOpen
    ├── DateRangeFilter     props: dateFrom, dateTo, onChange
    └── IpcFilter           props: value, onChange
```

### `/search` → `app/search/page.tsx`

```
page.tsx
├── ResultsHeader ♻️        props: query, onSearch
│   ├── Logo (compact)
│   └── [input + 검색 버튼]
├── ResultsMeta             props: total, showKR, onToggle
│   ├── ResultsCount        props: total
│   └── TranslateToggle ♻️  props: isKR, onChange
├── PatentList              props: patents, isLoading, error
│   └── PatentCard ♻️ ×N    props: patent, showKR, onClick
└── Pagination ♻️           props: page, totalPages, onPageChange
```

### `/patent/[id]` → `app/patent/[id]/page.tsx`

```
page.tsx
├── ResultsHeader ♻️        props: lastQuery, onSearch
├── BackLink ♻️             props: href ← /search?q=...
├── DetailBadge             — "JP 특허" (static)
├── TitleSection            props: titleKR, titleJP
├── BiblioTable             props: patent (PatentDetail)
├── AbstractSection         props: abstractKR, abstractJP
└── ExternalLinks           props: espacenetUrl, jplatpatUrl
```

> ⚠️ 확인 필요: 상세 페이지 요약은 목업 기준 KR/JP 동시 표시 (토글 없음). 계획서에는 번역 토글이 언급됨. 동시 표시로 확정?

---

## 3. API 라우트 스펙

### `GET /api/patents/search`

```typescript
// 요청 (query params)
{
  q: string           // 검색어 키워드
  page?: number       // 기본 1
  dateFrom?: string   // "YYYYMMDD"
  dateTo?: string     // "YYYYMMDD"
  ipc?: string        // IPC 분류 코드 (예: "H01M10")
}

// 응답
{
  patents: PatentSummary[]
  total: number       // EPO OPS 전체 결과 건수
  page: number
  pageSize: number    // 고정 10
}
```

EPO OPS CQL 쿼리 빌드 (`ct=JP AND ti="{q}" AND pd within "dateFrom,dateTo"`) → XML 응답 파싱 → 제목 배열 Papago 번역 → 조합 반환.

---

### `GET /api/patents/[id]`

```typescript
// 요청 (path param)
// id: string — EPO docdb 형식 (예: "JP.2023123456.A")

// 응답
{
  patent: PatentDetail
}
```

EPO OPS biblio + abstract 순차 요청 → XML 파싱 → 제목 + 요약 Papago 번역 → 외부 링크 생성 후 반환.

---

### `POST /api/translate`

```typescript
// 요청 (body)
{
  texts: string[]     // 번역할 텍스트 배열
}

// 응답
{
  translations: string[]
}
```

Papago `n2mt` 엔드포인트 프록시 (source: ja, target: ko). API 키 서버사이드 보호 목적.

> ⚠️ 확인 필요: `/api/translate`를 클라이언트가 직접 호출하는 경우가 있는지? 번역 토글 UX에 따라 클라이언트→API 직접 호출 필요할 수 있음.

---

## 4. TypeScript 핵심 타입

```typescript
// src/types/index.ts

// 검색 결과 목록 1건
interface PatentSummary {
  id: string              // EPO docdb ID (예: "JP.2023123456.A")
  titleKR: string         // Papago 번역 제목
  titleJP: string         // 원문 일본어 제목
  applicant: string       // 출원인
  applicationDate: string // 출원일 "YYYY-MM-DD"
  ipc: string[]           // IPC 코드 배열
}

// 상세 페이지 전체 데이터
interface PatentDetail extends PatentSummary {
  inventor: string        // 발명자
  publicationDate: string // 공개일 "YYYY-MM-DD"
  abstractKR: string      // 번역 요약
  abstractJP: string      // 원문 요약
  espacenetUrl: string    // https://worldwide.espacenet.com/...
  jplatpatUrl: string     // https://www.j-platpat.inpit.go.jp/...
}

// 검색 필터
interface SearchFilters {
  q: string
  page?: number
  dateFrom?: string       // "YYYYMMDD"
  dateTo?: string         // "YYYYMMDD"
  ipc?: string
}

// API 응답
interface SearchResponse {
  patents: PatentSummary[]
  total: number
  page: number
  pageSize: number
}

interface PatentDetailResponse {
  patent: PatentDetail
}

// 공통 에러
interface ApiError {
  code: string
  message: string
  statusCode: number
}

// EPO OPS 내부 파싱용 (XML → 앱 타입 변환 중간)
interface EpoRawBiblio {
  docNumber: string
  titleJP: string
  applicants: string[]
  inventors: string[]
  applicationDate: string
  publicationDate: string
  ipcCodes: string[]
}
```

---

## 5. 구현 순서

### Phase 1 — 기반 (블로킹)
1. Next.js 14 + TypeScript + Tailwind 프로젝트 초기화
2. `src/types/index.ts` — 전체 타입 정의
3. `.env.local` 구조 셋업 (EPO_OPS_CONSUMER_KEY, EPO_OPS_CONSUMER_SECRET, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)
4. `lib/epo/auth.ts` — OAuth2 토큰 발급 + 메모리 캐싱
5. `lib/papago/translate.ts` — Papago POST 클라이언트
6. `lib/utils/xml.ts` — XML 파싱 유틸리티

### Phase 2 — API 라우트
7. `lib/epo/search.ts` — CQL 빌더 + 검색 XML 파서
8. `GET /api/patents/search` — 검색 엔드포인트
9. `lib/epo/detail.ts` — biblio + abstract XML 파서
10. `GET /api/patents/[id]` — 상세 엔드포인트
11. `POST /api/translate` — 번역 프록시 (필요 시)

### Phase 3 — 공유 컴포넌트
12. `ui/ResultsHeader.tsx` — 로고 + compact 검색 바
13. `ui/TranslateToggle.tsx` — 토글 스위치
14. `ui/BackLink.tsx`
15. `results/PatentCard.tsx`
16. `results/Pagination.tsx`

### Phase 4 — 페이지
17. `app/page.tsx` — 메인 검색 (SearchBox + FilterPanel)
18. `app/search/page.tsx` — 검색 결과 (ResultsMeta + PatentList + Pagination)
19. `app/patent/[id]/page.tsx` — 상세 (BiblioTable + AbstractSection + ExternalLinks)

### Phase 5 — 배포
20. Vercel 환경 변수 설정 + 배포

---

## 미결 사항

| # | 확인 필요 | 위치 |
|---|-----------|------|
| 1 | 상세 페이지 요약: KR/JP 동시 표시 vs 토글? | `AbstractSection` 설계 |
| 2 | `/api/translate` 클라이언트 직접 호출 여부 | `TranslateToggle` 동작 |
| 3 | 특허번호 검색 시 ID 형식? EPO docdb 형식 입력인지 JP 번호 직접 입력인지 | `SearchBox` + API route |
