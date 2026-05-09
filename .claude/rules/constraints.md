# 에이전트 제약 조건 — 반드시 준수

## 절대 금지

| # | 금지 행동 | 이유 |
|---|-----------|------|
| 1 | `lib/patent-service.ts` 외부에 검색/번역 로직 중복 | 단일 진입점 원칙 위반 |
| 2 | 번역 실패를 throw로 전파 | 상세 페이지 전체가 500 오류가 됨 |
| 3 | `lib/types.ts` 미수정 상태로 응답 구조 변경 | 타입-구현 불일치 |
| 4 | mock fallback 제거 또는 우회 | API 키 없는 환경에서 앱이 동작 불가 |
| 5 | `page.tsx`에서 `params`/`searchParams`를 동기로 읽기 | Next 16 async props 규칙 위반 |

## 반드시 지켜야 할 규칙

### 번역 오류 처리
- `translateTextSafely` / `translateTextsSafely` 사용 → 오류는 원문 반환으로 흡수
- 번역 오류 메시지는 `notice` 필드에 담아서 UI에 표시

### Next 16 비동기 params
```typescript
// 올바른 방식
const [{ id }, rawSearchParams] = await Promise.all([params, searchParams]);

// 잘못된 방식 (타입 오류 + 런타임 경고)
const { id } = params;  // params는 Promise
```

### 응답 구조 변경 절차
1. `lib/types.ts` 타입 수정
2. `lib/patent-service.ts` 구현 수정
3. 관련 `page.tsx` / `route.ts` 수정
4. 타입 검사 실행

### SerpAPI 날짜 필터
```typescript
// 올바른 형식
after: "filing:20230101"

// 잘못된 형식 — SerpAPI가 무시함
after: "2023-01-01"
```

### 한국어 검색어 처리
- `containsHangul(keyword)` → true면 SerpAPI 호출 전 DeepL로 JA 번역
- DeepL 실패 시: 원문 한국어로 검색하고 `notice`에 번역 실패 메시지 추가

### IPC 필터
- SerpAPI는 IPC 필터를 직접 지원하지 않음
- 검색 결과 반환 후 `item.ipcClasses`로 클라이언트 사이드 필터링

## 변경 전 확인 항목

의미 있는 변경 전후에 반드시 타입 검사를 실행한다:
```
node .\node_modules\typescript\bin\tsc --noEmit
```

검색/API 로직을 변경했다면 추가 점검:
- [ ] 한국어 검색어 → 일본어 번역 경로
- [ ] SerpAPI 날짜 필터 포맷 (`filing:YYYYMMDD`)
- [ ] mock fallback 동작 (SERPAPI_API_KEY 없을 때)
- [ ] DeepL 실패 시 상세 페이지가 정상 렌더링되는지
