import type { DiagramConfig } from '../components/diagram/Topology'
import type { MaxFitSpec } from '../components/diagram/MaxFit'

export type Family = 'deepseek' | 'kimi' | 'glm'
export type Confidence = 'primary' | 'reproduction' | 'benchmark' | 'reported' | 'internal'

export interface SourceLink {
  label: string
  url: string
}

/** 4대 핵심 지표 — 소스가 침묵하면 '미공개', 산술 도출은 '(산술)' 표기 */
export interface DeploymentMetrics {
  /** 1M 토큰당 비용 */
  cost: string
  /** Decode tok/s/유저 */
  tsu: string
  /** GPU당 tok/s */
  tpg: string
  /** Batch size / 동시성 */
  batch: string
}

export interface Deployment {
  id: string
  family: Family
  model: string
  operator: string
  confidence: Confidence
  hardware: string
  workload?: string
  specs: { label: string; value: string }[]
  perf: { label: string; value: string }[]
  metrics?: DeploymentMetrics
  /** 이 배치가 논증에서 갖는 의미 — 카드 한 줄 결론 */
  argument: string
  sources: SourceLink[]
  diagrams?: { title?: string; config: DiagramConfig }[]
  maxfits?: { title?: string; spec: MaxFitSpec }[]
}

export const FAMILY_LABEL: Record<Family, string> = {
  deepseek: 'DeepSeek',
  kimi: 'Kimi · Moonshot',
  glm: 'GLM · Z.ai',
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  primary: '1차 자료',
  reproduction: '오픈 재현',
  benchmark: '벤치마크',
  reported: '보도 기반',
  internal: '사내 실측',
}

/** DeepSeek 공식 프로덕션 토폴로지 — 히어로의 "after" 그림으로도 사용 */
export const deepseekOfficialDiagram: DiagramConfig = {
  pools: [
    {
      role: 'prefill',
      title: 'Prefill 최소 유닛',
      subtitle: 'Attention TP4+SP · DP8 · MoE EP32',
      groups: [{ count: 4, gpusPerNode: 8, nodeLabel: '8× H800' }],
      footer: '4 노드 · 32× H800',
      grow: 1,
    },
    {
      role: 'decode',
      title: 'Decode 인스턴스',
      subtitle: 'Attention TP4+SP · DP80 · MoE EP320 — GPU당 ~1 Expert',
      groups: [{ count: 40, gpusPerNode: 8 }],
      footer: '40 노드 · 320× H800',
      grow: 2.6,
    },
  ],
  arrow: { label: 'KV 전달 (InfiniBand)' },
  bottomLine:
    'Decode 인스턴스(320 GPU)는 Prefill 유닛(32 GPU)의 10배 — 병렬화 구성도, 통신 커널도 페이즈마다 다르다.',
}

