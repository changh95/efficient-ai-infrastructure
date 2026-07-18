import { Hero } from './sections/Hero'
import { Narrative } from './sections/Narrative'
import { Physics } from './sections/Physics'
import { Deployments } from './sections/Deployments'
import { ProofPoints } from './sections/ProofPoints'
import { Formula2026 } from './sections/Formula2026'
import { SourcesSection } from './sections/Sources'
import { Kofi } from './components/Kofi'
import './app.css'

const NAV: [string, string][] = [
  ['#story', '서사'],
  ['#physics', '물리학'],
  ['#deployments', '배치 사례'],
  ['#proof', '증거'],
  ['#formula', '2026 공식'],
  ['#sources', '출처'],
]

export default function App() {
  return (
    <>
      {/* prefill:decode ≈ 1:2 — 상단 액센트 바도 의미 색상을 따른다 */}
      <div className="accent-bar" aria-hidden="true" />
      <header className="site-head">
        <div className="wrap site-head-in">
          <a className="brand" href="#top">
            cv-learn<span>/</span>
            <em className="brand-sub">분산 추론 인프라 브리프</em>
          </a>
          <nav className="site-nav" aria-label="섹션 이동">
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <Kofi />
        </div>
      </header>
      <main id="top">
        <Hero />
        <Narrative />
        <Physics />
        <Deployments />
        <ProofPoints />
        <Formula2026 />
        <SourcesSection />
      </main>
      <footer className="site-foot">
        <div className="wrap">
          <p className="site-foot-legend" aria-hidden="true">
            <span className="swatch swatch--p" /> prefill
            <span className="swatch swatch--d" /> decode
            <span className="swatch swatch--s" /> 공유 인프라
          </p>
          <p>
            이 페이지의 모든 수치에는 출처 링크가 달려 있다. 자료 컴파일 기준일 2026-07-18 —
            이후의 릴리스는 반영되어 있지 않을 수 있다.
          </p>
          <p>
            <a href="https://www.cv-learn.com" target="_blank" rel="noreferrer noopener">
              www.cv-learn.com
            </a>{' '}
            · changh95.github.io/efficient-ai-infrastructure
          </p>
        </div>
      </footer>
    </>
  )
}
