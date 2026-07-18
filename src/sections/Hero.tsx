import { MaxFitDiagram } from '../components/diagram/MaxFit'
import type { MaxFitSpec } from '../components/diagram/MaxFit'
import { TopologyDiagram } from '../components/diagram/Topology'
import { deepseekOfficialDiagram } from '../data/deployments'
import { Fn } from '../components/Fn'
import './hero.css'

const heroMaxfit: MaxFitSpec = {
  nodeLabel: '8-GPU HGX 노드 — 가중치 + KV 전부 탑재',
  gpuCount: 8,
  gpuLabel: 'GPU',
  hbmLabel: 'HBM — 이 노드가 가진 전부',
  segments: [
    { label: '가중치 (HBM 대부분)', frac: 0.7, kind: 'weights' },
    { label: '런타임·활성값', frac: 0.08, kind: 'runtime' },
    { label: 'KV 캐시 — 남는 조각', frac: 0.22, kind: 'kv' },
  ],
  contention: '같은 칩에서 Prefill과 Decode를 모두 수행한다',
}

export function Hero() {
  return (
    <section className="hero" aria-label="핵심 주장">
      <div className="wrap">
        <p className="hero-kicker">TECHNICAL BRIEF · 2026-07 · CV-LEARN.COM</p>
        <h1 className="hero-title">
          새로운 시대의 AI 추론 인프라가 <span className="hero-strike">온다</span>{' '}
          <span className="hero-nb">이미 왔다</span>
        </h1>
        <p className="hero-lede">
          모델 가중치 + KV 캐시 용량만큼 VRAM에 꽉꽉 눌러담아 서빙하는 시대는 끝났다.
          <br />
          <span className="hl-p">Prefill</span>과 <span className="hl-d">Decode</span>를 분리한
          분산 인프라(distributed inference)는 같은 하드웨어에서 더 싸고, 더 빠르고, 더 많이
          서빙한다.
          <br />
          새로운 시대의 AI 추론 인프라 패러다임에 대해 설명하고, 실제 구성을 보여드리겠습니다.
        </p>

        <div className="hero-duel">
          <div className="hero-duel-col hero-duel-col--before">
            <p className="hero-duel-label hero-duel-label--before">
              <span className="hero-duel-no">방식 1</span>
              과거의 심플한 방식 — max-fit 통합 서빙
            </p>
            <MaxFitDiagram spec={heroMaxfit} />
            <p className="hero-duel-note">
              기존의 방법은 Max-fit 통합 서빙 방식으로서, 모델의 가중치와 KV 캐시를 VRAM에
              꽉꽉 눌러담는 방식이다.
              <br />
              한정된 HBM에 모델 가중치를 넣으니 KV 캐시를 위한 메모리가 부족하고, 따라서 KV
              캐시가 작으니 batch가 작아지고, batch가 작으니 Expert들이 토큰을 충분히 받지
              못해 MoE 행렬곱의 효율성이 급격히 하락한다.
              <br />
              여기에 문제가 하나 더 있다.
              <br />
              Prefill은 수천~수만 토큰짜리 프롬프트를 한 번에 처리하는 작업이라, 요청
              하나만으로도 GPU가 포화된다.
              <br />
              그런데 통합 서빙에서는 이 Prefill이 진행 중인 유저들의 Decode와 같은 칩에서
              돌아가니, 새 요청이 들어올 때마다 Decode가 뒤로 밀리고, 잘 나오던 모든 유저의
              답변이 일제히 멈칫하게 된다(ITL 스파이크).
              <br />
              결국 새 유저의 첫 토큰을 빨리 내보내려면(TTFT) 기존 유저들의 토큰 간격(TPOT)이
              나빠지고, 기존 유저를 지키려면 새 유저가 기다려야 한다.
              <br />두 지표가 같은 GPU에 묶여 있어서, 하나를 살리면 하나가 죽는 구조다.
            </p>
          </div>
          <div className="hero-duel-col">
            <p className="hero-duel-label hero-duel-label--after">
              <span className="hero-duel-no">방식 2</span>
              2026년의 방식 — PD disaggregation (DeepSeek 공식 프로덕션)
            </p>
            <TopologyDiagram config={deepseekOfficialDiagram} />
            <p className="hero-duel-note">
              이 방식의 이득은 측정되어 있다.
              <br />
              같은 SLO 아래에서 유효 요청 용량이 최대 <span className="m">+498%</span> 늘고
              <Fn label="FAST'25" url="https://arxiv.org/abs/2407.00079" />, 완전히 같은
              하드웨어에서 GPU당 처리량이 <span className="m">2.5×</span>가 되며
              <Fn
                label="Dynamo 0.4"
                url="https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability"
              />
              , 임대 H100 96장 기준 출력 100만 토큰당 비용은 <span className="m">$0.20</span>
              까지 내려간다
              <Fn label="LMSYS" url="https://www.lmsys.org/blog/2025-05-05-large-scale-ep/" />.
              <br />
              DeepSeek이 스스로 공개한 <span className="m">545%</span> 이론 마진이 바로 이 구조
              위에서 나온 숫자다
              <Fn
                label="open-infra"
                url="https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md"
              />
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
