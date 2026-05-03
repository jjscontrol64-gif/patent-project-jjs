# JP 특허검색

일본 특허를 한국어로 검색하고 조회하는 Next.js 기반 MVP입니다.  
`/`, `/search`, `/patent/[id]` 화면과 EPO OPS / Papago 연동용 API 라우트를 포함합니다.

## 실행

```bash
npm install
npm run dev
```

## 환경 변수

`.env.local` 파일에 아래 값을 설정하면 실시간 API 연동이 동작합니다.

```env
EPO_OPS_CONSUMER_KEY=
EPO_OPS_CONSUMER_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

키가 없으면 샘플 데이터로 검색/상세 플로우를 검증할 수 있습니다.
