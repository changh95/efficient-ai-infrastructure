import { Section } from '../components/Section'
import { glossary } from '../data/glossary'
import './sources.css'

interface SourceItem {
  title: string
  url: string
}

interface SourceGroup {
  title: string
  desc: string
  note?: string
  items: SourceItem[]
}

function domain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '')
}

const GROUPS: SourceGroup[] = [
  {
    title: '1차 자료',
    desc: '벤더가 직접 공개한 설정과 수치',
    items: [
      {
        title: 'DeepSeek-V3 Technical Report §3.4 — 추론 배치',
        url: 'https://arxiv.org/pdf/2412.19437',
      },
      {
        title: 'DeepSeek open-infra-index — 추론 시스템 개요 (EP32/EP144 · 마진 공개)',
        url: 'https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md',
      },
      {
        title: 'DeepEP — MoE all-to-all 커널 (normal / low-latency)',
        url: 'https://github.com/deepseek-ai/DeepEP',
      },
      {
        title: 'Mooncake 논문 (arXiv 2407.00079)',
        url: 'https://arxiv.org/abs/2407.00079',
      },
      {
        title: "Mooncake 논문 — FAST'25 판본 (USENIX)",
        url: 'https://www.usenix.org/system/files/fast25-qin.pdf',
      },
      {
        title: 'Mooncake 프로젝트 사이트 — K2 128× H200 배치 노트 · RDMA 사양',
        url: 'https://kvcache-ai.github.io/Mooncake/',
      },
      {
        title: 'Kimi K2.7-Code 모델 카드',
        url: 'https://huggingface.co/moonshotai/Kimi-K2.7-Code',
      },
      {
        title: 'GLM-5.2 모델 카드',
        url: 'https://huggingface.co/zai-org/GLM-5.2',
      },
      {
        title: 'GLM-5 저장소',
        url: 'https://github.com/zai-org/GLM-5',
      },
      {
        title: 'GLM-5.2 NVFP4 체크포인트 (NVIDIA)',
        url: 'https://huggingface.co/nvidia/GLM-5.2-NVFP4',
      },
      {
        title: 'vLLM 레시피 — GLM-5.2',
        url: 'https://recipes.vllm.ai/zai-org/GLM-5.2',
      },
      {
        title: 'SGLang 쿡북 — GLM-5.2',
        url: 'https://lmsysorg.mintlify.app/cookbook/autoregressive/GLM/GLM-5.2',
      },
      {
        title: 'SGLang 쿡북 — DeepSeek-V4',
        url: 'https://lmsysorg.mintlify.app/cookbook/autoregressive/DeepSeek/DeepSeek-V4',
      },
      {
        title: 'vLLM-Ascend — DeepSeek-V4-Flash 1M PD 레시피',
        url: 'https://docs.vllm.ai/projects/ascend/en/v0.18.0/tutorials/models/DeepSeek-V4-Flash.html',
      },
      {
        title: 'NVIDIA Dynamo 저장소',
        url: 'https://github.com/ai-dynamo/dynamo',
      },
      {
        title: 'NVIDIA Dynamo 레시피 목록',
        url: 'https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md',
      },
      {
        title: 'NVIDIA Dynamo 1.0 블로그',
        url: 'https://developer.nvidia.com/blog/nvidia-dynamo-1-production-ready/',
      },
      {
        title: 'NVIDIA Dynamo 0.4 블로그',
        url: 'https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability',
      },
      {
        title: 'NVIDIA GB200 NVL72 + Dynamo — MoE 추론 블로그',
        url: 'https://developer.nvidia.com/blog/how-nvidia-gb200-nvl72-and-nvidia-dynamo-boost-inference-performance-for-moe-models',
      },
      {
        title: 'NVIDIA dgxc-benchmarking — R1 추론 README (prefill batch=1)',
        url: 'https://github.com/NVIDIA/dgxc-benchmarking/blob/main/deepseek_r1/inference/dynamo/README.md',
      },
    ],
  },
  {
    title: '재현 · 벤치마크',
    desc: '제3자 오픈 구현과 측정치',
    items: [
      {
        title: 'LMSYS — 96× H100 PD disaggregation + 대규모 EP',
        url: 'https://www.lmsys.org/blog/2025-05-05-large-scale-ep/',
      },
      {
        title: 'LMSYS — GB300 NVL72 장문 컨텍스트 DeepSeek',
        url: 'https://www.lmsys.org/blog/2026-02-19-gb300-longctx/',
      },
      {
        title: 'LMSYS — Kimi K2, 128× H200 대규모 EP 배치 (4P:12D)',
        url: 'https://lmsys.org/blog/2025-07-20-k2-large-scale-ep/',
      },
      {
        title: 'PyTorch 블로그 — GB300에서 SGLang으로 DeepSeek-V4 서빙',
        url: 'https://pytorch.org/blog/serving-deepseek-v4-on-gb300-with-sglang-5x-higher-throughput-at-the-same-interactivity-since-day-0/',
      },
      {
        title: 'SemiAnalysis InferenceX — GB200 NVL72 vs B200 (R1 disagg)',
        url: 'https://inferencex.semianalysis.com/blog/gb200-nvl72-vs-b200-disagg-deepseek-r1-fp4-dynamo-trt',
      },
      {
        title: 'Red Hat — vLLM · llm-d Wide-EP + PD disaggregation',
        url: 'https://developers.redhat.com/articles/2025/09/08/scaling-deepseek-style-moes-vllm-and-llm-d-using-wide-ep',
      },
    ],
  },
  {
    title: '연구',
    desc: '학술 논문',
    items: [
      {
        title: "DistServe — goodput 최적화 PD disaggregation (OSDI'24)",
        url: 'https://arxiv.org/abs/2401.09670',
      },
      {
        title: 'Step-3 — Attention-FFN 분리(AFD) · 320-GPU DeepSeek V3 Decode 인용',
        url: 'https://arxiv.org/pdf/2507.19427',
      },
      {
        title: 'TPLA — 텐서 병렬 친화 잠재 어텐션',
        url: 'https://arxiv.org/pdf/2508.15881',
      },
      {
        title: 'Kimi Linear / KDA (arXiv 2510.26692)',
        url: 'https://arxiv.org/abs/2510.26692',
      },
    ],
  },
  {
    title: '2차 보도',
    desc: '보도 · 블로그 기반',
    note: '인용 전 재검증 권장',
    items: [
      {
        title: 'Kimi K3 출시 보도 — MarkTechPost',
        url: 'https://www.marktechpost.com/2026/07/16/moonshot-ai-releases-kimi-k3-a-2-8-trillion-parameter-open-moe-model-with-kimi-delta-attention-and-1m-context/',
      },
      {
        title: 'Kimi K3 출시 보도 — MLQ.ai',
        url: 'https://mlq.ai/news/moonshot-ai-releases-kimi-k3-a-28-trillion-parameter-open-weight-model-rivaling-top-us-systems/',
      },
      {
        title: 'Kimi K3 개요 — Hugging Face 커뮤니티 블로그',
        url: 'https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei',
      },
      {
        title: 'Kimi K3 정리 — Morph',
        url: 'https://www.morphllm.com/kimi-k3',
      },
      {
        title: 'Kimi K2.7 Code 벤치마크 · 스펙 — Kingy',
        url: 'https://kingy.ai/news/kimi-k2-7-code-benchmarks-specs/',
      },
      {
        title: 'Kimi K2.7 Code 소개 — FelloAI',
        url: 'https://felloai.com/kimi-k2-7-code/',
      },
      {
        title: 'GLM-5.2 배포 가이드 — Spheron',
        url: 'https://www.spheron.network/blog/deploy-glm-5-2-gpu-cloud/',
      },
      {
        title: 'GLM-5.2 로컬 실행 가이드 — Groundy',
        url: 'https://groundy.com/articles/running-glm-5-2-at-home-sglang-vllm-transformers-and-ktransformers-setup-guide/',
      },
      {
        title: 'GLM-5.2 배포 가이드 — Houdao',
        url: 'https://www.houdao.com/d/14441-Zhipu-GLM5-2-Deployment-Guide-Hardware-vLLM-SGLang-for-the-744B-MoE-Model',
      },
      {
        title: '분산 추론 지형 개관 (30× · Qwen3 · llm-d 수치 출처)',
        url: 'https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026',
      },
    ],
  },
]

