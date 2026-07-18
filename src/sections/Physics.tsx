import { MaxFitDiagram } from '../components/diagram/MaxFit'
import type { MaxFitSpec } from '../components/diagram/MaxFit'
import { Fn } from '../components/Fn'
import { Section } from '../components/Section'
import './physics.css'

const SRC = {
  dsv3: 'https://arxiv.org/pdf/2412.19437',
  dgxc: 'https://github.com/NVIDIA/dgxc-benchmarking/blob/main/deepseek_r1/inference/dynamo/README.md',
  recipes: 'https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md',
  deepep: 'https://github.com/deepseek-ai/DeepEP',
  lmsys: 'https://www.lmsys.org/blog/2025-05-05-large-scale-ep/',
  k27: 'https://huggingface.co/moonshotai/Kimi-K2.7-Code',
  k3: 'https://www.marktechpost.com/2026/07/16/moonshot-ai-releases-kimi-k3-a-2-8-trillion-parameter-open-moe-model-with-kimi-delta-attention-and-1m-context/',
  glm52: 'https://huggingface.co/zai-org/GLM-5.2',
  glmDeploy:
    'https://www.houdao.com/d/14441-Zhipu-GLM5-2-Deployment-Guide-Hardware-vLLM-SGLang-for-the-744B-MoE-Model',
  nvidiaMoe:
    'https://developer.nvidia.com/blog/how-nvidia-gb200-nvl72-and-nvidia-dynamo-boost-inference-performance-for-moe-models',
  mooncake: 'https://arxiv.org/abs/2407.00079',
  step3: 'https://arxiv.org/pdf/2507.19427',
}

const k27Maxfit: MaxFitSpec = {
  nodeLabel: 'Kimi K2.7 · FP8 · batch 1 · 256K — 최소 사양 8× H200',
  gpuCount: 8,
  gpuLabel: 'H200',
  hbmLabel: 'HBM 1,128 GB의 배분',
  segments: [
    { label: 'FP8 가중치 ~1,000 GB', frac: 0.887, kind: 'weights' },
    { label: '런타임·활성값 ~90 GB', frac: 0.08, kind: 'runtime' },
    { label: 'KV ~18 GB + 여유 ~20 GB', frac: 0.033, kind: 'kv' },
  ],
  annotations: [
    '이 노드 전체가 동시 유저 1명을 위한 구성이다',
    '스텝당 활성 Expert 8 / 384 — Expert당 1토큰의 완전한 GEMV, 나머지 376개는 유휴',
  ],
  caption: '노드는 문제없이 돌아간다 — 하지만 이 구성으로 뽑을 수 있는 건 데모 수준의 처리량뿐이다.',
}

const k27Maxfit4: MaxFitSpec = {
  nodeLabel: 'Kimi K2.7 · FP8 · 4노드 (32× H200) · 256K',
  gpuCount: 32,
  gpuLabel: 'H200',
  hbmLabel: 'HBM 합계 4,512 GB의 배분',
  segments: [
    { label: 'FP8 가중치 ~1,000 GB', frac: 0.222, kind: 'weights' },
    { label: '런타임·활성값 ~360 GB', frac: 0.08, kind: 'runtime' },
    { label: 'KV ~3,150 GB', frac: 0.698, kind: 'kv' },
  ],
  annotations: [
    '256K 풀 컨텍스트 기준 batch ~175',
    'batch 175 × top-8 = 활성 1,400 / Expert 384 → Expert당 평균 ~3.7토큰 — GEMV는 벗어나지만 여전히 얕은 GEMM',
  ],
  caption:
    'batch는 살아난다 — 하지만 이 구성은 이미 멀티노드 분산 서빙이고, Prefill 간섭과 TTFT·TPOT 결합은 그대로 남는다.',
}

const glm52Maxfit4: MaxFitSpec = {
  nodeLabel: 'GLM-5.2 · FP8 · 4노드 (32× H200) · 1M',
  gpuCount: 32,
  gpuLabel: 'H200',
  hbmLabel: 'HBM 합계 4,512 GB의 배분',
  segments: [
    { label: 'FP8 가중치 ~750 GB', frac: 0.166, kind: 'weights' },
    { label: '런타임·활성값 ~360 GB', frac: 0.08, kind: 'runtime' },
    { label: 'KV ~3,400 GB', frac: 0.754, kind: 'kv' },
  ],
  annotations: [
    '1M 동시 스트림: 한 자릿수 → 수십 개 수준 (헤드룸 ~11.8× 비례)',
    '1M 토큰 Prefill 하나가 들어올 때마다 그 수십 명 전원의 ITL이 튄다',
  ],
  caption:
    'batch는 살아난다 — 하지만 이 구성은 이미 멀티노드 분산 서빙이고, Prefill 간섭과 TTFT·TPOT 결합은 그대로 남는다.',
}

