import type { SourceLink } from './deployments'

export interface ProofPoint {
  id: string
  /** 스탯 타일의 헤드라인 수치 */
  headline: string
  claim: string
  scope: string
  source: SourceLink
  /** 수치에 대한 정직한 주의 문구 */
  caveat?: string
}

export const proofPoints: ProofPoint[] = [
  {
    id: 'mooncake-capacity',
    headline: '+59~498%',
    claim: '동일 SLO에서 유효 요청 용량 증가',
    scope: 'Mooncake vs 통합 서빙 기준선 · 실제 Kimi 트레이스',
    source: { label: "Mooncake 논문 (FAST'25)", url: 'https://arxiv.org/abs/2407.00079' },
  },
  {
    id: 'mooncake-longctx',
    headline: '525%',
    claim: '장문 컨텍스트 시나리오 최대 처리량',
    scope: 'Mooncake · 시뮬레이션 · SLO 제약',
    source: { label: 'Mooncake 논문', url: 'https://arxiv.org/abs/2407.00079' },
  },
  {
    id: 'dynamo-same-hw',
    headline: '2.5×',
    claim: 'GPU당 처리량 — 완전히 같은 하드웨어에서',
    scope: 'DeepSeek-R1 671B · GB200 NVL72 · Dynamo 0.4',
    source: {
      label: 'NVIDIA Dynamo 0.4',
      url: 'https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability',
    },
  },
  {
    id: 'dynamo-interactivity',
    headline: '4×',
    claim: '장문 ISL에서 유저당 상호작용성(tok/s/유저) 최대 향상 — 처리량 손실 없음',
    scope: 'gpt-oss-120b · B200 · Dynamo + TRT-LLM',
    source: {
      label: 'NVIDIA Dynamo 0.4',
      url: 'https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability',
    },
  },
  {
    id: 'qwen3-trtllm',
    headline: '1.7~6.11×',
    claim: '통합(colocated) 서빙 대비 속도 향상',
    scope: 'Qwen3 · GB200 · TRT-LLM 벤치마크 (2차 정리 경유)',
    source: {
      label: '벤치마크 정리',
      url: 'https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026',
    },
  },
  {
    id: 'inferencex-wideep',
    headline: '7×',
    claim: 'GPU당 처리량 — PD disaggregation + Wide EP 결합 효과',
    scope: 'GB200 NVL72 · R1-0528 FP4 · 1k/1k · ~50 tok/s/유저 · InferenceX 2026-03',
    source: {
      label: 'Dynamo 1.0 블로그',
      url: 'https://developer.nvidia.com/blog/nvidia-dynamo-1-production-ready/',
    },
  },
  {
    id: 'dynamo-headline-30x',
    headline: '30×',
    claim: 'tok/s/GPU 헤드라인 수치',
    scope: 'R1 · GB200 NVL72 + Dynamo vs Hopper 통합 서빙',
    caveat: '하드웨어 세대를 교차한 비교 — 마케팅 프레이밍에 주의',
    source: { label: 'Dynamo 제품 페이지', url: 'https://developer.nvidia.com/dynamo' },
  },
  {
    id: 'llama70b-hopper',
    headline: '>2×',
    claim: '처리량 — 밀집(dense) 모델에서도 성립',
    scope: 'Llama 70B · Hopper · PD disaggregation',
    source: { label: 'Dynamo 제품 페이지', url: 'https://developer.nvidia.com/dynamo' },
  },
  {
    id: 'llmd-default',
    headline: '+25%',
    claim: '무튜닝 기본 설정만으로 +25% · v0.4에서 출력 토큰당 지연 −40%',
    scope: 'llm-d (CNCF, 2026-03 기부) · Kubernetes/vLLM · DeepSeek V3.1 · H200',
    source: {
      label: 'llm-d 릴리스 정리',
      url: 'https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026',
    },
  },
  {
    id: 'sglang-cost',
    headline: '$0.20',
    claim: '출력 100만 토큰당 비용 — 당시 공식 API의 약 1/5',
    scope: 'DeepSeek-R1 · 임대 H100 96장 · SGLang PD + Wide EP',
    source: { label: 'LMSYS 블로그', url: 'https://www.lmsys.org/blog/2025-05-05-large-scale-ep/' },
  },
  {
    id: 'distserve',
    headline: '4.48×',
    claim: '굿풋(goodput) — 또는 10.25× 더 엄격한 SLO 충족',
    scope: "DistServe (OSDI'24) · MoE 이전 시대의 학술적 원점",
    source: { label: 'DistServe', url: 'https://arxiv.org/abs/2401.09670' },
  },
  {
    id: 'inferencex-fabric',
    headline: '4.39×',
    claim: '양쪽 다 PD disaggregation일 때는 패브릭이 승부를 가른다 — 4,130 vs 941 tok/s/GPU',
    scope: 'GB200 NVL72 vs B200 · R1-0528 FP4 · 1k/1k · 125 tok/s/유저 · InferenceX 2026-05',
    source: {
      label: 'InferenceX',
      url: 'https://inferencex.semianalysis.com/blog/gb200-nvl72-vs-b200-disagg-deepseek-r1-fp4-dynamo-trt',
    },
  },
]
