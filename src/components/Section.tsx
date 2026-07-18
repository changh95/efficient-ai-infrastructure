import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  no?: string
  kicker: string
  title: ReactNode
  lede?: ReactNode
  tone?: 'tinted'
  children: ReactNode
}

export function Section({ id, no, kicker, title, lede, tone, children }: SectionProps) {
  return (
    <section id={id} className={`section${tone ? ` section--${tone}` : ''}`}>
      <div className="wrap">
        <header className="section-head">
          <p className="kicker">
            {no && <span className="kicker-no">§ {no}</span>}
            {kicker}
          </p>
          <h2 className="section-title">{title}</h2>
          {lede && <p className="lede">{lede}</p>}
        </header>
        {children}
      </div>
    </section>
  )
}
