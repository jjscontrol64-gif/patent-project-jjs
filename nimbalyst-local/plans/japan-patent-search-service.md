---
planStatus:
  planId: plan-japan-patent-search-service
  title: 일본 특허 검색 서비스
  status: draft
  planType: system-design
  priority: high
  owner: Director
  stakeholders: []
  tags: ["patent", "api-integration", "nextjs", "epo-ops", "papago"]
  created: "2026-05-03"
  updated: "2026-05-03T10:00:00.000Z"
  progress: 10
---

# 일본 특허 검색 서비스

## 1. 프로젝트 개요

일본 특허 데이터를 한국어로 검색·조회할 수 있는 웹 서비스.  
EPO Open Patent Services(OPS) API를 통해 일본 특허를 검색하고, Papago API로 결과를 한국어로 번역하여 제공한다.  
초기에는 개인용으로 시작하되, 이후 공개 서비스로 전환할 수 있도록 아키텍처를 설계한다.

---

## 2. 목표

| 목표 | 상세 |
|------|------|
| **핵심 기능** | 일본 특허 키워드 검색 → 결과를 한국어로 번역하여 표시 |
| **UX** | 비전문가도 직관적으로 쓸 수 있는 단순한 인터페이스 |
| **확장성** | 개인용 → 공개 서비스 전환 시 인증/과금 레이어를 자연스럽게 추가 가능 |
| **비용** | 무료 API 티어 안에서 운영 가능 (개인용 기준) |

---

## 3. 핵심 기능 (MVP)

### 3-1. 검색

| 기능 | 설명 |
|------|------|
| 키워드 검색 | 제목·요약에서 키워드로 검색 |
| 특허번호 검색 | JP 특허번호로 직접 조회 |
| 날짜 범위 필터 | 출원일/공개일 기준 기간 필터 |
| IPC 분류 필터 | 국제특허분류(IPC) 코드로 필터 |

### 3-2. 검색 결과

| 기능 | 설명 |
|------|------|
| 목록 표시 | 특허번호, 제목(한국어), 출원인, 출원일 |
| 페이지네이션 | 페이지당 10~20건, 다음 페이지 이동 |
| 번역 토글 | 원문(일본어) ↔ 번역(한국어) 전환 |

### 3-3. 상세 조회

| 기능 | 설명 |
|------|------|
| 서지 정보 | 특허번호, 출원인, 발명자, 출원일, 공개일, IPC |
| 제목 번역 | 일본어 원문 + 한국어 번역 |
| 요약 번역 | 일본어 원문 + 한국어 번역 |
| 원문 링크 | J-PlatPat 또는 Espacenet 원문 페이지 바로가기 |

---

## 4. 기술 스택

| 레이어 | 기술 | 이유 |
|--------|------|------|
| 프레임워크 | Next.js 14+ (App Router) | SSR + API Routes 통합, 추후 배포 용이 |
| 언어 | TypeScript | 타입 안전성, 유지보수성 |
| 스타일 | Tailwind CSS | 빠른 UI 구현 |
| 특허 API | EPO Open Patent Services (OPS) | 무료, 일본 특허 포함, OAuth 2.0 |
| 번역 API | Papago (Naver Cloud Platform) | 일→한 번역 최적화, 무료 티어 |
| 배포 (초기) | Vercel | Next.js 최적화, 개인용 무료 |
| 환경 변수 | `.env.local` | API 키 관리 |

---

## 5. 아키텍처

```
[브라우저 (Next.js Client)]
        ↕ fetch
[Next.js API Routes (서버)]
    ├── /api/patents/search   → EPO OPS API 호출
    ├── /api/patents/[id]     → EPO OPS API 상세 조회
    └── /api/translate        → Papago API 호출
        ↕
[외부 API]
    ├── EPO OPS (https://ops.epo.org)
    └── Papago (https://openapi.naver.com)
```

**왜 API Routes를 쓰는가:**  
EPO OPS와 Papago 모두 API 키를 서버 사이드에서만 사용해야 한다. 브라우저에서 직접 호출하면 키가 노출된다.

---

## 6. EPO OPS API 연동 계획

### 인증
- OAuth 2.0 Client Credentials Flow
- Consumer Key + Consumer Secret → Access Token 발급
- Token은 20분 유효 → 서버에서 캐싱하여 재사용

### 주요 엔드포인트

| 기능 | EPO OPS 엔드포인트 |
|------|--------------------|
| 특허 검색 | `GET /3.2/rest-services/published-data/search` |
| 서지 정보 | `GET /3.2/rest-services/published-data/publication/docdb/{doc-id}/biblio` |
| 요약 | `GET /3.2/rest-services/published-data/publication/docdb/{doc-id}/abstract` |

### 검색 쿼리 예시
```
# 키워드 검색 (일본 특허만)
ct=JP AND ti="battery" AND pd within "20230101,20241231"

# IPC 분류
ct=JP AND ipc=H01M10
```

