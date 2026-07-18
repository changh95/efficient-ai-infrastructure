# 분산 추론 인프라 브리프 — efficient-ai-infrastructure

PD 분리(prefill/decode disaggregation)가 왜 2026년 AI 추론 인프라의 기준인지,
DeepSeek·Kimi·GLM의 실제 프로덕션 배치와 측정된 수치로 논증하는 한국어 단일 페이지 사이트.

- 호스팅: `https://changh95.github.io/efficient-ai-infrastructure`
- 라우팅: `https://www.cv-learn.com/efficient-ai-infrastructure`
- 스택: Vite + React 19 + TypeScript (base: `/efficient-ai-infrastructure/`)

## 개발

```bash
npm install
npm run dev       # 로컬 개발 서버
npm run build     # 타입 체크 + 프로덕션 빌드 → dist/
npm run preview   # 빌드 결과 미리보기
```

QA 스크립트 (로컬 Chrome 필요, `npm run preview`가 떠 있는 상태에서):

```bash
node scripts/check-overflow.mjs          # 360/390/768px 뷰포트 가로 오버플로우 검사
node scripts/shot.mjs 390 mobile.png     # 지정 폭으로 전체 페이지 스크린샷
```

## 배포 (GitHub Pages)

1. GitHub에 `efficient-ai-infrastructure` 저장소를 만들고 `main` 브랜치로 push.
2. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정.
3. push하면 `.github/workflows/deploy.yml`이 자동으로 빌드·배포한다.

경로가 `/efficient-ai-infrastructure/`로 유지되는 한 cv-learn.com 라우팅에도 그대로 동작한다
(`vite.config.ts`의 `base` 참조).

## 콘텐츠 구조

- 콘텐츠의 진실 원천: `info.md`(도시에) + `deployment.md`(구조화 배치 데이터). 사이트의 모든
  수치는 이 두 파일에서 나오며, 페이지의 각 수치에는 출처 각주 링크가 달려 있다.
- `src/data/deployments.ts` — 11개 레퍼런스 배치 + 토폴로지 다이어그램 config
  (모든 GPU/노드를 실제 개수만큼 박스로 렌더링 — `...` 생략 없음)
- `src/data/proofPoints.ts` — 측정된 증거 12건 (스탯 타일)
- `src/components/diagram/` — 토폴로지·max-fit 다이어그램 프리미티브
  (색상 의미론: coral = prefill, teal = decode, gray = 공유 인프라)
- `src/sections/` — 섹션별 컴포넌트 (서사 → 물리학 → 배치 사례 → 증거 → 2026 공식 → 반론 → 출처)

콘텐츠 갱신 시 새 수치는 반드시 `info.md`에 출처와 함께 먼저 추가한 뒤 데이터 파일에 반영할 것.
