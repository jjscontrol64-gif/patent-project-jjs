# 개발 워크플로우 — 에이전트 참조 문서

## 명령어

```bash
# 타입 검사 (변경 후 필수)
node .\node_modules\typescript\bin\tsc --noEmit

# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm run start
```

> PowerShell 실행 정책으로 `npm`이 차단될 경우:
> `node .\node_modules\.bin\next dev` 등으로 직접 실행

## 환경 변수 (`.env.local`)

| 키 | 필수 | 없을 때 동작 |
|----|------|--------------|
| `SERPAPI_API_KEY` | 선택 | `lib/mock-data.ts`의 샘플 데이터로 대체 |
| `DEEPL_API_KEY` | 선택 | 번역 생략, 원문 그대로 표시 |
| `DEEPL_API_URL` | 선택 | 미설정 시 키 형식(`:fx` 유무)으로 free/pro 자동 감지 |

## 작업 완료 기준 (DoD)

- [ ] `node .\node_modules\typescript\bin\tsc --noEmit` 오류 없음
- [ ] `lib/types.ts`와 구현이 일치함
- [ ] 번역 실패 시 상세 페이지가 여전히 렌더링됨
- [ ] SERPAPI_API_KEY 없이도 앱이 mock 데이터로 동작함

## 테스트 환경

자동화 테스트 스위트 없음. 검증은 TypeScript 타입 검사에 의존한다.  
UI 변경 시 개발 서버로 직접 확인 필요.

## 파일 수정 가이드

| 작업 | 수정할 파일 |
|------|-------------|
| 검색/번역 로직 변경 | `lib/patent-service.ts` (여기만) |
| 공용 타입 변경 | `lib/types.ts` → 구현 파일 순서로 |
| 검색 파라미터 정규화 | `lib/utils.ts` |
| 목록 UI 변경 | `components/search-results-client.tsx` |
| 검색 폼 변경 | `components/patent-search-form.tsx` |
| 상세 페이지 UI 변경 | `app/patent/[id]/page.tsx` |
| 샘플 데이터 변경 | `lib/mock-data.ts` |