### 제한 사항
- 무료 등록 계정: 주 4GB 데이터 전송
- 분당 30회 요청 제한
- 응답 형식: XML (JSON 파싱 필요)

---

## 7. Papago API 연동 계획

### 인증
- Naver Cloud Platform 가입 후 Client ID + Client Secret 발급

### 요청 방식
```
POST https://openapi.naver.com/v1/papago/n2mt
Headers:
  X-Naver-Client-Id: {CLIENT_ID}
  X-Naver-Client-Secret: {CLIENT_SECRET}
Body:
  source=ja&target=ko&text={번역할텍스트}
```

### 번역 대상 ✅ 확정
- 특허 제목 (title) — 검색 목록 + 상세 페이지
- 요약 (abstract) — 상세 페이지

### 제한 사항
- 무료 티어: 월 10,000 글자
- 1회 요청당 최대 5,000자

### 비용 최적화 전략
- MVP 단계: 캐싱 없이 시작 (추후 Phase 2에서 Redis 도입)
- 목록에서는 제목만 번역, 상세 페이지 진입 시 요약 번역

---

## 8. 데이터 플로우

### 검색 플로우
```
1. 사용자 → 검색어 입력
2. Client → GET /api/patents/search?q=...
3. API Route → EPO OPS 검색 요청 (XML 응답)
4. API Route → XML 파싱 → 특허 목록 추출
5. API Route → 제목 배열 → Papago 번역 요청
6. API Route → 번역된 제목 + 서지 정보 조합 → JSON 반환
7. Client → 검색 결과 렌더링
```

### 상세 조회 플로우
```
1. 사용자 → 특허 클릭
2. Client → GET /api/patents/{id}
3. API Route → EPO OPS 상세 요청 (biblio + abstract)
4. API Route → Papago로 제목 + 요약 번역
5. API Route → 전체 데이터 조합 → JSON 반환
6. Client → 상세 페이지 렌더링
```

---

## 9. UI 목업

| 화면 | 파일 |
|------|------|
| 전체 (탭 탐색) | `nimbalyst-local/mockups/japan-patent-search.mockup.html` |
| ① 메인 검색 페이지 | `nimbalyst-local/mockups/japan-patent-search.mockup.html` (탭 ①) |
| ② 검색 결과 목록 | `nimbalyst-local/mockups/screen2-search-results.mockup.html` |
| ③ 특허 상세 페이지 | `nimbalyst-local/mockups/screen3-patent-detail.mockup.html` |

---

## 10. 페이지 구성 (라우팅)

| 경로 | 설명 |
|------|------|
| `/` | 메인 검색 페이지 |
| `/search?q=...` | 검색 결과 목록 |
| `/patent/[id]` | 특허 상세 페이지 |

---

## 10. 개인용 → 공개 서비스 전환 로드맵

### Phase 1 — 개인용 MVP
- EPO OPS + Papago 연동
- 기본 검색·상세 조회 기능
- Vercel 배포
- 인증 없음 (직접 URL 접근)

### Phase 2 — 공개 서비스 전환
- 사용자 인증 (NextAuth.js + Google OAuth)
- 사용량 제한 (Rate Limiting per user)
- 번역 캐싱 (Vercel KV 또는 Redis)
- API 키를 환경별로 분리 (개인용 vs 공개용 쿼터 관리)
- 유료 API 티어 전환 고려 (Papago Pro)

### Phase 3 — 고도화 (선택)
- 검색 이력 저장
- 즐겨찾기 / 컬렉션
- PDF 내보내기
- Claude API를 통한 특허 분석·요약 기능

---

## 11. 환경 변수 구조

```env
# EPO OPS
EPO_OPS_CONSUMER_KEY=
EPO_OPS_CONSUMER_SECRET=

# Papago
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

---

## 12. 결정 사항 ✅

| # | 이슈 | 결정 |
|---|------|------|
| 1 | 번역 범위 | **제목 + 요약** |
| 2 | 검색 범위 | **일본 특허(JP)만** |
| 3 | UI 스타일 | **심플 검색창 (구글 스타일)** |
| 4 | 캐싱 전략 | **캐싱 없이 시작** (Phase 2에서 도입) |

---

## 13. DoD (완료 기준)

### 기획 완료 조건
- [x] 오픈 이슈 전항목 Director 결정 완료
- [x] UI 목업 작성 완료 → Director 승인 대기
- [x] 기술 스택 최종 확정

### 개발 완료 조건 (추후 구체화)
- [ ] EPO OPS 검색 API 연동 동작 확인
- [ ] Papago 번역 연동 동작 확인
- [ ] 검색 → 결과 → 상세 페이지 플로우 e2e 동작
- [ ] 빌드/타입체크 통과
- [ ] Vercel 배포 성공
