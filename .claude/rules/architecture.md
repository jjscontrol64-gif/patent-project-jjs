# 아키텍처 — 에이전트 참조 문서

## 데이터 흐름

```
사용자 요청
  └─ app/page.tsx | app/search/page.tsx | app/patent/[id]/page.tsx  (서버 컴포넌트)
       └─ lib/patent-service.ts  ← 모든 비즈니스 로직의 단일 진입점
            ├─ SerpAPI (google_patents / google_patents_details)
            │    └─ 실패 시 → lib/mock-data.ts fallback
            └─ DeepL API (JA → KO 번역)
                 └─ 실패 시 → 원문 그대로 반환 (페이지 전체 오류 금지)
```

## 레이어 역할

| 레이어 | 위치 | 역할 |
|--------|------|------|
| 서버 페이지 | `app/**/page.tsx` | 파라미터 파싱 → 서비스 호출 → UI 렌더링 |
| API 라우트 | `app/api/**/route.ts` | HTTP 래퍼. `patent-service.ts` 위임만 함 |
| 서비스 | `lib/patent-service.ts` | SerpAPI 쿼리, 번역, fallback, 응답 정규화 |
| 타입 | `lib/types.ts` | 공용 타입 정의. 여기서 시작해서 여기서 끝남 |
| 유틸 | `lib/utils.ts` | 파라미터 정규화, 문자열 유틸리티 |
| 모의 데이터 | `lib/mock-data.ts` | API 키 없을 때 fallback 소스 |
| UI | `components/` | 클라이언트 컴포넌트 (`"use client"`) |

## 핵심 타입

```typescript
// lib/types.ts 요약
PatentSummary   — 목록 1건 (id, titleJa, titleKo, applicationDate, ipcClasses, ...)
PatentDetail    — PatentSummary + inventors, abstractJa, abstractKo, 외부 링크
SearchParams    — q, patentNumber, dateFrom, dateTo, ipc, page, pageSize
SearchResponse  — items, totalResults, page, pageSize, elapsedMs, source, notice?
PatentDetailResponse — item, source, notice?
```

## SerpAPI 엔진 매핑

| 용도 | engine 값 |
|------|-----------|
| 키워드/일반 검색 | `google_patents` |
| 특허 상세 조회 | `google_patents_details` |

## 날짜 형식 변환 규칙

- 앱 내부: `YYYY-MM-DD`
- SerpAPI `after`/`before` 파라미터: `filing:YYYYMMDD` (하이픈 없음, `filing:` 접두어 필수)

## 특허번호 검색 우선 경로

`q` 또는 `patentNumber`가 특허번호처럼 보이면 (`isPatentNumberLike`) 일반 검색 전에 `google_patents_details`로 직접 조회를 먼저 시도한다.
