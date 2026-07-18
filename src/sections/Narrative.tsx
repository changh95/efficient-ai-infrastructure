import type { ReactNode } from 'react'
import { Section } from '../components/Section'
import { Fn } from '../components/Fn'
import './narrative.css'

const SRC = {
  openInfra: 'https://github.com/deepseek-ai/open-infra-index',
  /* 545% 마진·노드당 처리량·KV 적중률이 실린 Open Source Week 6일차 문서 */
  openInfraDay6:
    'https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md',
  v3Report: 'https://arxiv.org/pdf/2412.19437',
  lmsys: 'https://www.lmsys.org/blog/2025-05-05-large-scale-ep/',
  mooncake: 'https://kvcache-ai.github.io/Mooncake/',
  dynamo1: 'https://developer.nvidia.com/blog/nvidia-dynamo-1-production-ready/',
  landscape:
    'https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026',
} as const

interface TimelineEvent {
  date: string
  name: string
  desc: ReactNode
  key?: boolean
}

const TIMELINE: TimelineEvent[] = [
  {
    date: '2024-12',
    name: 'DeepSeek-V3 기술 보고서 공개',
    desc: (
      <>
        §3.4에 Prefill <span className="m">32 GPU</span> · Decode{' '}
        <span className="m">320 GPU</span>의 비대칭 프로덕션 배치가 이미 실려 있었다
        <Fn label="V3 §3.4" url={SRC.v3Report} />. 이 대목을 눈여겨본 사람은 드물었다.
      </>
    ),
  },
  {
    date: '2025-01',
    name: '딥시크 쇼크',
    desc: (
      <>
        프런티어급 성능 모델이 엄청나게 저렴한 가격으로 풀렸다 — R1 기준 입력{' '}
        <span className="m">$0.55/M</span> 토큰(캐시 적중 시{' '}
        <span className="m">$0.14/M</span>), 출력 <span className="m">$2.19/M</span> 토큰
        <Fn label="DeepSeek API" url="https://api-docs.deepseek.com/quick_start/pricing" />.
        많은 사람들이 &lsquo;중국 정부가 몰래 보조금을 주겠지&rsquo;라고 현실 부정을 한다.
        불확실성으로 인해 주식이 흔들린다.
      </>
    ),
  },
  {
    date: '2025-02',
    name: 'open-infra week — 장부 공개',
    key: true,
    desc: (
      <>
        DeepSeek이 이론 마진 <span className="m">545%</span>와 노드당 처리량, KV 캐시
        적중률까지 스스로 공개했다
        <Fn label="open-infra" url={SRC.openInfraDay6} />. 루머가 아니었다.
      </>
    ),
  },
  {
    date: '2025-05',
    name: 'SGLang, 96× H100 오픈 재현',
    desc: (
      <>
        PD disaggregation + 대규모 EP로 출력 100만 토큰당 <span className="m">~$0.20</span> — 당시
        공식 API 가격의 약 <span className="m">1/5</span>이다
        <Fn label="LMSYS" url={SRC.lmsys} />. 원가 구조가 오픈소스로 검증됐다.
      </>
    ),
  },
  {
    date: '2025-07',
    name: 'Kimi K2의 기술 구현 및 오픈소스 공개 (Mooncake)',
    desc: (
      <>
        <span className="m">128× H200</span> PD disaggregation 클러스터로 Prefill{' '}
        <span className="m">224k tok/s</span> · Decode <span className="m">288k tok/s</span>
        <Fn label="Mooncake" url={SRC.mooncake} />. 또 하나의 프런티어 랩이 같은 구조를 1차
        자료로 내놓았다.
      </>
    ),
  },
  {
    date: '2025-09',
    name: 'NVIDIA, Rubin CPX 발표',
    desc: (
      <>
        Prefill 전용 GPU — HBM 대신 GDDR7을 쓴다. PD disaggregation이 소프트웨어를 넘어 실리콘
        로드맵에 들어갔다
        <Fn label="overview" url={SRC.landscape} />.
      </>
    ),
  },
  {
    date: '2026-03',
    name: 'NVIDIA Dynamo 공개',
    desc: (
      <>
        데이터센터 규모의 Dynamo <span className="m">1.0</span>
        <Fn label="Dynamo 1.0" url={SRC.dynamo1} />과 쿠버네티스 기본 패턴이 된 llm-d
        <Fn label="overview" url={SRC.landscape} /> — PD disaggregation은 연구가 아니라 기본 배포
        패턴이 됐다.
      </>
    ),
  },
]