const glm52Maxfit: MaxFitSpec = {
  nodeLabel: 'GLM-5.2 · FP8 · batch 1 · 1M — 최소 사양 8× H200',
  gpuCount: 8,
  gpuLabel: 'H200',
  hbmLabel: 'HBM 1,128 GB의 배분',
  segments: [
    { label: 'FP8 가중치 ~750 GB', frac: 0.665, kind: 'weights' },
    { label: '런타임·활성값 ~90 GB', frac: 0.08, kind: 'runtime' },
    { label: 'KV 헤드룸 <300 GB — 1M 요청 몇 개 몫', frac: 0.255, kind: 'kv' },
  ],
  annotations: [
    '이 노드가 담는 1M 스트림은 한 자릿수 — batch 1이면 유저 한 명이 노드를 독점한다',
    'DSA는 attention 연산량을 줄일 뿐 — KV 용량도 Decode 배치도 만들어 주지 않는다',
  ],
}

export function Physics() {
  return (
    <Section
      id="physics"
      no="02"
      kicker="물리학"
      tone="tinted"
      title="하나의 칩에서 두 가지 작업을 돌린다는 게 애초에 말이 안 됐다"
      lede={
        <>
          <span className="hl-p">Prefill</span>은 연산을 태우고(compute-bound),{' '}
          <span className="hl-d">Decode</span>는 HBM 대역폭을 태운다(memory-bound).
          <br />두 단계를 같은 GPU에 겹쳐 놓으면 TTFT와 TPOT을 독립적으로 튜닝할 수 없다 —
          그리고 MoE 시대에는 이 비대칭이 곧바로 배치 산수가 된다.
        </>
      }
    >
      {/* ---- 02.1 상 비대칭 대비 패널 ---- */}
      <div className="phy-block">
        <div className="phy-block-head">
          <span className="phy-block-no">02.1</span>
          <h3 className="phy-block-title">Prefill과 Decode는 병목부터 정반대다</h3>
        </div>
        <div className="phy-duel">
          <article className="phy-phase phy-phase--p">
            <header className="phy-phase-head">
              <span className="phy-tag phy-tag--p">PREFILL</span>
              <span className="phy-phase-title">프롬프트 전체를 한 번에 처리한다</span>
            </header>
            <dl className="phy-facts">
              <div>
                <dt>병목</dt>
                <dd>연산(FLOPs) — 연산 유닛이 먼저 한계에 도달한다</dd>
              </div>
              <div>
                <dt>포화 조건</dt>
                <dd>긴 요청 하나면 충분하다 — 배치 1로 GPU가 포화된다</dd>
              </div>
              <div>
                <dt>결정 지표</dt>
                <dd>
                  <span className="m">TTFT</span> — 첫 토큰까지의 시간
                </dd>
              </div>
              <div>
                <dt>원하는 병렬화</dt>
                <dd>작은 TP + SP, 장문 컨텍스트에선 청크드 PP</dd>
              </div>
            </dl>
            <p className="phy-phase-note">
              NVIDIA 자체 벤치마크 문서는 Prefill 서버의{' '}
              <span className="m">max_batch_size = 1</span>로 둔다 — 긴 ISL 하나로 GPU가 이미
              포화되기 때문이다.
              <Fn label="dgxc-bench" url={SRC.dgxc} />
            </p>
          </article>
          <div className="phy-neq" aria-hidden="true">
            ≠
          </div>
          <article className="phy-phase phy-phase--d">
            <header className="phy-phase-head">
              <span className="phy-tag phy-tag--d">DECODE</span>
              <span className="phy-phase-title">토큰을 한 개씩 생성한다</span>
            </header>
            <dl className="phy-facts">
              <div>
                <dt>병목</dt>
                <dd>HBM 대역폭 — 매 스텝 전체 가중치 + KV를 읽는다</dd>
              </div>
              <div>
                <dt>포화 조건</dt>
                <dd>수십~수백 동시 요청을 스텝마다 배칭해야 한다</dd>
              </div>
              <div>
                <dt>결정 지표</dt>
                <dd>
                  <span className="m">TPOT</span> — 출력 토큰당 시간
                </dd>
              </div>
              <div>
                <dt>원하는 병렬화</dt>
                <dd>DP attention + Wide EP</dd>
              </div>
            </dl>
            <p className="phy-phase-note">
              batch를 채우지 못하면 HBM 대역폭도 Expert도 제대로 활용되지 못한다 — 그 비용이
              얼마나 큰지는 아래 MoE 계산에서 그대로 드러난다.
            </p>
          </article>
        </div>
      </div>

      {/* ---- 02.2 MoE 배치 산수 ---- */}
      <div className="phy-block">
        <div className="phy-block-head">
          <span className="phy-block-no">02.2</span>
          <h3 className="phy-block-title">MoE에서는 batch가 작으면 효율이 급격히 떨어진다</h3>
        </div>
        <p className="phy-block-lede">
          프런티어 오픈 모델은 전부 sparse MoE다.
          <br />
          Expert는 스텝당 토큰을 충분히 받아야 행렬곱(GEMM)으로 돌고, 모자라면 같은
          하드웨어에서 GEMV(매트릭스 × 벡터 곱연산)로 전락한다.
          <br />
          라우팅이 희소할수록 그 문턱은 높아진다.
        </p>
        <div className="phy-routing">
          <div className="phy-route">
            <span className="phy-route-model">DeepSeek V3 / R1</span>
            <span className="phy-route-num">
              8 <em>of</em> 256
              <Fn label="DSv3 §3.4" url={SRC.dsv3} />
            </span>
            <span className="phy-route-note">MLA · 128K 컨텍스트 · 671B</span>
          </div>
          <div className="phy-route">
            <span className="phy-route-model">Kimi K2 / K2.7</span>
            <span className="phy-route-num">
              8 <em>of</em> 384
              <Fn label="K2.7 카드" url={SRC.k27} />
            </span>
            <span className="phy-route-note">MLA · 256K · 1T · 네이티브 INT4</span>
          </div>
          <div className="phy-route">
            <span className="phy-route-model">
              Kimi K3 <span className="chip chip--reported">보도 기반</span>
            </span>
            <span className="phy-route-num">
              ~16 <em>of</em> 896
              <Fn label="K3 보도" url={SRC.k3} />
            </span>
            <span className="phy-route-note">KDA 하이브리드 · 1M · 2.8T</span>
          </div>
        </div>
        <div
          className="phy-cycle"
          role="img"
          aria-label="Wide EP 선순환: GPU당 Expert 감소, HBM이 KV로 풀림, batch 증가, 모든 Expert가 토큰을 충분히 받음"
        >
          <span className="phy-tag phy-tag--d">DECODE POOL</span>
          <span className="phy-cycle-step">Wide EP — Decode 풀을 넓게</span>
          <span className="phy-cycle-arrow" aria-hidden="true">
            →
          </span>
          <span className="phy-cycle-step">GPU당 Expert footprint ↓</span>
          <span className="phy-cycle-arrow" aria-hidden="true">
            →
          </span>
          <span className="phy-cycle-step">풀린 HBM이 KV가 된다</span>
          <span className="phy-cycle-arrow" aria-hidden="true">
            →
          </span>
          <span className="phy-cycle-step">배치 ↑</span>
          <span className="phy-cycle-arrow" aria-hidden="true">
            →
          </span>
          <span className="phy-cycle-step">모든 Expert가 토큰을 충분히 받는다 — GEMM 유지</span>
        </div>
      </div>

      {/* ---- 02.3 통합 서빙의 4가지 독립 실패 모드 ---- */}
      <div className="phy-block">
        <div className="phy-block-head">
          <span className="phy-block-no">02.3</span>
          <h3 className="phy-block-title">Max-fit 서빙이 실패하는 4가지 이유</h3>
        </div>
        <p className="phy-block-lede">
          이 네 가지 문제는 서로 독립적이지만, 이 중 하나만 봐도 사실 PD disaggregation을 할
          이유는 충분하다.
          <br />
          그리고 max-fit 통합 서빙 노드는 네 가지를 동시에 겪는다.
        </p>
        <div className="phy-fails">
          <article className="phy-fail">
            <span className="phy-fail-no">①</span>
            <h4 className="phy-fail-title">간섭 — Prefill이 Decode를 방해한다</h4>
            <p>
              새 요청의 Prefill이 스케줄되는 순간, 같은 GPU에서 토큰을 생성하던 모든 Decode가
              연산 자원을 빼앗긴다. 그래서 누군가 긴 프롬프트를 던질 때마다 그 GPU에 올라가 있는
              모든 유저의 답변이 동시에 멈칫한다(ITL 스파이크). chunked prefill은 Prefill을 잘게
              쪼개 Decode 사이에 끼워 넣는 완화책인데, 총 연산량은 그대로라 간섭이 사라지는 게
              아니라 &lsquo;새 유저의 첫 토큰(TTFT)을 늦출 것이냐, 기존 유저들의 토큰 간격(ITL)을
              늘릴 것이냐&rsquo;의 트레이드오프로 바뀔 뿐이다. NVIDIA조차 자기 벤치마크 문서에서
              통합 서빙으로는 두 지표를 동시에 최적화하기 어렵다고 적어
              놓았다.
              <Fn label="dgxc-bench" url={SRC.dgxc} />
            </p>
          </article>
          <article className="phy-fail">
            <span className="phy-fail-no">②</span>
            <h4 className="phy-fail-title">병렬화 불일치</h4>
            <p>
              Prefill은 작은 TP + SP를, Decode는 DP attention + Wide EP를 원한다. DeepSeek 공식
              배치는 Prefill <span className="m">EP32</span>(32 GPU) 대 Decode{' '}
              <span className="m">320 GPU</span>
              <Fn label="DSv3 §3.4" url={SRC.dsv3} />
              <Fn label="Step-3" url={SRC.step3} />, NVIDIA GLM-5 레시피는 같은 체크포인트에{' '}
              <span className="m">TP4</span> Prefill 대 <span className="m">TP16</span> Decode를
              쓴다.
              <Fn label="Dynamo recipes" url={SRC.recipes} /> 한 엔진에는 한 레이아웃만 담긴다.
            </p>
          </article>
          <article className="phy-fail">
            <span className="phy-fail-no">③</span>
            <h4 className="phy-fail-title">커널 불일치</h4>
            <p>
              DeepEP는 커널을 두 벌 배포한다 — Prefill용 normal 디스패치(NVLink+RDMA)와 Decode용
              low-latency 디스패치(순수 RDMA/IBGDA).
              <Fn label="DeepEP" url={SRC.deepep} /> 두 모드는 하나의 통신 그룹에 공존할 수 없어,
              통합 서빙 MoE 엔진은 한쪽을 고르고 다른 단계에서 손해를 본다.
              <Fn label="LMSYS" url={SRC.lmsys} />
            </p>
          </article>
          <article className="phy-fail">
            <span className="phy-fail-no">④</span>
            <h4 className="phy-fail-title">MoE 배치 경제학</h4>
            <p>
              MoE에서 Expert의 효율은 한 스텝에 Expert마다 토큰이 몇 개씩 모이는가로 결정된다(위
              02.2). max-fit 노드는 KV 캐시에 쓸 메모리가 부족하니 batch가 작을 수밖에 없고,
              batch가 작으면 Expert마다 돌아가는 토큰 수가 줄어 행렬곱 효율이 급격히 떨어진다.
              앞의 Wide EP 선순환이 고리마다 정확히 반대로 도는 악순환인 셈이다. 아래 예제 A에서
              실제 숫자로 확인할 수 있다.
            </p>
          </article>
        </div>
      </div>

      {/* ---- 02.4 워크드 예제 ---- */}
      <div className="phy-block">
        <div className="phy-block-head">
          <span className="phy-block-no">02.4</span>
          <h3 className="phy-block-title">Max-fit 서빙을 실제로 할 때의 구성</h3>
        </div>
        <details className="phy-details">
          <summary className="phy-sum">
            <span className="phy-sum-kicker">예제 A</span>
            <span className="phy-sum-title">
              Kimi K2.7(FP8)을 풀 컨텍스트(256K)로 돌리는 최소 사양은? (힌트: 1명만 쓸 수 있음)
            </span>
            <span className="phy-sum-icon" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="phy-details-body">
            <p className="phy-glm">
              Kimi K2.7(1T)의 FP8 가중치 ~1,000 GB는 8× H200의 HBM 1,128 GB에 물리적으로
              올라간다.
              <Fn label="K2.7 카드" url={SRC.k27} /> 남는 ~128 GB에서 런타임 몫을 빼면, 최대
              컨텍스트 256K 요청 하나의 KV(~18 GB)가 겨우 들어간다.
              <Fn label="DSv3 §3.4" url={SRC.dsv3} /> 즉 8× H200 한 대로 256K 요청을 실제로
              처리할 수는 있다 — 다만 그 최신 HGX 노드 하나가 통째로 유저 한 명의 것이 된다.
            </p>
            <ol className="phy-calc">
              <li>
                <span className="phy-calc-f">1 B/param × 1T ≈ ~1,000 GB</span>
                <span className="phy-calc-d">
                  K2.7(1T)을 FP8로 서빙할 때의 가중치 크기
                  <Fn label="K2.7 카드" url={SRC.k27} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">256K 토큰 × 70 KB ≈ ~18 GB</span>
                <span className="phy-calc-d">
                  batch 1이 최대 컨텍스트(256K)를 꽉 채울 때의 KV — MLA 잠재 KV는 토큰당 576
                  dim × 61 layer × 2 B ≈ 70 KB(BF16)
                  <Fn label="DSv3 §3.4" url={SRC.dsv3} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">~1,000 GB + 런타임 ~90 GB + KV ~18 GB ≈ ~1,108 GB</span>
                <span className="phy-calc-d">batch 1을 돌리기 위해 필요한 총 메모리</span>
              </li>
              <li>
                <span className="phy-calc-f">최소 사양: 8× H200 = 1,128 GB HBM</span>
                <span className="phy-calc-d">
                  여유 ~20 GB — 아슬아슬하게 들어간다. 속도를 포기해도 이 밑으로는 못 내려간다
                </span>
              </li>
              <li>
                <span className="phy-calc-f">그 대가: 동시 유저 1명</span>
                <span className="phy-calc-d">최신 HGX 노드 하나가 통째로 요청 하나에 묶인다</span>
              </li>
              <li>
                <span className="phy-calc-f">batch 1 × top-8 = 활성 8 / Expert 384</span>
                <span className="phy-calc-d">
                  Expert당 1토큰의 완전한 GEMV(매트릭스 × 벡터 곱연산), 나머지 376개 Expert는
                  그 스텝 동안 유휴 — 연산 강도 ~O(1) FLOP/byte
                </span>
              </li>
            </ol>
            <MaxFitDiagram spec={k27Maxfit} />
          </div>
        </details>
        <details className="phy-details">
          <summary className="phy-sum">
            <span className="phy-sum-kicker">예제 B</span>
            <span className="phy-sum-title">
              GLM-5.2(FP8)를 풀 컨텍스트(1M)로 돌리는 최소 사양은? (힌트: 1명만 쓸 수 있음)
            </span>
            <span className="phy-sum-icon" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="phy-details-body">
            <p className="phy-glm">
              GLM-5.2(~744B)의 FP8 가중치 ~750 GB는 8× H200의 HBM 1,128 GB에 물리적으로 올라간다.
              <Fn label="GLM-5.2 카드" url={SRC.glm52} />
              <Fn label="배포 가이드" url={SRC.glmDeploy} /> 그러나 남는 여유는 ~300 GB 미만이고, 1M
              토큰 요청은 KV를 FP8로 강제하고도 동시 스트림을 한 자릿수만 담는다.
              <Fn label="배포 가이드" url={SRC.glmDeploy} /> DSA가 128K–1M 구간의 attention 연산량을
              크게 줄여 Prefill 지연은 돕지만, KV 용량도 Decode 배치도 만들어 주지 않는다. 즉 8×
              H200 한 대로 1M 요청을 실제로 처리할 수는 있다 — 다만 그 노드가 동시에 감당하는
              유저가 한 자릿수라는 뜻이다.
            </p>
            <ol className="phy-calc">
              <li>
                <span className="phy-calc-f">1 B/param × ~744B ≈ ~750 GB</span>
                <span className="phy-calc-d">
                  GLM-5.2를 FP8로 서빙할 때의 가중치 크기
                  <Fn label="GLM-5.2 카드" url={SRC.glm52} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">~750 GB + 런타임 ~90 GB + (1M 토큰 × FP8 KV)</span>
                <span className="phy-calc-d">
                  batch 1이 최대 컨텍스트(1M)를 꽉 채울 때 필요한 총 메모리 — DSA의 토큰당
                  KV 크기는 공개 자료에 없지만, 배포 가이드 기준 1M 요청의 KV는 &lt;300 GB
                  헤드룸에 몇 개밖에 못 담는 크기다
                  <Fn label="배포 가이드" url={SRC.glmDeploy} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">최소 사양: 8× H200 = 1,128 GB HBM</span>
                <span className="phy-calc-d">
                  절반 구성(4× H200 = 564 GB)은 가중치조차 못 담는다 — 속도를 포기해도 이
                  밑으로는 못 내려간다
                </span>
              </li>
              <li>
                <span className="phy-calc-f">그 대가: 동시 유저 1명 (1M 기준)</span>
                <span className="phy-calc-d">
                  매 스텝 KV를 읽는 memory-bound Decode가 batch 1로 돌고, 노드는 요청 하나에
                  묶인다 — DSA는 attention 연산량을 줄일 뿐 이 구조를 바꾸지 못한다
                </span>
              </li>
            </ol>
            <MaxFitDiagram spec={glm52Maxfit} />
          </div>
        </details>
        <details className="phy-details">
          <summary className="phy-sum">
            <span className="phy-sum-kicker">예제 C</span>
            <span className="phy-sum-title">
              Kimi K2.7(FP8), H200 노드를 4대로 늘리면 더 많은 사람이 쓸 수 있지 않을까?
              (힌트: 맞긴 한데, 아무도 못 쓴다)
            </span>
            <span className="phy-sum-icon" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="phy-details-body">
            <p className="phy-glm">
              노드 4대(32× H200)를 NVLink·RDMA로 묶고 가중치 한 벌을 TP/EP로 샤딩하면, KV에 쓸
              수 있는 메모리가 크게 풀린다. batch는 실제로 살아난다. 대신, 256K prefill 요청이
              새로 들어오면, 175명의 decode가 전부 멈춘다.
            </p>
            <ol className="phy-calc">
              <li>
                <span className="phy-calc-f">4노드 × 8× H200 = 32× H200 = 4,512 GB HBM</span>
                <span className="phy-calc-d">가중치 한 벌을 32 GPU에 샤딩하는 구성</span>
              </li>
              <li>
                <span className="phy-calc-f">
                  4,512 − 가중치 ~1,000 − 런타임 ~360 ≈ KV ~3,150 GB
                </span>
                <span className="phy-calc-d">
                  런타임·활성값은 노드당 ~90 GB × 4로 잡았다
                  <Fn label="K2.7 카드" url={SRC.k27} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">~3,150 GB ÷ ~18 GB(256K × 70 KB) ≈ batch ~175</span>
                <span className="phy-calc-d">
                  풀 컨텍스트(256K) 기준 동시 요청 수
                  <Fn label="DSv3 §3.4" url={SRC.dsv3} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">batch 175 × top-8 = 활성 1,400 / Expert 384</span>
                <span className="phy-calc-d">
                  Expert당 평균 ~3.7토큰 — HBM에서 읽어온 Expert 가중치를 4번 남짓 쓰고
                  버린다는 뜻이다. 유저 개인의 속도가 아니라 GPU당 총 처리량(tok/s/GPU)이
                  달성 가능치의 몇 분의 일에 머물고, 토큰당 원가가 그만큼 비싸진다
                </span>
              </li>
            </ol>
            <MaxFitDiagram spec={k27Maxfit4} />
          </div>
        </details>
        <details className="phy-details">
          <summary className="phy-sum">
            <span className="phy-sum-kicker">예제 D</span>
            <span className="phy-sum-title">
              GLM-5.2(FP8), H200 노드 4대면 1M 컨텍스트도 여럿이 쓸 수 있지 않을까?
              (힌트: 맞긴 한데, 아무도 못 쓴다)
            </span>
            <span className="phy-sum-icon" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="phy-details-body">
            <p className="phy-glm">
              같은 4노드(32× H200) 구성에 GLM-5.2를 올리면 KV 몫은 ~3,400 GB — 단일 노드
              헤드룸(&lt;300 GB)의 약 11.8배다. 수십 개의 batch가 생길 것으로 예상된다. 하지만
              한 명의 유저가 1M 토큰 prefill 요청을 넣는 순간, 나머지 모든 유저의 decode 연산이
              멈추고, 모두가 기다려야 한다.
            </p>
            <ol className="phy-calc">
              <li>
                <span className="phy-calc-f">4노드 × 8× H200 = 4,512 GB HBM</span>
                <span className="phy-calc-d">예제 C와 같은 구성</span>
              </li>
              <li>
                <span className="phy-calc-f">4,512 − ~750 − ~360 ≈ KV ~3,400 GB</span>
                <span className="phy-calc-d">
                  단일 노드의 &lt;300 GB 대비 ~11.8×
                  <Fn label="GLM-5.2 카드" url={SRC.glm52} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">1M 동시 스트림: 한 자릿수 → 수십 개 수준</span>
                <span className="phy-calc-d">
                  스트림당 KV 크기가 비공개라 헤드룸 비례(~11.8×)로만 추정
                  <Fn label="배포 가이드" url={SRC.glmDeploy} />
                </span>
              </li>
              <li>
                <span className="phy-calc-f">1M 토큰 Prefill 하나 = 연산 폭탄</span>
                <span className="phy-calc-d">
                  통합 풀에서는 그 Prefill이 돌아가는 동안 수십 명 전원의 ITL이 튄다 — 그리고
                  풀이 분리돼 있지 않으니 P:D 비율을 조정할 방법도 없다
                </span>
              </li>
            </ol>
            <MaxFitDiagram spec={glm52Maxfit4} />
          </div>
        </details>
      </div>

      {/* ---- 02.5 반대 방향 산수 ---- */}
      <div className="phy-block">
        <div className="phy-block-head">
          <span className="phy-block-no">02.5</span>
          <h3 className="phy-block-title">Prefill-Decode를 분리하는 순간 모든 문제가 풀린다</h3>
        </div>
        <div className="phy-counter">
          <div className="phy-counter-item">
            <h4>batch가 노드 한계에서 풀 한계로 바뀐다</h4>
            <p>
              Decode 풀 전체의 HBM이 하나의 KV 예산이 된다. batch를 정하는 것이 더 이상
              &lsquo;한 노드에서 가중치를 빼고 남은 조각&rsquo;이 아니라 Decode 풀의 크기다.
              Mooncake는 여기에 유휴 CPU DRAM과 SSD로 만든 풀드 KV 스토어까지 더해 이 예산을
              한 번 더 늘린다.
              <Fn label="Mooncake" url={SRC.mooncake} />
            </p>
          </div>
          <div className="phy-counter-item">
            <h4>GPU 하나가 드는 Expert 수가 줄어든다</h4>
            <p>
              Expert Parallelism(EP)의 폭이 넓어질수록 GPU당 Expert 수가 준다 — DeepSeek V3의{' '}
              <span className="m">EP320</span>에서는 GPU당 약 1개다.
              <Fn label="DSv3 §3.4" url={SRC.dsv3} /> 비운 만큼 HBM이 KV로 풀리고, batch가
              커지고, Expert마다 토큰이 충분히 모인다 — 위 예제들의 악순환이 고리 그대로
              선순환으로 뒤집힌다. NVIDIA 시뮬레이터 스윕은 이 복리 효과를 R1 중간 지연
              구간에서 <span className="m">~6×</span>로 측정했다.
              <Fn label="NVIDIA MoE" url={SRC.nvidiaMoe} />
            </p>
          </div>
          <div className="phy-counter-item">
            <h4>Prefill이 들어와도 아무도 멈추지 않는다</h4>
            <p>
              Prefill은 아예 다른 GPU 풀에서 돌기 때문에 Decode 스텝을 건드릴 수 없다 — 예제
              C·D의 &lsquo;모두가 멈추는 상황&rsquo;이 구조적으로 사라진다. 그리고 Prefill 용량은
              트래픽의 입력 길이(ISL) 믹스에 맞춰 따로 늘리고 줄일 수 있다. 통합 서빙에는 이
              선택지 자체가 없다.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
