# CLAUDE.md

이 문서는 Claude Code가 이 저장소에서 작업할 때 참고하는 저장소 요약 문서다.

## 프로젝트 상태

이 저장소는 일본 특허 검색 MVP가 구현되어 있는 Next.js 프로젝트다.

- 메인 화면: `/`
- 검색 결과: `/search`
- 특허 상세: `/patent/[id]`
- 검색 API: `/api/patents/search`
- 상세 API: `/api/patents/[id]`
- 번역 API: `/api/translate`

## 기술 스택

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS

## 주요 명령

- 개발 서버: `npm run dev`
- 빌드: `npm run build`
- 실행: `npm run start`
- 타입 검사: `node .\\node_modules\\typescript\\bin\\tsc --noEmit`

참고:
- PowerShell 실행 정책 때문에 `npm`이 직접 실행되지 않을 수 있다.
- 그런 경우 `node`로 직접 실행 가능한 명령을 우선 사용한다.

## 환경 변수

`.env.local`에서 관리:

- `SERPAPI_API_KEY`
- `DEEPL_API_KEY`
- `DEEPL_API_URL` (선택)

동작 규칙:
- `SERPAPI_API_KEY`가 없으면 검색/상세 조회는 mock 데이터로 대체된다.
- `DEEPL_API_KEY`가 없으면 번역은 원문 기준으로 표시된다.

## 구조 요약

- `lib/patent-service.ts`
  검색, 상세, DeepL 번역, SerpAPI 연동, mock fallback의 중심 로직
- `lib/utils.ts`
  검색 파라미터 정규화와 문자열 유틸리티
- `lib/types.ts`
  공통 타입 정의
- `components/patent-search-form.tsx`
  공용 검색 폼
- `components/search-results-client.tsx`
  검색 결과 UI

## 주의사항

- Next 16 App Router에서는 `page.tsx`의 `params`, `searchParams`를 비동기 값으로 처리해야 한다.
- 한국어 검색어는 SerpAPI 검색 전에 일본어로 번역해서 사용한다.
- 날짜 필터는 출원일 기준으로 처리하며, SerpAPI에는 `filing:YYYYMMDD` 형식으로 전달해야 한다.
- 번역 실패가 상세 페이지 전체 오류로 이어지지 않도록 유지해야 한다.

## 검증

변경 후 최소한 아래는 확인한다.

- `node .\node_modules\typescript\bin\tsc --noEmit`
