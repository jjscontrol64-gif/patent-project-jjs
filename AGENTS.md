# AGENTS.md

이 저장소에서 작업하는 AI 코딩 에이전트를 위한 운영 지침.

## 우선순위와 선행 절차

1. 이 파일을 읽는다.
2. 작업을 시작하기 전에 `.claude/rules/architecture.md`, `.claude/rules/constraints.md`, `.claude/rules/workflow.md`를 모두 읽는다.
3. `.claude/rules/`의 지침은 단순 참고가 아니라 이 저장소의 필수 작업 규칙으로 적용한다.
4. 이 파일과 `.claude/rules/`가 충돌하면 더 구체적인 규칙을 우선하고, 둘 다 충돌하지 않으면 함께 따른다.

## 프로젝트 개요

- **무엇**: 한국어 검색어로 일본 특허를 찾고, 제목·요약을 DeepL로 번역해 보여주는 서비스
- **스택**: Next.js 16 App Router, TypeScript, Tailwind CSS
- **외부 의존**: SerpAPI (`google_patents` + `google_patents_details`), DeepL API

## 서비스 구조 — 에이전트 관점

```text
[ 진입점 ]  app/**/page.tsx, app/api/**/route.ts
                  ↓
[ 서비스 ]  lib/patent-service.ts  ← 모든 로직이 여기에 있다
                  ↓
[ 외부 ]   SerpAPI  ←→  mock-data.ts (fallback)
           DeepL    ←→  원문 반환 (오류 흡수)
```

## 에이전트가 지켜야 할 핵심 원칙

### 1. 단일 서비스 원칙
검색·번역·fallback 로직은 `lib/patent-service.ts`에만 존재한다.
`page.tsx`나 `route.ts`에 직접 SerpAPI/DeepL 호출을 추가하지 않는다.

### 2. 타입 우선 원칙
응답 구조 변경 순서: `lib/types.ts` → `lib/patent-service.ts` → 페이지/라우트.

### 3. Graceful Degradation 유지
- `SERPAPI_API_KEY` 없음 → mock 데이터 정상 반환
- `DEEPL_API_KEY` 없음 → 원문 표시, 오류 없음
- 번역 실패 → `notice` 필드에 메시지, 페이지는 계속 렌더링

### 4. Next 16 비동기 Props
`page.tsx`에서 `params`와 `searchParams`는 `Promise` 타입이다.

```typescript
const [{ id }, rawSearchParams] = await Promise.all([params, searchParams]);
```

### 5. SerpAPI 날짜 포맷

```typescript
after: "filing:20230101"   // 올바름
after: "2023-01-01"        // 잘못됨 — 무시됨
```

## 변경 완료 기준

```bash
node .\node_modules\typescript\bin\tsc --noEmit
```

추가로 검색 로직 변경 시:
- 한국어 검색어 → 일본어 번역 경로 확인
- `filing:YYYYMMDD` 날짜 포맷 유지
- mock fallback 동작 유지
- DeepL 실패 시 상세 페이지 렌더링 확인

## 파일 지도

| 파일 | 역할 |
|------|------|
| `lib/patent-service.ts` | 검색, 상세, 번역, fallback 전부 |
| `lib/types.ts` | 공용 타입 — 데이터 계약 |
| `lib/utils.ts` | 파라미터 정규화, 문자열 유틸 |
| `lib/mock-data.ts` | API 키 없을 때 샘플 데이터 |
| `components/patent-search-form.tsx` | 공용 검색 폼 |
| `components/search-results-client.tsx` | 결과 목록 + 페이지네이션 UI |

## 현재 상태

- 자동화 테스트 없음 — TypeScript 타입 검사가 유일한 자동 검증
- IPC 필터는 SerpAPI 응답 후 앱 레이어에서 처리 (SerpAPI 미지원)
- 특허번호 형식 검색어는 `google_patents_details` 직접 조회로 우회
