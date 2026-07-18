import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    kofiwidget2?: {
      init: (text: string, color: string, id: string) => void
      getHTML: () => string
    }
  }
}

/** Ko-fi 후원 버튼 — 위젯 스크립트는 index.html에서 로드된다 */
export function Kofi() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let tries = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      if (window.kofiwidget2) {
        window.kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'R1I023FJP0')
        el.innerHTML = window.kofiwidget2.getHTML()
      } else if (tries++ < 50) {
        timer = setTimeout(tick, 100)
      }
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  return <div className="kofi" ref={ref} />
}