export function Narrative() {
  return (
    <Section
      id="story"
      no="01"
      kicker="서사"
      title="AI 추론 인프라의 패러다임이 바뀐 날"
      lede={
        <>
          2025년 초 DeepSeek V3/R1이 나왔을 때, 수많은 기업들이 저렴한 API 비용을 보고
          경악했다.
          <span className="br" aria-hidden="true" />
          &lsquo;중국 정부가 주는 보조금을 받으면서, 저렴한 API로 유저를 확보하려는 전략일
          거다&rsquo;라고 다들 생각했다.
          <span className="br br--gap" aria-hidden="true" />
          그리고 얼마 지나지 않아, DeepSeek은 Open-Source Week를 통해 자신들의 최적화 전략을
          공개했다
          <Fn label="open-infra-index" url={SRC.openInfra} />.
          <span className="br" aria-hidden="true" />
          많은 기업들이 이 방식을 직접 테스트했고, 저렴한 API 비용은 보조금이 아닌 미친 듯이
          효율적인 AI 모델 서빙에서 온다는 것을 확인했다.
          <span className="br" aria-hidden="true" />그 후, 수많은 AI 기업과 하이퍼스케일러들은 서빙 방식을 전환했다.
        </>
      }
    >
      <div className="nar-versus">
        <div className="nar-ledger card">
          <div className="nar-ledger-head">
            <span className="nar-ledger-date">2025-02 · DEEPSEEK OPEN-INFRA WEEK</span>
            <span className="chip chip--primary">1차 자료</span>
          </div>
          <div className="nar-ledger-grid">
            <div className="nar-fig">
              <span className="nar-fig-num">~$87k</span>
              <span className="nar-fig-label">
                일일 GPU 비용 — H800, $2/GPU-hr 기준
                <Fn label="open-infra" url={SRC.openInfraDay6} />
              </span>
            </div>
            <div className="nar-fig">
              <span className="nar-fig-num">~$562k</span>
              <span className="nar-fig-label">
                일일 이론 매출 — 정가 환산
                <Fn label="open-infra" url={SRC.openInfraDay6} />
              </span>
            </div>
            <div className="nar-fig nar-fig--key">
              <span className="nar-fig-num">545%</span>
              <span className="nar-fig-label">
                이론 마진 — 자체 공개
                <Fn label="open-infra" url={SRC.openInfraDay6} />
              </span>
            </div>
          </div>
          <div className="nar-ledger-sub">
            <span className="nar-sub nar-sub--p">
              Prefill <b>~73.7k</b> input tok/s · H800 노드당
              <Fn label="open-infra" url={SRC.openInfraDay6} />
            </span>
            <span className="nar-sub nar-sub--d">
              Decode <b>~14.8k</b> output tok/s · H800 노드당
              <Fn label="open-infra" url={SRC.openInfraDay6} />
            </span>
            <span className="nar-sub">
              KV 캐시 적중률 <b>~56%</b>
              <Fn label="open-infra" url={SRC.openInfraDay6} />
            </span>
          </div>
        </div>
      </div>

      <p className="nar-para">
        루머는 터무니없는 소리가 아니었다 — 가격이 실제로 통념 밖이었기 때문이다.
        <span className="br" aria-hidden="true" />
        틀린 것은 답이었다.
        <span className="br" aria-hidden="true" />
        DeepSeek은 보조금을 받는 게 아니라, 개선된 추론 topology를 통해 추론 효율을 개선한
        것이고 이를 통해 추론 비용을 낮출 수 있던 것이다.
        <span className="br" aria-hidden="true" />
        V3 기술 보고서 §3.4가 공개한 프로덕션 배치에서 <span className="hl-p">
          Prefill
        </span>{' '}
        최소 유닛은 <span className="m">4노드 × 8 = 32 GPU</span>,{' '}
        <span className="hl-d">Decode</span> 최소 유닛은{' '}
        <span className="m">40노드 × 8 = 320 GPU</span>다
        <Fn label="V3 §3.4" url={SRC.v3Report} />.
        <span className="br" aria-hidden="true" />
        같은 모델을 서빙하는 두 풀의 크기가 열 배 차이 나고, 병렬화 구성도{' '}
        <span className="m">EP32</span> 대 <span className="m">EP320</span>으로 다르다
        <Fn label="V3 §3.4" url={SRC.v3Report} />.
        <span className="br" aria-hidden="true" />이 비대칭이 max-fit 단일 노드로는 도달할 수 없는 원가를 만들었다.
      </p>

      <figure
        className="nar-ratio"
        role="img"
        aria-label="DeepSeek V3 프로덕션 최소 배치 유닛 비교: Prefill 32 GPU 대 Decode 320 GPU — 1 대 10 비대칭"
      >
        <div className="nar-ratio-bar">
          <div className="nar-ratio-seg nar-ratio-seg--p">32</div>
          <div className="nar-ratio-seg nar-ratio-seg--d">320</div>
        </div>
        <div className="nar-ratio-legend">
          <span>
            <i className="nar-sw nar-sw--p" />
            Prefill 최소 유닛 — 4노드 · 32× H800 · EP32
          </span>
          <span>
            <i className="nar-sw nar-sw--d" />
            Decode 최소 유닛 — 40노드 · 320× H800 · EP320
          </span>
        </div>
        <figcaption className="nar-ratio-cap">
          V3 프로덕션 최소 배치 유닛의 GPU 수 — Decode 풀이 Prefill 유닛의 10배다
          <Fn label="V3 §3.4" url={SRC.v3Report} />
        </figcaption>
      </figure>

      <div className="nar-tl-head">
        <p className="nar-tl-overline">TIMELINE · 2024-12 → 2026-03</p>
        <h3 className="nar-tl-title">세상이 분산 추론 인프라를 받아들인 연대기</h3>
        <p className="nar-para">
          루머를 정리한 것은 재현이었다.
          <span className="br" aria-hidden="true" />
          자체 공개 석 달 뒤 오픈소스 재현이 원가를 검증했고, 그로부터 1년 사이 서빙
          프레임워크와 클라우드 네이티브 스택, GPU 실리콘 로드맵이 차례로 같은 구조를
          채택했다.
        </p>
      </div>

      <ol className="nar-timeline">
        {TIMELINE.map((ev) => (
          <li
            key={ev.date}
            className={`nar-tl-item${ev.key ? ' nar-tl-item--key' : ''}`}
          >
            <span className="nar-tl-date">{ev.date}</span>
            <p className="nar-tl-name">{ev.name}</p>
            <p className="nar-tl-desc">{ev.desc}</p>
          </li>
        ))}
      </ol>

      <p className="nar-outro">
        하이퍼스케일러들이 내린 결론은 루머보다 단순했다.
        <span className="br" aria-hidden="true" />싼 이유는 보조금이 아니라 더 나은 인프라였고, 그 핵심은 Prefill과 Decode를
        서로 다른 풀로 분리해 각자에게 맞는 병렬화와 하드웨어를 주는 것이었다.
      </p>
    </Section>
  )
}
