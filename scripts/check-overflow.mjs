import puppeteer from 'puppeteer-core'

const URL = 'http://localhost:4173/efficient-ai-infrastructure/'
const WIDTHS = [390, 360, 768]

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})

for (const width of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const doc = document.documentElement.scrollWidth
    const offenders = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 || r.left < -1) {
        // 부모도 넘친 경우 최상위 원인만 남기기 위해 부모가 이미 offenders에 있으면 스킵하지 않고 다 수집 후 필터
        offenders.push({
          sel:
            el.tagName.toLowerCase() +
            (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).join('.')
              : ''),
          left: Math.round(r.left),
          right: Math.round(r.right),
          w: Math.round(r.width),
          text: (el.textContent || '').trim().slice(0, 40),
        })
      }
    }
    // 자식이 부모와 같은 오버플로우를 반복하는 걸 줄이기: right 값으로 그룹핑해 대표만
    const seen = new Set()
    const uniq = offenders.filter((o) => {
      const k = o.right + '|' + o.w
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    return { vw, doc, count: offenders.length, uniq: uniq.slice(0, 40) }
  })
  console.log(`\n===== viewport ${width}px — scrollWidth ${report.doc} (clientWidth ${report.vw}) — offenders ${report.count}`)
  for (const o of report.uniq) console.log(`  [${o.left}..${o.right}] w${o.w} ${o.sel} :: ${o.text}`)
  await page.close()
}

await browser.close()