export const deployments: Deployment[] = [
  {
    id: 'deepseek-v3-official-h800',
    family: 'deepseek',
    model: 'DeepSeek-V3 / R1',
    operator: 'DeepSeek 자체 프로덕션',
    confidence: 'primary',
    hardware: 'H800 · 노드 내 NVLink · 노드 간 InfiniBand',
    specs: [
      { label: '모델', value: '671B 총 파라미터 · 37B 활성 · MLA' },
      {
        label: 'Prefill',
        value: 'Attention TP4+SP · DP8 · MoE EP32 · 핫 Expert 중복 배치 · 마이크로배치 2개 오버랩',
      },
      {
        label: 'Decode',
        value: 'Attention TP4+SP · DP80 · MoE EP320 (GPU당 ~1 Expert) · IBGDA 점대점 all-to-all',
      },
      { label: 'KV 전달', value: 'InfiniBand 비동기 전송' },
    ],
    perf: [
      { label: 'Prefill', value: '~73.7k input tok/s / H800 노드' },
      { label: 'Decode', value: '~14.8k output tok/s / H800 노드' },
      { label: 'KV 캐시 적중률', value: '~56% · GPU 비용 ~$87k/일 vs 이론 매출 ~$562k/일' },
    ],
    metrics: {
      cost: '출력 기준 ≈ $0.52/M (산술)',
      tsu: '20–22 tok/s (batch 미공개) — 프로덕션 평균',
      tpg: 'Decode ~1,850 · Prefill ~9,200 tok/s (산술)',
      batch: '미공개',
    },
    argument:
      'Decode:Prefill GPU 비율 10:1, 페이즈마다 다른 병렬화·커널 — 통합 서빙으로는 표현 자체가 불가능한 구성.',
    sources: [
      { label: 'DeepSeek-V3 기술 보고서 §3.4', url: 'https://arxiv.org/pdf/2412.19437' },
      {
        label: 'open-infra day-6 (추론 시스템 개요)',
        url: 'https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md',
      },
      { label: 'Step-3 논문 (교차 확인)', url: 'https://arxiv.org/pdf/2507.19427' },
    ],
    diagrams: [{ config: deepseekOfficialDiagram }],
  },
  {
    id: 'deepseek-r1-sglang-96xh100',
    family: 'deepseek',
    model: 'DeepSeek-R1',
    operator: 'SGLang 팀 오픈 재현 (Atlas Cloud)',
    confidence: 'reproduction',
    hardware: '96× H100 · 12 노드 · RDMA',
    workload: '2,000 토큰 ISL',
    specs: [
      { label: 'Prefill', value: 'DP attention + 대규모 EP · DeepEP normal dispatch · DeepGEMM' },
      {
        label: 'Decode',
        value: 'DP attention + Wide EP · DeepEP low-latency dispatch · EPLB 부하 균형 · 2-batch 오버랩',
      },
      { label: 'KV 전달', value: 'RDMA' },
    ],
    perf: [
      { label: 'Prefill', value: '52.3k input tok/s / 노드' },
      { label: 'Decode', value: '22.3k output tok/s / 노드' },
      { label: '비용', value: '출력 100만 토큰당 ≈ $0.20 (당시 공식 API의 ~1/5)' },
    ],
    metrics: {
      cost: '$0.20/M 출력',
      tsu: '~10 tok/s (노드당 batch=256) — ITL ~100ms에서 산술',
      tpg: 'Decode ~2,787 · Prefill ~6,538 tok/s (산술)',
      batch: 'Decode 노드당 batch=256',
    },
    argument:
      'DeepEP의 normal(Prefill)·low-latency(Decode) 커널은 한 통신 그룹에 공존할 수 없다 — PD disaggregation이 곧 두 커널을 동시에 쓰는 유일한 방법.',
    sources: [
      { label: 'LMSYS 블로그', url: 'https://www.lmsys.org/blog/2025-05-05-large-scale-ep/' },
      {
        label: '2차 정리',
        url: 'https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026',
      },
    ],
    diagrams: [
      {
        config: {
          router: 'Router / Load Balancer',
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — 3 노드',
              subtitle: 'DeepEP normal dispatch',
              groups: [{ count: 3, gpusPerNode: 8, nodeLabel: '8× H100' }],
              stats: ['52.3k input tok/s / 노드'],
              footer: '3 노드 · 24× H100',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode — 9 노드',
              subtitle: 'DeepEP low-latency dispatch · EPLB',
              groups: [{ count: 9, gpusPerNode: 8, nodeLabel: '8× H100' }],
              stats: ['22.3k output tok/s / 노드'],
              footer: '9 노드 · 72× H100',
              grow: 2.2,
            },
          ],
          arrow: { label: 'KV (RDMA)' },
          bottomLine: '1P:3D 노드 비율 @ 2k ISL · 출력 100만 토큰당 ≈ $0.20',
        },
      },
    ],
  },
  {
    id: 'deepseek-r1-gb300-longctx',
    family: 'deepseek',
    model: 'DeepSeek-R1 (NVFP4)',
    operator: 'SGLang 팀 벤치마크',
    confidence: 'benchmark',
    hardware: 'GB300 NVL72 · NVLink 5 랙 스케일 도메인',
    workload: '128K 입력 / 8K 출력 — 문서·에이전트 구간 (Prefill 지배적)',
    specs: [
      { label: 'Prefill', value: '청크드 PP — PP4/TP1 워커(4 GPU) × 3~8개, 구성에 따라 12–32 GPU' },
      { label: 'Decode', value: '단일 워커 DEP8/16/32 — TP=DP=EP + DP attention · MTP 런은 같은 토폴로지에 EAGLE' },
      { label: '구성 스윕', value: '12P+8D(=20 GPU, 헤드라인) · 20P+16D(=36) · 32P+32D(=64)' },
      { label: 'KV 전달', value: 'NVLink 패브릭 (MNNVL)' },
    ],
    perf: [
      { label: '처리량', value: '최대 226 tok/s/GPU (GB200 대비 1.53×)' },
      { label: 'MTP 효과', value: '유저당 tok/s 최대 1.87×' },
    ],
    metrics: {
      cost: '150 t/s/u 기준 MTP off ~$2.35/M → MTP on ~$0.11/M (InferenceX · 8k/1k)',
      tsu: '23 tok/s (MTP off) · 43 (MTP on) — 최대 처리량 지점',
      tpg: '226.2 tok/s (MTP 시 224.2)',
      batch: 'DEP16 기준 batch=576 (GPU당 ~36)',
    },
    argument:
      '워크로드가 길어지면 P:D 균형이 Prefill 쪽으로 뒤집힌다 — 풀이 분리되어 있어야만 재조정이 가능하다.',
    sources: [
      { label: 'LMSYS GB300 블로그', url: 'https://www.lmsys.org/blog/2026-02-19-gb300-longctx/' },
      { label: '재현 레시피 (sglang #18703)', url: 'https://github.com/sgl-project/sglang/issues/18703' },
      {
        label: 'InferenceX v2',
        url: 'https://inferencex.semianalysis.com/blog/inferencex-v2-nvidia-blackwell-vs-amd-vs-hopper',
      },
    ],
    diagrams: [
      {
        title: '최대 처리량 구성 (DEP8) — 226 tok/s/GPU의 실제 토폴로지',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — PP4 워커 × 3',
              subtitle: '청크드 PP · 워커당 PP4/TP1',
              groups: [{ count: 3, gpusPerNode: 4, nodeLabel: 'PP4 · 4× GB300' }],
              footer: '3 워커 · 12 GPU',
              grow: 1.3,
            },
            {
              role: 'decode',
              title: 'Decode — DEP8 워커 1개',
              subtitle: 'TP8 · DP8 · EP8 + DP attention',
              groups: [{ count: 2, gpusPerNode: 4, nodeLabel: '4× GB300' }],
              stats: ['226.2 tok/s/GPU'],
              footer: '1 워커 · 8 GPU',
              grow: 1,
            },
          ],
          arrow: { label: 'KV (NVLink)' },
          bottomLine: '총 20 GPU · 12P:8D — 128K ISL에선 Prefill이 다수가 된다',
        },
      },
      {
        title: '최대 스윕 구성 (DEP32)',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — PP4 워커 × 8',
              groups: [{ count: 8, gpusPerNode: 4, nodeLabel: 'PP4 · 4× GB300' }],
              footer: '8 워커 · 32 GPU',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode — DEP32 워커 1개',
              subtitle: 'TP32 · DP32 · EP32 + DP attention',
              groups: [{ count: 8, gpusPerNode: 4, nodeLabel: '4× GB300' }],
              footer: '1 워커 · 32 GPU',
              grow: 1,
            },
          ],
          arrow: { label: 'KV (NVLink)' },
          bottomLine: '총 64 GPU — NVL72 랙(72 GPU) 하나에 들어가는 규모 (단일 랙 여부는 출처 미명시)',
        },
      },
    ],
  },
  {
    id: 'deepseek-v4pro-inferencex-nvl72',
    family: 'deepseek',
    model: 'DeepSeek-V4-Pro',
    operator: 'InferenceX 벤치마크 (Dynamo + vLLM)',
    confidence: 'benchmark',
    hardware: 'GB300 NVL72 vs GB200 NVL72 (랙 대 랙)',
    workload: '8K 입력 / 1K 출력 · FP4 · 투기적 디코딩 없음',
    specs: [
      { label: '모델', value: '1.6T 총 파라미터 · 49B 활성 · DSA · 토큰당 라우팅 Expert 6/384 + 공유 1' },
      { label: '구조', value: '양쪽 랙 모두 PD disaggregation · 운영 지점마다 P:D 분할이 다르다' },
      { label: 'GB300 승부처', value: 'Prefill 28 GPU (TP8) + Decode 32 GPU (EP16) — GB200에는 등가 레시피가 없다' },
      { label: 'GB300 피크', value: 'Prefill 24 GPU (TP8) + Decode 8 GPU (EP8)' },
      { label: 'HBM', value: 'GB300 288 GB/GPU vs GB200 192 GB — 대역폭·NVLink·월드 크기는 동일' },
    ],
    perf: [
      { label: '등속 비교', value: '27 t/s/u에서 GB300 6,182 vs GB200 2,189 tok/s/GPU — 2.83× (perf/$ 2.31×, TCO 프리미엄 20% 반영)' },
    ],
    metrics: {
      cost: 'GB300: $0.11/M (batch=3,072) · $0.07 (batch=4,096)\nGB200: $0.10 (batch=512) · $0.07 (batch=4,096)',
      tsu: 'GB300: 25.9 (batch=3,072) · 13.1 (batch=4,096)\nGB200: 21.3 (batch=512) · 15.3 (batch=4,096)',
      tpg: 'GB300: 6,812 (batch=3,072) · 11,056 (batch=4,096)\nGB200: 5,336 (batch=512) · 8,933 (batch=4,096)',
      batch: 'batch 1–4,096 스윕',
    },
    argument:
      'GB300의 +50% HBM은 GB200에 존재하지 않는 레시피(28P+32D EP16)를 잠금해제한다 — 메모리 헤드룸은 연속적인 손잡이가 아니라 이산적인 잠금해제이고, 그 차이가 스펙 비율(1.5×)을 넘는 2.83×를 만든다.',
    sources: [
      {
        label: 'InferenceX V4-Pro',
        url: 'https://inferencex.semianalysis.com/blog/gb300-nvl72-vs-gb200-nvl72-dsv4-pro-vllm-fp4',
      },
    ],
    diagrams: [
      {
        title: 'GB300 NVL72 — 중간 곡선의 승부처 (batch=3,072)',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 풀 — TP8',
              groups: [{ count: 1, gpusPerNode: 28, nodeLabel: '28× GB300' }],
              footer: '28 GPU',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode 풀 — EP16',
              groups: [{ count: 1, gpusPerNode: 32, nodeLabel: '32× GB300' }],
              stats: ['6,812 tok/s/GPU · 25.9 t/s/u · $0.11/M'],
              footer: '32 GPU',
              grow: 1.15,
            },
          ],
          arrow: { label: 'KV (랙 내 NVLink)' },
          bottomLine: '72 GPU 중 60개 사용 — GB200에는 이 지점의 등가 레시피가 없다',
        },
      },
      {
        title: 'GB200 NVL72 — 같은 인터랙티비티 구간의 최선 (batch=512)',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 풀 — TP8',
              groups: [{ count: 1, gpusPerNode: 8, nodeLabel: '8× GB200' }],
              footer: '8 GPU',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode 풀 — EP1',
              groups: [{ count: 1, gpusPerNode: 32, nodeLabel: '32× GB200' }],
              stats: ['2,005 tok/s/GPU · 28.3 t/s/u · $0.31/M'],
              footer: '32 GPU',
              grow: 1.15,
            },
          ],
          arrow: { label: 'KV (랙 내 NVLink)' },
          bottomLine:
            'HBM 헤드룸이 모자라 EP16 레시피가 성립하지 않는다 — 같은 구간에서 GB300(6,812)의 ~1/3',
        },
      },
      {
        title: 'GB300 NVL72 — 피크 처리량 (batch=4,096)',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 풀 — TP8',
              groups: [{ count: 1, gpusPerNode: 24, nodeLabel: '24× GB300' }],
              footer: '24 GPU',
              grow: 1.5,
            },
            {
              role: 'decode',
              title: 'Decode 풀 — EP8',
              groups: [{ count: 1, gpusPerNode: 8, nodeLabel: '8× GB300' }],
              stats: ['11,056 tok/s/GPU · 13.1 t/s/u · $0.07/M'],
              footer: '8 GPU',
              grow: 1,
            },
          ],
          arrow: { label: 'KV (랙 내 NVLink)' },
          bottomLine: '고동시성에서는 P:D가 24P:8D로 뒤집힌다 — 비율은 워크로드의 함수다',
        },
      },
      {
        title: 'GB200 NVL72 — 피크 처리량 (batch=4,096)',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 풀 — TP8',
              groups: [{ count: 1, gpusPerNode: 24, nodeLabel: '24× GB200' }],
              footer: '24 GPU',
              grow: 1.5,
            },
            {
              role: 'decode',
              title: 'Decode 풀 — EP8',
              groups: [{ count: 1, gpusPerNode: 8, nodeLabel: '8× GB200' }],
              stats: ['8,933 tok/s/GPU · 15.3 t/s/u · $0.07/M'],
              footer: '8 GPU',
              grow: 1,
            },
          ],
          arrow: { label: 'KV (랙 내 NVLink)' },
          bottomLine: '피크에서는 격차가 1.24×로 줄어든다 — 승부는 피크가 아니라 중간 곡선에서 갈린다',
        },
      },
    ],
  },
  {
    id: 'deepseek-r1-dynamo-gb200-wideep',
    family: 'deepseek',
    model: 'DeepSeek-R1',
    operator: 'NVIDIA Dynamo 레시피 (TensorRT-LLM)',
    confidence: 'primary',
    hardware: '36× GB200 · 9 노드 (노드당 4 GPU)',
    specs: [
      { label: '패턴', value: 'Disaggregated WideEP' },
      { label: '구성', value: 'Prefill 1 노드 + Decode 8 노드' },
      { label: 'KV 전달', value: 'NIXL' },
    ],
    perf: [],
    metrics: {
      cost: '$10.12/M (batch=4) · $3.72 (batch=12)\n$1.69 (batch=48) · $0.53 (batch=180)\nInferenceX — 같은 구성 실측 · 1k/1k · MTP',
      tsu: '286 tok/s (batch=4) · 257 (batch=12)\n207 (batch=48) · 164 (batch=180)',
      tpg: '60.7 (batch=4) · 165 (batch=12)\n363 (batch=48) · 1,149 (batch=180)',
      batch: 'batch 4–180 스윕 · 랙 재구성 시 최대 batch=16,130',
    },
    argument: 'NVIDIA의 공식 레시피 자체가 1P:8D 노드 비대칭 — 벤더 레퍼런스가 이미 PD disaggregation이다.',
    sources: [
      { label: 'Dynamo recipes', url: 'https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md' },
      {
        label: 'InferenceX 실측',
        url: 'https://inferencex.semianalysis.com/blog/gb200-nvl72-vs-b200-disagg-deepseek-r1-fp4-dynamo-trt',
      },
    ],
    diagrams: [
      {
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — 1 노드',
              groups: [{ count: 1, gpusPerNode: 4, nodeLabel: '4× GB200' }],
              footer: '1 노드 · 4 GPU',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode — 8 노드 (WideEP)',
              groups: [{ count: 8, gpusPerNode: 4, nodeLabel: '4× GB200' }],
              footer: '8 노드 · 32 GPU',
              grow: 2.4,
            },
          ],
          arrow: { label: 'KV (NIXL)' },
          bottomLine: '36× GB200 · Prefill 1 노드 : Decode 8 노드',
        },
      },
    ],
  },
  {
    id: 'deepseek-r1-dynamo-h200-variants',
    family: 'deepseek',
    model: 'DeepSeek-R1',
    operator: 'NVIDIA Dynamo 레시피 (SGLang / vLLM)',
    confidence: 'primary',
    hardware: 'H200 · 16× 또는 32× 변형',
    specs: [
      { label: '16× H200', value: 'SGLang Disagg WideEP · TP8 · 단일 노드 워커 1P + 1D' },
      { label: '32× H200', value: 'SGLang Disagg WideEP · TP16 · 2노드 워커 1P + 1D' },
      { label: '32× H200 (vLLM)', value: 'vLLM Disagg DEP16 · 멀티노드 데이터-Expert 병렬' },
    ],
    perf: [],
    metrics: {
      cost: '미공개',
      tsu: '미공개',
      tpg: '미공개',
      batch: '미공개',
    },
    argument: '같은 모델, 다른 규모 — 어느 스케일에서든 레퍼런스는 PD disaggregation으로 출발한다.',
    sources: [
      { label: 'Dynamo recipes', url: 'https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md' },
    ],
    diagrams: [
      {
        title: 'SGLang · 16× H200 · TP8',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 워커 (TP8)',
              groups: [{ count: 1, gpusPerNode: 8, nodeLabel: '8× H200' }],
              footer: '1 노드 · 8 GPU',
            },
            {
              role: 'decode',
              title: 'Decode 워커 (TP8)',
              groups: [{ count: 1, gpusPerNode: 8, nodeLabel: '8× H200' }],
              footer: '1 노드 · 8 GPU',
            },
          ],
          arrow: { label: 'KV (NIXL)' },
        },
      },
      {
        title: 'SGLang · 32× H200 · TP16 멀티노드',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 워커 (TP16)',
              groups: [{ count: 2, gpusPerNode: 8, nodeLabel: '8× H200' }],
              footer: '워커 1개 = 2 노드 · 16 GPU',
            },
            {
              role: 'decode',
              title: 'Decode 워커 (TP16)',
              groups: [{ count: 2, gpusPerNode: 8, nodeLabel: '8× H200' }],
              footer: '워커 1개 = 2 노드 · 16 GPU',
            },
          ],
          arrow: { label: 'KV (NIXL)' },
        },
      },
      {
        title: 'vLLM · 32× H200 · DEP16',
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill (DEP16)',
              groups: [{ count: 2, gpusPerNode: 8, nodeLabel: '8× H200' }],
              footer: '16 GPU · 데이터-Expert 병렬',
            },
            {
              role: 'decode',
              title: 'Decode (DEP16)',
              groups: [{ count: 2, gpusPerNode: 8, nodeLabel: '8× H200' }],
              footer: '16 GPU · 데이터-Expert 병렬',
            },
          ],
          arrow: { label: 'KV (NIXL)' },
          note: 'DEP16 = 워커당 16 GPU 해석 (레시피 총 32 GPU 기준).',
        },
      },
    ],
  },
  {
    id: 'deepseek-v4-flash-ascend-1m',
    family: 'deepseek',
    model: 'DeepSeek-V4-Flash',
    operator: 'vLLM-Ascend 공식 레시피',
    confidence: 'primary',
    hardware: 'Huawei Atlas 800 (노드당 8 NPU)',
    workload: '1M 토큰 초장문 시퀀스',
    specs: [
      { label: '구성', value: '1×4P–1×4D: 4노드 Prefill 인스턴스 1개 + 4노드 Decode 인스턴스 1개' },
      { label: '병렬화', value: 'DP4 × TP8 (인스턴스당)' },
      { label: 'KV 전달', value: 'DeepSeek PD disaggregation 레퍼런스를 본뜬 PD 프록시' },
    ],
    perf: [],
    metrics: {
      cost: '미공개',
      tsu: '미공개',
      tpg: '미공개',
      batch: '미공개',
    },
    argument:
      'NVIDIA가 아닌 스택도 1M 컨텍스트는 더 큰 단일 노드가 아니라 P:D 비율과 병렬화 튜닝으로 도달한다.',
    sources: [
      {
        label: 'vLLM-Ascend 문서',
        url: 'https://docs.vllm.ai/projects/ascend/en/v0.18.0/tutorials/models/DeepSeek-V4-Flash.html',
      },
    ],
    diagrams: [
      {
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 인스턴스 (DP4×TP8)',
              groups: [{ count: 4, gpusPerNode: 8, nodeLabel: 'Atlas 800 · 8 NPU' }],
              footer: '4 노드 · 32 NPU',
            },
            {
              role: 'decode',
              title: 'Decode 인스턴스 (DP4×TP8)',
              groups: [{ count: 4, gpusPerNode: 8, nodeLabel: 'Atlas 800 · 8 NPU' }],
              footer: '4 노드 · 32 NPU',
            },
          ],
          arrow: { label: 'KV (PD 프록시)' },
          bottomLine: '1M 토큰 시나리오 · 1×4P–1×4D · DP4TP8',
          note: '인스턴스당 NPU 수(32)는 DP4×TP8 산술로 도출 — 문서의 장비 목록은 Atlas 800(노드당 8 NPU)이며, 총 NPU 개수의 명시는 없음.',
        },
      },
    ],
  },
  {
    id: 'deepseek-r1-tt-galaxy',
    family: 'deepseek',
    model: 'DeepSeek-R1',
    operator: 'Tenstorrent (Blackhole Galaxy)',
    confidence: 'internal',
    hardware: 'Galaxy 서버 17대 — 서버당 32× Blackhole · 1 TB GDDR6 @ 16 TB/s',
    workload: '풀 모델 컨텍스트(128K) · batch=64',
    specs: [
      { label: 'Prefill', value: 'Galaxy 1대 (32× Blackhole)' },
      { label: 'Decode', value: 'Galaxy 16대 (512× Blackhole)' },
      {
        label: '패브릭',
        value: 'ASIC당 10× 400 GbE 내장 Ethernet · 스케일아웃 800 GbE — NVLink 없는 스케일아웃',
      },
    ],
    perf: [{ label: 'Decode', value: '500 tok/s/유저 @ batch=64 (풀 컨텍스트)' }],
    metrics: {
      cost: '미공개',
      tsu: '500 tok/s (batch=64) — 풀 컨텍스트(128K)',
      tpg: 'Decode ASIC당 ~62.5 out tok/s (64 × 500 ÷ 512 — 산술)',
      batch: 'batch=64',
    },
    argument:
      'PD disaggregation은 특정 벤더의 기능이 아니라 아키텍처 원칙이다 — Ethernet 네이티브 패브릭의 Galaxy에서도 1P:16D 분리 서빙이 같은 원리로 성립한다.',
    sources: [{ label: 'Tenstorrent Galaxy', url: 'https://tenstorrent.com/hardware/galaxy' }],
    diagrams: [
      {
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — Galaxy 1대',
              groups: [{ count: 1, gpusPerNode: 32, nodeLabel: 'Galaxy · 32× Blackhole' }],
              footer: '1 서버 · 32 ASIC',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode — Galaxy 16대',
              groups: [{ count: 16, gpusPerNode: 32 }],
              stats: ['500 tok/s/유저 @ batch=64'],
              footer: '16 서버 · 512× Blackhole',
              grow: 2.6,
            },
          ],
          arrow: { label: 'KV (Ethernet)' },
          bottomLine: '총 17 서버 · 544× Blackhole — 1P:16D',
          note: '수치는 Tenstorrent 사내 실측(2026-07) — 공개 벤치마크 아님. 서버당 ASIC 수(32)는 공식 사양.',
        },
      },
    ],
  },
  {
    id: 'kimi-k2-mooncake-128xh200',
    family: 'kimi',
    model: 'Kimi K2/K2.5/K2.6/K2.7',
    operator: 'Moonshot AI · Mooncake 프로덕션',
    confidence: 'primary',
    hardware: '128× H200 · 16 노드 · RDMA (최대 8×400 Gbps)',
    specs: [
      { label: '모델', value: '1T · 32B 활성 · MLA — K2.5/K2.6/K2.7 동일 블루프린트' },
      { label: 'Prefill', value: 'Prefill 클러스터 · 장문은 청크드 파이프라인 병렬 · 레이어 단위 비동기 KV 기록' },
      { label: 'Decode', value: 'Decode 클러스터 · 대규모 EP' },
      {
        label: 'KV 스토어',
        value: 'Mooncake Store — 유휴 CPU DRAM + SSD 풀링 · 프리픽스 캐싱 · Conductor 캐시 인지 스케줄링 · 예측 기반 조기 거절',
      },
    ],
    perf: [
      { label: 'Prefill', value: '224k tok/s (P 노드 4개 합산)' },
      { label: 'Decode', value: '288k tok/s (D 노드 12개 합산)' },
      {
        label: '플랫폼',
        value: '동일 SLO에서 통합 서빙 대비 유효 용량 +59~498% (실제 트레이스) · 수천 노드 · 일 1,000억+ 토큰',
      },
    ],
    metrics: {
      cost: '~$0.21/M 출력 (H200 $2.3/hr 가정)',
      tsu: '미공개',
      tpg: 'Decode 3,000 · Prefill 7,000 tok/s (산술)',
      batch: 'Decode batch=480 (노드당/클러스터 불명)',
    },
    argument:
      'Moonshot은 인라인/chunked prefill로 돌아가는 안을 검토했고 기각했다 — Prefill은 다른 크로스 노드 병렬화가 필요하기 때문.',
    sources: [
      { label: 'LMSYS K2 배치', url: 'https://lmsys.org/blog/2025-07-20-k2-large-scale-ep/' },
      { label: 'Mooncake', url: 'https://kvcache-ai.github.io/Mooncake/' },
      { label: "Mooncake 논문 (FAST'25)", url: 'https://arxiv.org/abs/2407.00079' },
    ],
    diagrams: [
      {
        config: {
          router: 'Conductor — 프리픽스 캐시 적중률 × 부하를 저울질해 요청마다 Prefill+Decode 쌍 선택',
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 클러스터 (TTFT 바운드)',
              subtitle: '청크드 PP · 장문 컨텍스트',
              groups: [{ count: 4, gpusPerNode: 8, nodeLabel: '8× H200' }],
              stats: ['224k input tok/s'],
              footer: '4 노드 · 32× H200',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode 클러스터 (TBT 바운드)',
              subtitle: '대규모 EP',
              groups: [{ count: 12, gpusPerNode: 8, nodeLabel: '8× H200' }],
              stats: ['288k output tok/s'],
              footer: '12 노드 · 96× H200',
              grow: 2.4,
            },
          ],
          arrow: { label: 'KV' },
          storeBar: {
            title: 'Mooncake Store — 풀링된 KV 캐시',
            subtitle: '유휴 CPU DRAM + SSD · RDMA 최대 8×400 Gbps',
            arrows: ['KV 기록', 'KV 스트리밍'],
          },
          bottomLine: 'Kimi K2 · 128× H200 · 4P:12D 노드 · 224k Prefill / 288k Decode tok/s',
        },
      },
    ],
  },
  {
    id: 'kimi-k25-dynamo-24xgb200',
    family: 'kimi',
    model: 'Kimi K2.5',
    operator: 'NVIDIA Dynamo 레시피 (TensorRT-LLM)',
    confidence: 'primary',
    hardware: '24× GB200 · 워커당 4 GPU',
    specs: [
      { label: 'Prefill', value: 'DEP4 워커 × 3' },
      { label: 'Decode', value: 'TEP4 워커 × 3 · EAGLE 투기적 디코딩 · KV 라우터' },
      { label: '기타', value: 'TRT-LLM 네이티브 KV 호스트 오프로드 · KV 전달 NIXL' },
    ],
    perf: [],
    metrics: {
      cost: '미공개',
      tsu: '~130 tok/s (batch=32, ~200k 에이전틱)\nInferenceX(vLLM): 23.2 (batch=2,048) · 36.3 (batch=4,096)',
      tpg: '~5,400 tok/s (batch=32)\nInferenceX(vLLM · 8k/1k): 12,587 (batch=2,048)',
      batch: 'batch=32 · InferenceX 스윕 64–4,096',
    },
    argument: '1T급 모델도 벤더 레시피의 출발점은 PD disaggregation + KV 오프로드다.',
    sources: [
      { label: 'Dynamo recipes', url: 'https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md' },
      {
        label: 'InferenceX K2.5',
        url: 'https://inferencex.semianalysis.com/blog/gb200-nvl72-kimi-k2-5-vllm-wide-ep-3x-vs-b200',
      },
    ],
    diagrams: [
      {
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — DEP4 워커 × 3',
              groups: [{ count: 3, gpusPerNode: 4, nodeLabel: 'DEP4 · 4× GB200' }],
              footer: '워커 3개 · 12 GPU',
            },
            {
              role: 'decode',
              title: 'Decode — TEP4 워커 × 3',
              subtitle: 'EAGLE + KV 라우터',
              groups: [{ count: 3, gpusPerNode: 4, nodeLabel: 'TEP4 · 4× GB200' }],
              footer: '워커 3개 · 12 GPU',
            },
          ],
          arrow: { label: 'KV (NIXL)' },
          bottomLine: 'Kimi K2.5 · 24× GB200 · 3P:3D 워커 · KV 호스트 오프로드',
        },
      },
    ],
  },
  {
    id: 'kimi-k3-mooncake',
    family: 'kimi',
    model: 'Kimi K3',
    operator: 'Moonshot AI (2026-07-16 출시)',
    confidence: 'reported',
    hardware: 'Mooncake 분산 인프라 (세부 비공개)',
    specs: [
      { label: '모델', value: '2.8T · KDA 하이브리드 어텐션 · 1M 컨텍스트' },
      { label: '구조', value: '분리된 Prefill/Decode 풀 + 풀링된 KV 스토어' },
      {
        label: 'KDA 효과',
        value: '1M 컨텍스트에서 KV 캐시 최대 ~75% 절감 · Decode 처리량 최대 ~6× (Kimi Linear 논문, 동일 규모 비교)',
      },
      { label: '캐시', value: '코딩 워크로드 프리픽스 캐시 적중률 ~90% → 캐시 입력 $0.30/MTok 가격의 근거' },
    ],
    perf: [],
    metrics: {
      cost: 'API 정가 $3/M 입력 · $15/M 출력 · 캐시 입력 $0.30/M — 인프라 원가 아님',
      tsu: '미공개',
      tpg: '미공개',
      batch: '미공개',
    },
    argument:
      'KDA로 토큰당 KV는 싸졌지만, 2.8T 가중치 + 1M Prefill은 P/D disaggregation을 덜 필요하게 만드는 게 아니라 더 필수로 만든다.',
    sources: [
      {
        label: 'HF 블로그 (K3)',
        url: 'https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei',
      },
      {
        label: 'MarkTechPost',
        url: 'https://www.marktechpost.com/2026/07/16/moonshot-ai-releases-kimi-k3-a-2-8-trillion-parameter-open-moe-model-with-kimi-delta-attention-and-1m-context/',
      },
      { label: 'Kimi Linear / KDA', url: 'https://arxiv.org/abs/2510.26692' },
    ],
    diagrams: [
      {
        config: {
          router: 'Mooncake Conductor',
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 풀',
              undisclosed: '클러스터 구성 비공개 — 2026-07-27 가중치 공개 후 서드파티 구성 예정',
            },
            {
              role: 'decode',
              title: 'Decode 풀',
              undisclosed: '클러스터 구성 비공개 — KDA로 1M 컨텍스트 KV ~75% 절감',
            },
          ],
          arrow: { label: 'KV' },
          storeBar: {
            title: 'Mooncake Store — 풀링된 KV 캐시',
            subtitle: '코딩 워크로드 프리픽스 캐시 적중률 ~90%',
            arrows: ['KV 기록', 'KV 스트리밍'],
          },
          bottomLine: '2.8T 최대 규모 오픈 모델 — 그리고 여전히, 당연히, PD disaggregation.',
        },
      },
    ],
  },
  {
    id: 'kimi-k27-tt-galaxy',
    family: 'kimi',
    model: 'Kimi K2.7',
    operator: 'Tenstorrent (Blackhole Galaxy)',
    confidence: 'internal',
    hardware: 'Galaxy 서버 20대 — 서버당 32× Blackhole · 1 TB GDDR6 @ 16 TB/s',
    workload: '풀 모델 컨텍스트(256K) · batch=64',
    specs: [
      { label: 'Prefill', value: 'Galaxy 4대 (128× Blackhole)' },
      { label: 'Decode', value: 'Galaxy 16대 (512× Blackhole)' },
      {
        label: '패브릭',
        value: 'ASIC당 10× 400 GbE 내장 Ethernet · 스케일아웃 800 GbE — NVLink 없는 스케일아웃',
      },
    ],
    perf: [{ label: 'Decode', value: '900 tok/s/유저 @ batch=64 (풀 컨텍스트)' }],
    metrics: {
      cost: '미공개',
      tsu: '900 tok/s (batch=64) — 풀 컨텍스트(256K)',
      tpg: 'Decode ASIC당 ~112.5 out tok/s (64 × 900 ÷ 512 — 산술)',
      batch: 'batch=64',
    },
    argument:
      'R1의 1P:16D에서 K2.7은 4P:16D로 — 모델과 컨텍스트가 바뀌면 Prefill 풀만 늘리면 된다. 분리된 풀의 재조정 기능을 그대로 쓰는 사례다.',
    sources: [{ label: 'Tenstorrent Galaxy', url: 'https://tenstorrent.com/hardware/galaxy' }],
    diagrams: [
      {
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill — Galaxy 4대',
              groups: [{ count: 4, gpusPerNode: 32, nodeLabel: 'Galaxy · 32× Blackhole' }],
              footer: '4 서버 · 128× Blackhole',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode — Galaxy 16대',
              groups: [{ count: 16, gpusPerNode: 32 }],
              stats: ['900 tok/s/유저 @ batch=64'],
              footer: '16 서버 · 512× Blackhole',
              grow: 2.2,
            },
          ],
          arrow: { label: 'KV (Ethernet)' },
          bottomLine: '총 20 서버 · 640× Blackhole — 4P:16D',
          note: '수치는 Tenstorrent 사내 실측(2026-07) — 공개 벤치마크 아님. 서버당 ASIC 수(32)는 공식 사양.',
        },
      },
    ],
  },
  {
    id: 'glm5-nvfp4-dynamo-20xgb200',
    family: 'glm',
    model: 'GLM-5 (NVFP4)',
    operator: 'NVIDIA Dynamo 레시피 (SGLang)',
    confidence: 'primary',
    hardware: '20× GB200',
    specs: [
      { label: '모델', value: 'NVFP4 체크포인트 — 패턴은 GLM-5.2에 그대로 적용' },
      { label: 'Prefill', value: 'TP4 워커 1개 (4 GPU) — 연산 바운드 Prefill' },
      { label: 'Decode', value: 'TP16 워커 1개 (4 노드 × 4 GPU) + EAGLE 투기적 디코딩' },
      { label: 'KV 전달', value: 'NIXL' },
    ],
    perf: [],
    metrics: {
      cost: '최저 $0.13/M (InferenceX · B200 참고 하드웨어)',
      tsu: '43.4 tok/s (batch=512) — ITL 23.3ms',
      tpg: '~841 tok/s (batch=512 — 산술)\nInferenceX(B200): 4,116 @ 17.6 t/s/u · 579 @ 140 t/s/u',
      batch: 'batch=512',
    },
    argument:
      '같은 체크포인트가 Prefill에선 TP4, Decode에선 TP16을 원한다 — 두 페이즈가 다른 텐서 병렬 폭을 원한다는 가장 깔끔한 공개 증명.',
    sources: [
      { label: 'Dynamo recipes', url: 'https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md' },
      {
        label: 'InferenceX GLM-5',
        url: 'https://inferencex.semianalysis.com/blog/b200-glm5-nvfp4-vs-h200-fp8-3-6x-perf-per-dollar',
      },
    ],
    diagrams: [
      {
        config: {
          pools: [
            {
              role: 'prefill',
              title: 'Prefill 워커 — TP4',
              subtitle: '연산 바운드 Prefill',
              groups: [{ count: 1, gpusPerNode: 4, nodeLabel: '4× GB200' }],
              footer: '1 노드 · 4 GPU',
              grow: 1,
            },
            {
              role: 'decode',
              title: 'Decode 워커 — TP16',
              subtitle: 'EAGLE 투기적 디코딩 · 큰 배치',
              groups: [{ count: 4, gpusPerNode: 4, nodeLabel: '4× GB200' }],
              footer: '4 노드 · 16 GPU',
              grow: 2.2,
            },
          ],
          arrow: { label: 'KV (NIXL)' },
          bottomLine: 'GLM-5 NVFP4 · Dynamo + SGLang · 20× GB200 — Prefill TP4 vs Decode TP16',
        },
      },
    ],
  },
  {
    id: 'glm52-engine-matrix',
    family: 'glm',
    model: 'GLM-5.2',
    operator: 'Z.ai 공식 엔진 지원 매트릭스',
    confidence: 'primary',
    hardware: '검증: H200 · B200 · B300 · GB300 · MI300X/325X/355X · Ascend',
    specs: [
      { label: '모델', value: '~744B · 39–40B 활성 · DSA · MTP 드래프트 5 · 1M 컨텍스트' },
      {
        label: '엔진',
        value:
          'SGLang ≥0.5.13.post1 (저지연/처리량 전략 구분) · vLLM ≥0.23.0 · KTransformers · Transformers · Unsloth',
      },
      { label: '체크포인트', value: 'BF16 · 네이티브 FP8 · NVIDIA NVFP4 (Expert linear만 양자화)' },
      {
        label: 'EP 플래그',
        value: '--enable-expert-parallel (vLLM) · --enable-moe-ep (SGLang)',
      },
    ],
    perf: [
      {
        label: 'max-fit 경고',
        value:
          '8× H200(1,128 GB)에 FP8 가중치(~750 GB)는 들어가지만, 1M 컨텍스트는 FP8 KV를 강제하고도 batch가 한 자릿수(1~9)에 그친다',
      },
    ],
    metrics: {
      cost: '미공개',
      tsu: '>500 tok/s (batch=1) — 8× B300 · MTP',
      tpg: '미공개 (상대치만 공개)',
      batch: 'batch=1 (인터랙티비티) · 피크는 batch=8',
    },
    argument:
      '노드가 부팅되는 것과 서비스가 되는 것은 다르다 — max-fit 노드는 데모용이지 처리량이 아니다.',
    sources: [
      { label: 'GLM-5.2 모델 카드', url: 'https://huggingface.co/zai-org/GLM-5.2' },
      { label: 'vLLM 레시피', url: 'https://recipes.vllm.ai/zai-org/GLM-5.2' },
      { label: 'SGLang 쿡북', url: 'https://lmsysorg.mintlify.app/cookbook/autoregressive/GLM/GLM-5.2' },
      { label: 'NVFP4 체크포인트', url: 'https://huggingface.co/nvidia/GLM-5.2-NVFP4' },
      { label: 'LMSYS GLM-5.2 최적화', url: 'https://lmsys.org/blog/2026-07-13-glm52-optimization' },
    ],
    maxfits: [
      {
        title: 'LMSYS 실측 구성 A — 8× B300 (NVFP4)',
        spec: {
          nodeLabel: 'GLM-5.2 · 8× B300 · NVFP4 · 통합 서빙',
          gpuCount: 8,
          gpuLabel: 'B300',
          hbmLabel: 'HBM 합계 2,304 GB (288 GB × 8)의 배분',
          segments: [
            { label: 'NVFP4 가중치 ~375 GB', frac: 0.163, kind: 'weights' },
            { label: '런타임·활성값 ~90 GB', frac: 0.04, kind: 'runtime' },
            { label: 'KV ~1,840 GB', frac: 0.797, kind: 'kv' },
          ],
          contention: '같은 칩에서 Prefill과 Decode를 모두 수행한다',
          annotations: [
            'LMSYS 실측: batch=1에서 >500 tok/s/유저 (MTP · ~80K ISL 에이전틱)',
            'GLM-5.1 대비 인터랙티비티 ~1.3×',
          ],
          caption: '인터랙티비티 측정 구성 — batch=1 통합 서빙. 가중치·런타임·KV 배분은 산술.',
        },
      },
      {
        title: 'LMSYS 실측 구성 B — 4× GB300 (NVFP4)',
        spec: {
          nodeLabel: 'GLM-5.2 · 4× GB300 · NVFP4 · 통합 서빙',
          gpuCount: 4,
          gpuLabel: 'GB300',
          hbmLabel: 'HBM 합계 1,152 GB (288 GB × 4)의 배분',
          segments: [
            { label: 'NVFP4 가중치 ~375 GB', frac: 0.326, kind: 'weights' },
            { label: '런타임·활성값 ~45 GB', frac: 0.04, kind: 'runtime' },
            { label: 'KV ~730 GB', frac: 0.634, kind: 'kv' },
          ],
          contention: '같은 칩에서 Prefill과 Decode를 모두 수행한다',
          annotations: [
            'LMSYS 실측: GLM-5.1 대비 인터랙티비티 ~1.4×',
            'NVFP4 가중치 ~375 GB — GB300 트레이 하나(4 GPU)에도 여유 있게 들어간다',
          ],
          caption: '인터랙티비티 측정 구성 — batch=1 통합 서빙. 가중치·런타임·KV 배분은 산술.',
        },
      },
    ],
  },
]
