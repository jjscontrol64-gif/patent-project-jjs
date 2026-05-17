# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 상세 규칙은 `.claude/rules/`를 참고한다.  
> 아키텍처: `.claude/rules/architecture.md` | 제약: `.claude/rules/constraints.md` | 워크플로우: `.claude/rules/workflow.md`

## 프로젝트 한 줄 요약

한국어로 일본 특허를 검색하고, 제목·요약을 DeepL로 번역해 보여주는 Next.js 16 앱.

## 핵심 명령

```bash
node .\node_modules\typescript\bin\tsc --noEmit   # 타입 검사 (변경 후 필수)
npm run dev                                         # 개발 서버
npm run build                                       # 프로덕션 빌드
```

## 아키텍처 핵심

```
page.tsx → lib/patent-service.ts → patent-api / mock-data → DeepL → 응답
```

- `lib/patent-service.ts`가 **유일한 서비스 진입점**이다. 검색·번역 로직을 다른 파일에 분산하지 않는다.
- `lib/types.ts`가 데이터 계약이다. 응답 구조를 바꿀 때 여기서 시작한다.
- patent-api 날짜 필터는 `YYYYMMDD` 형식으로 전달한다.
- 번역 오류는 페이지 전체 실패로 이어져선 안 된다 — 원문 반환으로 흡수.
- Next 16: `page.tsx`의 `params`와 `searchParams`는 `Promise`다, 반드시 `await`.

## 환경 변수 (`.env.local`)

| 키 | 없을 때 |
|----|---------|
| `PATENT_API_BASE_URL` | 기본값 `http://localhost:8080`, 연결 실패 시 mock 데이터로 대체 |
| `DEEPL_API_KEY` | 번역 생략, 원문 표시 |
| `DEEPL_API_URL` | 키 형식으로 free/pro 자동 감지 |
