import { useState } from 'react'
import { Section } from '../components/Section'
import { Fn } from '../components/Fn'
import { TopologyDiagram } from '../components/diagram/Topology'
import { MaxFitDiagram } from '../components/diagram/MaxFit'
import { CONFIDENCE_LABEL, FAMILY_LABEL, deployments } from '../data/deployments'
import type { Confidence, Family } from '../data/deployments'
import './deployments.css'

type Filter = 'all' | Family

const FAMILIES: Family[] = ['deepseek', 'kimi', 'glm']
const CONFIDENCES: Confidence[] = ['primary', 'reproduction', 'benchmark', 'reported', 'internal']

/** 값 문자열의 **텍스트** 를 볼드+밑줄로 렌더링 */
function fmt(v: string) {
  const parts = v.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return v
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <strong className="dep-em" key={i}>
        {p}
      </strong>
    ) : (
      p
    ),
  )
}

export function Deployments() {
  const [filter, setFilter] = useState<Filter>('all')
  const filtered = filter === 'all' ? deployments : deployments.filter((d) => d.family === filter)
  const countOf = (f: Family) => deployments.filter((d) => d.family === f).length

  return (
    <Section
      id="deployments"
      no="03"
      kicker="레퍼런스 배치"
      title="Prefill-Decode 분리는 이미 업계 스탠다드 기법이다"
      lede={
        <>
          DeepSeek·Kimi·GLM 세 패밀리의 1차 프로덕션 시스템은 전부 PD disaggregation이다.
          <span className="br" aria-hidden="true" />
          max-fit 통합 서빙은 개발 박스와 데모에서만 살아남았다.
          <span className="br" aria-hidden="true" />
          아래는 공개된 배치 기록이다 — 운영자, 토폴로지, 측정치, 출처를 그대로 옮겼다.
        </>
      }
    >
      <div className="dep-controls">
        <div className="dep-pills" role="group" aria-label="모델 패밀리 필터">
          <button
            type="button"
            className="dep-pill"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            전체 <span className="dep-pill-count">{deployments.length}</span>
          </button>
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              className="dep-pill"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {FAMILY_LABEL[f]} <span className="dep-pill-count">{countOf(f)}</span>
            </button>
          ))}
          <p className="dep-count" aria-live="polite">
            표시 {filtered.length} / {deployments.length}건
          </p>
        </div>
        <div className="dep-legend">
          <span className="dep-legend-label">신뢰도 라벨</span>
          {CONFIDENCES.map((c) => (
            <span key={c} className={`chip chip--${c}`}>
              {CONFIDENCE_LABEL[c]}
            </span>
          ))}
        </div>
      </div>

      <div className="dep-list">
        {filtered.map((d) => (
          <article className="card dep-card" key={d.id}>
            <header className="dep-head">
              <div className="dep-head-top">
                <span className="dep-family">{FAMILY_LABEL[d.family]}</span>
                <span className={`chip chip--${d.confidence}`}>
                  {CONFIDENCE_LABEL[d.confidence]}
                </span>
              </div>
              <h3 className="dep-model">{d.model}</h3>
              <p className="dep-operator">{d.operator}</p>
              <div className="dep-meta">
                <span className="dep-meta-item">
                  <span className="dep-meta-k">HW</span>
                  {d.hardware}
                </span>
                {d.workload && (
                  <span className="dep-meta-item">
                    <span className="dep-meta-k">워크로드</span>
                    {d.workload}
                  </span>
                )}
              </div>
            </header>

            <div className="dep-body">
              <div className="dep-facts">
                <div className="dep-block">
                  <p className="dep-block-label">토폴로지 구성</p>
                  <dl className="dep-kv">
                    {d.specs.map((s, i) => (
                      <div className="dep-kv-row" key={i}>
                        <dt>{s.label}</dt>
                        <dd>{fmt(s.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {d.perf.length > 0 && (
                  <div className="dep-block">
                    <p className="dep-block-label">측정치</p>
                    <dl className="dep-kv">
                      {d.perf.map((p, i) => (
                        <div className="dep-kv-row" key={i}>
                          <dt>{p.label}</dt>
                          <dd>{fmt(p.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {d.metrics && (
                  <div className="dep-block">
                    <p className="dep-block-label">핵심 지표</p>
                    <dl className="dep-kv">
                      <div className="dep-kv-row">
                        <dt>1M 토큰당 비용</dt>
                        <dd>{fmt(d.metrics.cost)}</dd>
                      </div>
                      <div className="dep-kv-row">
                        <dt>Decode tok/s/유저</dt>
                        <dd>{fmt(d.metrics.tsu)}</dd>
                      </div>
                      <div className="dep-kv-row">
                        <dt>GPU당 tok/s</dt>
                        <dd>{fmt(d.metrics.tpg)}</dd>
                      </div>
                      <div className="dep-kv-row">
                        <dt>Batch size</dt>
                        <dd>{fmt(d.metrics.batch)}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>

              <div className="dep-diagrams">
                {d.diagrams?.map((dg, i) => (
                  <div className="dep-diagram" key={i}>
                    {dg.title && <p className="dep-diagram-title">{dg.title}</p>}
                    <TopologyDiagram config={dg.config} />
                  </div>
                ))}
                {d.maxfits?.map((m, i) => (
                  <div className="dep-diagram" key={i}>
                    {m.title && <p className="dep-diagram-title">{m.title}</p>}
                    <MaxFitDiagram spec={m.spec} />
                  </div>
                ))}
              </div>
            </div>

            <p className="dep-argument">
              <span className="dep-block-label">이 배치가 논증하는 것</span>
              {d.argument}
            </p>

            <footer className="dep-sources">
              <span className="dep-sources-label">출처</span>
              {d.sources.map((s) => (
                <Fn key={s.url} label={s.label} url={s.url} />
              ))}
            </footer>
          </article>
        ))}
      </div>

      <div className="dep-outro">
        <h3 className="dep-outro-title">P:D 비율은 워크로드마다 다르다 — 그리고 그게 분리의 기능이다</h3>
        <p className="dep-outro-lede">위 카드들을 보면 P:D 비율이 제각각이다.</p>
        <div className="dep-ratios">
          <div className="dep-ratio-row">
            <span className="dep-ratio-label">
              2k ISL · 채팅형 — 96× H100
              <Fn label="LMSYS" url="https://www.lmsys.org/blog/2025-05-05-large-scale-ep/" />
            </span>
            <div className="dep-ratio-bar" aria-hidden="true">
              <i className="dep-ratio-p" style={{ flexGrow: 1 }}>
                1P
              </i>
              <i className="dep-ratio-d" style={{ flexGrow: 3 }}>
                3D
              </i>
            </div>
            <span className="dep-ratio-val">1P : 3D (노드)</span>
          </div>
          <div className="dep-ratio-row">
            <span className="dep-ratio-label">
              1k/1k — Dynamo GB200 R1 레시피
              <Fn
                label="recipes"
                url="https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md"
              />
            </span>
            <div className="dep-ratio-bar" aria-hidden="true">
              <i className="dep-ratio-p" style={{ flexGrow: 1 }}>
                1P
              </i>
              <i className="dep-ratio-d" style={{ flexGrow: 8 }}>
                8D
              </i>
            </div>
            <span className="dep-ratio-val">1P : 8D (노드)</span>
          </div>
          <div className="dep-ratio-row">
            <span className="dep-ratio-label">
              128K ISL · 문서·에이전트 — GB300
              <Fn label="재현 레시피" url="https://github.com/sgl-project/sglang/issues/18703" />
            </span>
            <div className="dep-ratio-bar" aria-hidden="true">
              <i className="dep-ratio-p" style={{ flexGrow: 12 }}>
                12P
              </i>
              <i className="dep-ratio-d" style={{ flexGrow: 8 }}>
                8D
              </i>
            </div>
            <span className="dep-ratio-val">12P : 8D (GPU)</span>
          </div>
          <div className="dep-ratio-row">
            <span className="dep-ratio-label">
              1M 컨텍스트 — Ascend V4-Flash
              <Fn
                label="vLLM-Ascend"
                url="https://docs.vllm.ai/projects/ascend/en/v0.18.0/tutorials/models/DeepSeek-V4-Flash.html"
              />
            </span>
            <div className="dep-ratio-bar" aria-hidden="true">
              <i className="dep-ratio-p" style={{ flexGrow: 4 }}>
                4P
              </i>
              <i className="dep-ratio-d" style={{ flexGrow: 4 }}>
                4D
              </i>
            </div>
            <span className="dep-ratio-val">4P : 4D (노드)</span>
          </div>
        </div>
        <p>
          입력이 길어질수록 Prefill 몫이 커지다가, 128K에서는 아예 비율이 뒤집힌다.
          <span className="br" aria-hidden="true" />
          이것은 결함이 아니라 기능이다.
          <span className="br" aria-hidden="true" />
          통합 서빙 노드는 물리가 정해 준 비율에 갇히지만, 분리된 풀은 워크로드가 바뀌면 비율을
          다시 맞추고 각자 오토스케일할 수 있다. Dynamo의 SLA 플래너가 하는 일이 정확히
          그것이다
          <Fn
            label="Dynamo 0.4"
            url="https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability"
          />
          .
        </p>
      </div>
    </Section>
  )
}
