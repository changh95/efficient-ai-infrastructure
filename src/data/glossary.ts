export interface GlossaryEntry {
  term: string
  def: string
}

export const glossary: GlossaryEntry[] = [
  {
    term: '통합 서빙 (colocation)',
    def: 'Prefill과 Decode를 분리하지 않고 같은 GPU 위에서 함께 돌리는 고전적 서빙 방식. 가중치+KV를 최소한의 노드에 눌러담는 max-fit 구성이 대표적이다 — PD disaggregation의 반대말.',
  },
  {
    term: 'Prefill',
    def: '입력 프롬프트를 처리해 KV 캐시를 만드는 단계. 연산 바운드이며 TTFT를 결정한다. 긴 요청 하나만으로 GPU가 배치 1에서 포화된다.',
  },
  {
    term: 'Decode',
    def: '토큰을 하나씩 생성하는 자기회귀 단계. 매 스텝 전체 KV와 가중치를 읽는 메모리 대역폭 바운드 작업으로, TPOT/TBT를 결정한다. HBM을 포화시키려면 수십~수백 요청의 배칭이 필요하다.',
  },
  {
    term: 'TTFT / TPOT / TBT / ITL',
    def: '첫 토큰까지의 시간 / 출력 토큰당 시간 / 토큰 간 시간 / 토큰 간 지연 (TPOT ≈ TBT ≈ ITL).',
  },
  { term: 'ISL / OSL', def: '입력/출력 시퀀스 길이. 예: "1k/1k", "128K/8K".' },
  {
    term: 'Goodput (굿풋)',
    def: 'SLO를 충족한 요청만 세는 처리량 — PD disaggregation이 최적화하는 진짜 지표.',
  },
  { term: 'TP / DP / EP / PP / SP', def: '텐서 / 데이터 / Expert / 파이프라인 / 시퀀스 병렬화.' },
  {
    term: 'DP attention',
    def: '어텐션 레이어를 데이터 병렬 랭크마다 복제하고(랭크별 자체 KV 보유) MoE 레이어만 EP로 돌리는 구성 — MLA 모델의 표준 Wide-EP Decode 레이아웃.',
  },
  {
    term: 'Wide EP',
    def: '수십~수백 GPU에 걸친 Expert 병렬화. GPU당 Expert 수가 줄어 HBM이 KV 캐시 몫으로 풀린다.',
  },
  {
    term: 'MLA',
    def: 'Multi-head Latent Attention (DeepSeek V3/R1, Kimi K2 계열). 레이어당 576차원 압축 잠재 KV — V3/K2급 기준 BF16에서 토큰당 약 70 KB.',
  },
  { term: 'DSA', def: 'DeepSeek Sparse Attention — GLM-5.x가 쓰는 희소 어텐션 계열(glm_moe_dsa).' },
  {
    term: 'KDA',
    def: 'Kimi Delta Attention — Kimi K3의 하이브리드 선형 어텐션 (선형:풀 어텐션 = 3:1).',
  },
  {
    term: 'MTP',
    def: 'Multi-Token Prediction — 자기 투기적 디코딩. GLM-5.2는 드래프트 5토큰, DeepSeek은 1+ 토큰.',
  },
  { term: 'EAGLE', def: '드래프트 모델 기반 투기적 디코딩 — Dynamo GLM-5 레시피에서 사용.' },
  {
    term: 'Chunked prefill',
    def: '통합 서빙 엔진에서 Prefill을 잘게 쪼개 Decode 스텝 사이에 끼워 넣는 기법 — 간섭을 완화할 뿐 제거하지 못한다.',
  },
  {
    term: 'DeepEP',
    def: 'DeepSeek의 MoE all-to-all 라이브러리. Prefill용 normal 커널(NVLink+RDMA)과 Decode용 low-latency 커널(순수 RDMA/IBGDA)이 별도 계열이다.',
  },
  { term: 'NIXL', def: 'NVIDIA의 KV 전송 라이브러리 — Dynamo와 vLLM PD disaggregation이 사용.' },
  {
    term: 'Mooncake',
    def: 'Moonshot의 KV 캐시 중심 분산 서빙 플랫폼 (Kimi 서빙 · Transfer Engine과 Store는 오픈소스).',
  },
  {
    term: 'PD 비율',
    def: 'Prefill 대 Decode 워커 수(예: 3P:9D). 워크로드에 따라 달라지며, 풀이 분리되어 있어야만 재조정할 수 있다.',
  },
]
