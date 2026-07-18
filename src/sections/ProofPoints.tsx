import { Fn } from '../components/Fn'
import { Section } from '../components/Section'
import { proofPoints } from '../data/proofPoints'
import './proof.css'

const FABRIC_ID = 'inferencex-fabric'

export function ProofPoints() {
  const tiles = proofPoints.filter((p) => p.id !== FABRIC_ID)
  const fabric = proofPoints.find((p) => p.id === FABRIC_ID)

  return (
    <Section
      id="proof"
      no="04"
      kicker="증거"
      tone="tinted"
      title="PD disaggregation으로 바꾸면 실제로 얼마나 좋아질까?"
      lede={
        <>
          가장 확실한 증거는 같은 하드웨어에서 통합 서빙과 PD disaggregation을 직접 비교한
          측정치다.
          <br />
          아래 타일에는 전부 측정 조건이 붙어 있다 — 조건 없이 &lsquo;N배 빨라졌다&rsquo;는
          숫자는 믿으면 안 된다.
        </>
      }
    >
      <div className="prf-grid">
        {tiles.map((p, i) => (
          <article key={p.id} className={`card prf-tile${i === 0 ? ' prf-tile--wide' : ''}`}>
            <p className="prf-idx">PP-{String(i + 1).padStart(2, '0')}</p>
            <p className="prf-num">{p.headline}</p>
            <p className="prf-claim">{p.claim}</p>
            {p.caveat && <p className="prf-caveat">▲ {p.caveat}</p>}
            <p className="prf-scope">
              {p.scope}
              <Fn label={p.source.label} url={p.source.url} />
            </p>
          </article>
        ))}
      </div>

      {fabric && (
        <article className="card prf-fabric">
          <p className="prf-idx prf-fabric-idx">PP-12 · 둘 다 분리했는데 왜 4배 차이가 날까?</p>
          <div className="prf-fabric-main">
            <p className="prf-num prf-fabric-num">{fabric.headline}</p>
            <p className="prf-fabric-claim">
              GB200 NVL72 vs B200 — 둘 다 PD disaggregation 구성이다. 그런데도 GPU당 처리량은{' '}
              <span className="m">4,130 vs 941 tok/s</span>로 갈렸다.
              <Fn label={fabric.source.label} url={fabric.source.url} />
            </p>
            <p className="prf-fabric-body">
              이유는 칩이 아니라 칩 사이의 연결, 즉 <strong>패브릭</strong>에 있다. Wide EP는 매
              스텝 Expert들끼리 all-to-all 통신을 하는데, GB200 NVL72는 랙 전체 72개 GPU가
              NVLink(<span className="m">~900 GB/s</span>)로 묶여 있고, B200은 8-GPU 노드를
              벗어나는 순간 400G 이더넷(<span className="m">~50 GB/s</span>)으로 떨어진다.
              통신이 <span className="m">18×</span> 느려지니 <span className="hl-d">Decode</span>{' '}
              풀을 넓게 펼칠 수 없고, 풀이 좁으니 batch와 처리량이 따라서 깎인다.
              <Fn label="InferenceX" url={fabric.source.url} />
            </p>
          </div>
          <div className="prf-bw">
            <p className="prf-bw-title">GPU당 all-to-all 대역폭 — 스케일업 도메인 안 vs 밖</p>
            <div className="prf-bw-row">
              <span className="prf-bw-label">NVLink 5 · GB200 NVL72</span>
              <div className="prf-bw-meter">
                <div className="prf-bw-track" aria-hidden="true">
                  <i style={{ width: '100%' }} />
                </div>
                <span className="prf-bw-val">~900 GB/s</span>
              </div>
            </div>
            <div className="prf-bw-row">
              <span className="prf-bw-label">400G RoCE · 8 EP 랭크 초과</span>
              <div className="prf-bw-meter">
                <div className="prf-bw-track" aria-hidden="true">
                  <i style={{ width: '5.6%' }} />
                </div>
                <span className="prf-bw-val">~50 GB/s</span>
              </div>
            </div>
            <p className="prf-bw-cliff">
              ▼ 8-GPU NVLink 아일랜드를 넘는 순간 — 18× 절벽
              <Fn label="InferenceX" url={fabric.source.url} />
            </p>
          </div>
          <p className="prf-scope prf-fabric-scope">
            {fabric.scope}
            <Fn label={fabric.source.label} url={fabric.source.url} />
          </p>
        </article>
      )}
    </Section>
  )
}
