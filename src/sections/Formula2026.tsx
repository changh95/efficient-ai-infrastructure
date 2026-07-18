import { Section } from '../components/Section'
import { Fn } from '../components/Fn'
import './formula.css'

export function Formula2026() {
  return (
    <Section
      id="formula"
      no="05"
      kicker="2026"
      title={<>2026년의 공식 — PD disaggregation + MTP</>}
      lede={
        <>
          2026년의 추론 인프라는 두 가지로 요약된다 — 구조는 PD disaggregation, Decode 가속은
          MTP.
          <br />
          프레임워크는 분리를 기본 배포 패턴으로 굳혔고, 모델은 MTP를 내장하기 시작했고,
          하드웨어 로드맵까지 같은 방향으로 가고 있다.
        </>
      }
    >
      <div className="fml-pillars">
        <article className="fml-pillar fml-pillar--pd">
          <p className="fml-pillar-tag">기둥 1 · 인프라의 축</p>
          <h3 className="fml-pillar-title">PD disaggregation</h3>
          <p className="fml-pillar-body">
            풀을 나누면 세 가지가 한꺼번에 가능해진다. 셋 다 통합 서빙에서는 아예 할 수 없는
            것들이다.
          </p>
          <ul className="fml-points">
            <li>
              <strong>풀을 따로 스케일링할 수 있다.</strong> 트래픽의 입력/출력 길이 믹스에
              맞춰 Prefill 풀과 Decode 풀을 각자 늘리고 줄인다.
            </li>
            <li>
              <strong>페이즈마다 다른 병렬화를 쓸 수 있다.</strong> 같은 체크포인트가
              Prefill에서는 <span className="m">32 GPU</span>의 EP32로, Decode에서는{' '}
              <span className="m">320 GPU</span> 위의 Wide EP로 돈다
              <Fn label="V3 TR" url="https://arxiv.org/pdf/2412.19437" />.
            </li>
            <li>
              <strong>페이즈마다 다른 커널을 쓸 수 있다.</strong> DeepEP는 Prefill용 normal
              디스패치와 Decode용 low-latency 디스패치를 아예 별도 커널로 배포하는데, 한 통신
              그룹에서는 둘 중 하나만 쓸 수 있다
              <Fn label="DeepEP" url="https://github.com/deepseek-ai/DeepEP" />.
            </li>
          </ul>
          <div className="fml-frameworks">
            <p className="fml-frameworks-cap">이미 기본값이 된 프레임워크들</p>
            <ul className="fml-frameworks-list">
              <li>
                <span className="m">SGLang PD</span> + Mooncake Transfer Engine
                <Fn label="Mooncake" url="https://kvcache-ai.github.io/Mooncake/" />
              </li>
              <li>
                <span className="m">vLLM PD</span> — NIXL 기반 KV 전달
                <Fn
                  label="Red Hat"
                  url="https://developers.redhat.com/articles/2025/09/08/scaling-deepseek-style-moes-vllm-and-llm-d-using-wide-ep"
                />
              </li>
              <li>
                <span className="m">llm-d</span> — Kubernetes, CNCF 기부{' '}
                <span className="m">2026-03</span>
                <Fn
                  label="overview"
                  url="https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026"
                />
              </li>
              <li>
                <span className="m">Dynamo 1.0</span> — 데이터센터 스케일
                <Fn
                  label="NVIDIA"
                  url="https://developer.nvidia.com/blog/nvidia-dynamo-1-production-ready/"
                />
              </li>
            </ul>
          </div>
        </article>

        <div className="fml-plus" aria-hidden="true">
          +
        </div>

        <article className="fml-pillar fml-pillar--mtp">
          <p className="fml-pillar-tag">기둥 2 · Decode의 가속 축</p>
          <h3 className="fml-pillar-title">MTP — 자기 투기적 디코딩</h3>
          <p className="fml-pillar-body">
            MTP(multi-token prediction)는 모델이 드래프트 토큰 여러 개를 미리 만들어 놓고,
            Decode 한 스텝에서 한꺼번에 검증하는 자기 투기적 디코딩이다. 검증에 통과한 만큼
            스텝당 토큰이 여러 개 나오니, 대역폭에 묶인 Decode의 체감 속도가 올라간다.
          </p>
          <dl className="fml-mtp-stats">
            <div className="fml-mtp-stat">
              <dt>
                GLM-5.2 드래프트 토큰 확장
                <Fn label="GLM-5.2" url="https://huggingface.co/zai-org/GLM-5.2" />
              </dt>
              <dd>3 → 5</dd>
            </div>
            <div className="fml-mtp-stat">
              <dt>
                유저당 tok/s — DeepSeek-R1 MTP, GB300 NVL72
                <Fn label="LMSYS" url="https://www.lmsys.org/blog/2026-02-19-gb300-longctx/" />
              </dt>
              <dd>최대 1.87×</dd>
            </div>
          </dl>
          <p className="fml-pillar-body">
            Dynamo의 GLM-5 레시피가 쓰는 EAGLE도 같은 계열 — 드래프트 기반 투기적 디코딩이
            Decode 워커의 표준 장비가 됐다
            <Fn
              label="recipes"
              url="https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md"
            />
            .
          </p>
          <p className="fml-pillar-key">
            MTP가 <span className="hl-d">전용 Decode 풀</span>과 만났을 때 효과가 가장 큰
            이유가 있다. Decode는 HBM 대역폭에 묶여 있어서 연산 유닛이 대부분 쉬고 있는데,
            드래프트 검증이 바로 그 남는 연산을 가져다 쓴다. 그래서 두 기둥이 하나의 공식이
            된다.
          </p>
        </article>
      </div>

      <div className="fml-silicon card">
        <div className="fml-silicon-text">
          <p className="fml-silicon-kicker">하드웨어도 분리된다</p>
          <h3 className="fml-silicon-title">PD disaggregation이 실리콘 로드맵에 새겨졌다</h3>
          <p>
            NVIDIA는 <span className="m">2025-09</span> Rubin CPX를 발표했다. HBM을 떼고
            GDDR7을 단 <span className="hl-p">Prefill 전용</span> GPU다. Vera Rubin NVL144 CPX
            랙은 이 CPX를 HBM을 단 Rubin Decode GPU와 나란히 싣는다 — compute-bound인
            Prefill과 memory-bound인 Decode가 아예 서로 다른 메모리 시스템, 서로 다른 칩을
            받는 것이다. 이제 PD disaggregation은 소프트웨어 배포 패턴이 아니라 칩 설계의
            전제가 됐다.
          </p>
        </div>
        <figure
          className="fml-rack"
          role="img"
          aria-label="Vera Rubin NVL144 CPX 랙: GDDR7 기반 Rubin CPX Prefill 전용 GPU와 HBM 기반 Rubin Decode GPU가 한 랙에 함께 탑재된다"
        >
          <span className="fml-rack-label">VERA RUBIN NVL144 CPX — 한 랙, 두 실리콘</span>
          <div className="fml-rack-row">
            <div className="fml-die fml-die--prefill">
              <span className="fml-die-tag">PREFILL</span>
              <span className="fml-die-name">Rubin CPX</span>
              <div className="fml-die-mem" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <span className="fml-die-spec">GDDR7 · HBM 없음</span>
              <span className="fml-die-desc">컴퓨트 바운드 Prefill 전용</span>
            </div>
            <div className="fml-rack-arrow" aria-hidden="true">
              <span>KV</span>
              <i />
            </div>
            <div className="fml-die fml-die--decode">
              <span className="fml-die-tag">DECODE</span>
              <span className="fml-die-name">Rubin</span>
              <div className="fml-die-mem" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <span className="fml-die-spec">HBM 스택</span>
              <span className="fml-die-desc">대역폭 바운드 Decode 전용</span>
            </div>
          </div>
        </figure>
      </div>

      <div className="fml-tt card">
        <div className="fml-tt-head">
          <div className="fml-tt-head-text">
            <p className="fml-silicon-kicker">이 공식을 가장 저렴하게 조립하는 방법</p>
            <h3 className="fml-silicon-title">
              Tenstorrent Blackhole Galaxy — 초고속 추론을 위한 NPU 서버가 시장을 바꾼다
            </h3>
          </div>
          <a
            className="fml-tt-photo"
            href="https://tenstorrent.com/hardware/galaxy"
            target="_blank"
            rel="noreferrer noopener"
          >
            <img
              src={`${import.meta.env.BASE_URL}tt-galaxy.jpg`}
              alt="랙에 장착된 Tenstorrent Galaxy 서버"
              loading="lazy"
            />
            <span>Galaxy 구매하기 →</span>
          </a>
        </div>
        <div className="fml-tt-grid">
          <div className="fml-tt-item">
            <h4 className="fml-tt-title">SRAM이 만드는 Decode 속도</h4>
            <p className="fml-tt-body">
              Decode는 memory-bound다. Blackhole Galaxy는 서버당{' '}
              <span className="m">6.2 GB</span> SRAM을 <span className="m">2.9 PB/s</span>로
              돌린다
              <Fn label="Galaxy 스펙" url="https://tenstorrent.com/hardware/galaxy" /> — HBM
              기반 최신 노드(8× B300, HBM 합산 <span className="m">64 TB/s</span>)와 비교해도
              약 <span className="m">45×</span> 대역폭이다
              <Fn
                label="InferenceX"
                url="https://inferencex.semianalysis.com/blog/gb300-nvl72-vs-gb200-nvl72-dsv4-pro-vllm-fp4"
              />
              . 이 SRAM 계층 덕분에 Kimi K2.7 풀 컨텍스트(256K)에서 batch=64로{' '}
              <span className="m">900 tok/s/유저</span>가 나온다 (사내 실측).
            </p>
          </div>
          <div className="fml-tt-item">
            <h4 className="fml-tt-title">네트워킹 서버가 필요 없는 스케일아웃</h4>
            <p className="fml-tt-body">
              PD disaggregation은 KV 전달과 Wide EP 때문에 패브릭 비용이 치솟는다 — NVIDIA
              스택에서는 InfiniBand 스위치와 NVLink 인터커넥트 인프라가 그 몫을 가져간다.
              Blackhole은 ASIC마다 <span className="m">400 GbE</span> 링크 10개가 내장되어
              있어서(서버당 <span className="m">32 TB/s</span>)
              <Fn label="Galaxy 스펙" url="https://tenstorrent.com/hardware/galaxy" />, 별도
              네트워킹 장비 없이 표준 고속 이더넷 케이블로 서버끼리 직결 확장한다.
            </p>
          </div>
          <div className="fml-tt-item">
            <h4 className="fml-tt-title">Capex가 곧 토큰 가격이다</h4>
            <p className="fml-tt-body">
              분리는 GPU를 더 요구하고, 그래서 대당 가격이 곧 토큰당 비용이 된다. Galaxy는 1대{' '}
              <span className="m">$110,000</span>부터 시작한다
              <Fn label="Tenstorrent" url="https://tenstorrent.com/hardware/galaxy" />. 반면
              GB200/GB300 NVL72 랙은 공식 정가 없이 보도 기준 <span className="m">~$3M</span>
              대로 알려져 있고, SemiAnalysis TCO 모델 기준으로도 시간당{' '}
              <span className="m">$2.21–2.65/GPU</span>다
              <Fn
                label="InferenceX"
                url="https://inferencex.semianalysis.com/blog/gb300-nvl72-vs-gb200-nvl72-dsv4-pro-vllm-fp4"
              />
              . 같은 공식(PD 분리 + 넓은 Decode 풀)을 훨씬 낮은 진입 Capex와 토큰당 비용으로
              조립할 수 있다.
            </p>
          </div>
        </div>
        <p className="fml-tt-extra">
          그리고 하나 더 — <span className="hl-p">Prefill</span> 서버와{' '}
          <span className="hl-d">Decode</span> 서버가 같은 하드웨어다. 페이즈별 전용 칩을 사는
          대신 동일한 Galaxy 박스를 P 풀과 D 풀에 나눠 배치하고, 워크로드가 바뀌면 재배치하면
          된다. 위 배치 사례의 실측 구성이 정확히 그 방식이다 — DeepSeek-R1은 1P:16D로{' '}
          <span className="m">500 tok/s/유저</span>, Kimi K2.7은 4P:16D로{' '}
          <span className="m">900</span> (batch=64, 풀 컨텍스트, 사내 실측).
        </p>
      </div>

      <div className="fml-closing">
        <p className="fml-closing-cap">결론</p>
        <p className="fml-closing-quote">
          2026년에 아직도 PD disaggregation 없이 모델을 노드에 맞춰 넣는 팀은 효율과 성능을 잃고,
          비용은 더 치르고 있다.
          <br />
          이제 물어야 할 질문은 &ldquo;모델이 어느 서버에 들어가는가&rdquo;가 아니다.
          &ldquo;어떤 패브릭이 Decode 풀을 넓게 펼치게 해 주는가&rdquo;다.
        </p>
      </div>
    </Section>
  )
}
