import puppeteer from 'puppeteer-core'
const [,, width = '390', out = 'shot.png'] = process.argv
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage()
await page.setViewport({ width: Number(width), height: 900 })
await page.goto('http://localhost:4173/efficient-ai-infrastructure/', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: out, fullPage: true })
const h = await page.evaluate(() => document.documentElement.scrollHeight)
console.log('page height:', h)
await browser.close()
