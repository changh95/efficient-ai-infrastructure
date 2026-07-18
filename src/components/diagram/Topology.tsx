import { Fragment } from 'react'
import './diagram.css'

export type Role = 'prefill' | 'decode' | 'shared' | 'neutral'

export interface NodeGroup {
  /** 노드 박스 개수 */
  count: number
  /** 노드당 GPU(칩) 개수 — 전부 렌더링한다. '...' 생략 금지 */
  gpusPerNode: number
  /** 각 노드 박스에 표시할 라벨 (예: "8× H800") */
  nodeLabel?: string
  /** 칩 그리드 열 수 오버라이드 */
  chipCols?: number
}

export interface Pool {
  role: Role
  /** 기본값: PREFILL / DECODE / SHARED */
  tag?: string
  title: string
  subtitle?: string
  /** undisclosed 풀은 생략 가능 */
  groups?: NodeGroup[]
  stats?: string[]
  footer?: string
  /** 하드웨어 구성이 비공개인 경우 — 칩 대신 표시할 문구 */
  undisclosed?: string
  /** flex 비율 (풀 크기 비대칭 표현, 기본 1) */
  grow?: number
}

export interface DiagramConfig {
  /** 상단 회색 바 (라우터/스케줄러) */
  router?: string
  pools: Pool[]
  /** 풀 사이 화살표 라벨 (Prefill → Decode KV 전달) */
  arrow?: { label: string }
  /** 하단 회색 바 (Mooncake Store 등) */
  storeBar?: { title: string; subtitle?: string; arrows?: [string, string] }
  bottomLine?: string
  note?: string
}

const DEFAULT_TAG: Record<Role, string> = {
  prefill: 'PREFILL',
  decode: 'DECODE',
  shared: 'SHARED',
  neutral: 'POOL',
}

function chipCols(g: NodeGroup): number {
  if (g.chipCols) return g.chipCols
  if (g.gpusPerNode <= 4) return g.gpusPerNode
  if (g.gpusPerNode <= 8) return 4
  if (g.gpusPerNode <= 36) return 8
  return 12
}

function PoolBox({ pool }: { pool: Pool }) {
  const groups = pool.groups ?? []
  const totalChips = groups.reduce((s, g) => s + g.count * g.gpusPerNode, 0)
  const density = totalChips > 160 ? 'xdense' : totalChips > 72 ? 'dense' : 'normal'
  return (
    <div
      className={`tpd-pool tpd-pool--${pool.role} tpd-pool--${density}`}
      style={pool.grow !== undefined ? { flexGrow: pool.grow } : undefined}
    >
      <div className="tpd-pool-head">
        <span className="tpd-tag">{pool.tag ?? DEFAULT_TAG[pool.role]}</span>
        <span className="tpd-pool-title">{pool.title}</span>
      </div>
      {pool.subtitle && <div className="tpd-pool-sub">{pool.subtitle}</div>}
      {pool.undisclosed ? (
        <div className="tpd-undisclosed">{pool.undisclosed}</div>
      ) : (
        groups.map((g, gi) => (
          <div className="tpd-nodes" key={gi}>
            {Array.from({ length: g.count }, (_, ni) => (
              <div className="tpd-node" key={ni}>
                {g.nodeLabel && <span className="tpd-node-label">{g.nodeLabel}</span>}
                <div
                  className="tpd-chips"
                  aria-hidden="true"
                  style={{ gridTemplateColumns: `repeat(${chipCols(g)}, var(--chip))` }}
                >
                  {Array.from({ length: g.gpusPerNode }, (_, ci) => (
                    <i className="tpd-chip" key={ci} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
      {pool.stats?.map((s) => (
        <div className="tpd-stat" key={s}>
          {s}
        </div>
      ))}
      {pool.footer && <div className="tpd-pool-footer">{pool.footer}</div>}
    </div>
  )
}

export function TopologyDiagram({ config }: { config: DiagramConfig }) {
  const { router, pools, arrow, storeBar, bottomLine, note } = config
  // role="img"를 쓰지 않는다 — 풀 제목·노드 라벨·푸터·캡션이 그대로
  // 접근성 트리에 남아 다이어그램의 수치 정보를 전달한다. 칩 그리드만 장식으로 숨긴다.
  return (
    <figure className="tpd">
      {router && (
        <>
          <div className="tpd-router">{router}</div>
          <div className="tpd-vline" aria-hidden="true" />
        </>
      )}
      <div className="tpd-pools">
        {pools.map((p, i) => (
          <Fragment key={i}>
            {i > 0 && arrow && (
              <div className="tpd-arrow" aria-hidden="true">
                <span>{arrow.label}</span>
                <i />
              </div>
            )}
            <PoolBox pool={p} />
          </Fragment>
        ))}
      </div>
      {storeBar && (
        <>
          {storeBar.arrows && (
            <div className="tpd-store-arrows" aria-hidden="true">
              <span className="tpd-store-arrow tpd-store-arrow--down">{storeBar.arrows[0]} ↓</span>
              <span className="tpd-store-arrow tpd-store-arrow--up">↑ {storeBar.arrows[1]}</span>
            </div>
          )}
          <div className="tpd-store">
            <strong>{storeBar.title}</strong>
            {storeBar.subtitle && <span>{storeBar.subtitle}</span>}
          </div>
        </>
      )}
      {bottomLine && <figcaption className="tpd-caption">{bottomLine}</figcaption>}
      {note && <div className="tpd-note">{note}</div>}
    </figure>
  )
}
