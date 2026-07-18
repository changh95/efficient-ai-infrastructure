import './diagram.css'

export interface MaxFitSpec {
  nodeLabel: string
  gpuCount: number
  gpuLabel: string
  hbmLabel: string
  segments: { label: string; frac: number; kind: 'weights' | 'runtime' | 'kv' }[]
  /** 코럴/틸 해칭 영역 라벨 — prefill·decode가 같은 SM을 두고 싸운다 */
  contention?: string
  annotations?: string[]
  caption?: string
}

/** "max-fit" 단일 노드의 실패 구조 다이어그램 (before 그림) */
export function MaxFitDiagram({ spec }: { spec: MaxFitSpec }) {
  // 텍스트(라벨·범례·주석)가 접근성 트리에 그대로 남는다. 칩·바만 장식으로 숨긴다.
  return (
    <figure className="mxf">
      <div className="mxf-node">
        <div className="mxf-node-head">
          <span className="tpd-tag tpd-tag--conflict">MAX-FIT</span>
          <span className="tpd-pool-title">{spec.nodeLabel}</span>
        </div>
        <div className="mxf-chips" aria-hidden="true">
          {Array.from({ length: spec.gpuCount }, (_, i) => (
            <span className="mxf-chip" key={i}>
              <i>{spec.gpuLabel}</i>
            </span>
          ))}
        </div>
        {spec.contention && <div className="mxf-contention">{spec.contention}</div>}
        <div className="mxf-hbm">
          <div className="mxf-hbm-label">{spec.hbmLabel}</div>
          <div className="mxf-hbm-bar" aria-hidden="true">
            {spec.segments.map((s) => (
              <div
                key={s.label}
                className={`mxf-seg mxf-seg--${s.kind}`}
                style={{ flexGrow: s.frac }}
              />
            ))}
          </div>
          <div className="mxf-legend">
            {spec.segments.map((s) => (
              <span key={s.label}>
                <i className={`mxf-seg--${s.kind}`} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      {spec.annotations && spec.annotations.length > 0 && (
        <ul className="mxf-annots">
          {spec.annotations.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {spec.caption && <figcaption className="tpd-caption">{spec.caption}</figcaption>}
    </figure>
  )
}