export function SourcesSection() {
  return (
    <Section
      id="sources"
      kicker="출처"
      title="출처 전체 목록"
      lede={
        <>
          본문 각주가 가리키는 원문의 전체 목록이다.
          <span className="br" aria-hidden="true" />
          신뢰도 순으로 네 묶음으로 나눴다 — 1차 자료를 우선하고, 2차 보도는 재검증
          전에는 단독 근거로 쓰지 않는다.
        </>
      }
    >
      <details className="src-glossary card">
        <summary>
          <span className="src-gloss-title">용어집</span>
          <span className="src-gloss-count">{glossary.length}개 용어</span>
          <span className="src-gloss-hint" aria-hidden="true" />
        </summary>
        <dl className="src-dl">
          {glossary.map((g) => (
            <div className="src-def" key={g.term}>
              <dt>{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      </details>

      {GROUPS.map((g, i) => (
        <section className="src-group" key={g.title} aria-label={`출처 그룹: ${g.title}`}>
          <div className="src-group-head">
            <span className="src-group-no">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="src-group-title">{g.title}</h3>
            <span className="src-group-desc">
              {g.desc} · {g.items.length}건
            </span>
            {g.note && <span className="src-group-note">{g.note}</span>}
          </div>
          <ul className="src-list">
            {g.items.map((it) => (
              <li className="src-item" key={it.url}>
                <a className="src-link" href={it.url} target="_blank" rel="noreferrer noopener">
                  <span className="src-t">{it.title}</span>
                  <span className="src-d">{domain(it.url)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Section>
  )
}
