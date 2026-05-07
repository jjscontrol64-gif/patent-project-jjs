# JP 특허검색

일본 특허를 검색하고 조회하는 Next.js 기반 MVP입니다. `/`, `/search`, `/patent/[id]` 화면과 SerpAPI / DeepL 연동용 API 라우트를 포함합니다.

## 실행

```bash
npm install
npm run dev
```

## 환경 변수

프로젝트 루트의 `.env.local` 파일에 아래 값을 설정하면 실시간 API 연동으로 동작합니다.

```env
SERPAPI_API_KEY=
DEEPL_API_KEY=
# Optional: override translate endpoint manually.
# Free plan keys usually end with :fx and are auto-routed to api-free.deepl.com.
DEEPL_API_URL=
```

`SERPAPI_API_KEY`가 없으면 검색과 상세 조회는 샘플 데이터로 대체됩니다.  
`DEEPL_API_KEY`가 없으면 번역은 원문 기준으로 표시됩니다.
