# 사주결

만세력 캡처 이미지를 업로드하면 이미지에서 읽힌 명식을 우선 판독하고, 원국 구조부터 대운·세운까지 12단계 상담 보고서로 생성하는 웹사이트입니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local
npm run local
```

`.env.local`에 OpenAI API 키를 설정합니다.

```env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-5.6-terra
```

## 명령어

- `npm run local` — Windows용 로컬 개발 서버 (권장)
- `npm run dev` — Sites/Vinext 개발 서버
- `npm run build` — 배포 빌드
- `npx tsc --noEmit` — 타입 검사

## 개인정보와 유의사항

- 업로드 이미지는 사이트 데이터베이스에 저장하지 않습니다.
- 이미지는 분석 요청을 위해 OpenAI API로 전송되며, 응답 저장은 비활성화되어 있습니다.
- API 키는 서버 환경 변수로만 관리하고 저장소에 커밋하지 않습니다.
- 사주 해석은 전통 명리학에 따른 참고 자료이며 의료·법률·투자 판단을 대신하지 않습니다.
