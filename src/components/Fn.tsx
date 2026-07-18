/** 각주형 출처 링크 — 모든 수치 옆에 붙인다. */
export function Fn({ label, url }: { label: string; url: string }) {
  return (
    <a className="fn" href={url} target="_blank" rel="noreferrer noopener" title={url}>
      [{label}]
    </a>
  )
}
