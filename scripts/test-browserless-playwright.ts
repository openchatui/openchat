import { chromium, type Browser, type Page } from 'playwright'

const TOKEN = '2T4arSVH9KeSA5Qd89cf5276bd2b0ead4465121e0838915da'
const BROWSERLESS_WS = `wss://production-sfo.browserless.io?token=${TOKEN}`
const DEFAULT_TIMEOUT_MS = 30_000

async function connectBrowserless(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.connectOverCDP(BROWSERLESS_WS)
  const defaultContext = browser.contexts()[0]
  const page = await defaultContext.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })
  return { browser, page }
}

// Tools (to be promoted later): navigate, click, type
async function navigate(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT_MS })
}

async function click(page: Page, selector: string) {
  await page.click(selector, { timeout: DEFAULT_TIMEOUT_MS })
}

async function type(page: Page, selector: string, text: string) {
  await page.fill(selector, text, { timeout: DEFAULT_TIMEOUT_MS })
}

async function main() {
  const { browser, page } = await connectBrowserless()
  try {
    // Test the helpers against Wikipedia
    await navigate(page, 'https://www.wikipedia.org/')
    await type(page, 'input#searchInput', 'Playwright')
    await page.press('input#searchInput', 'Enter')

    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT_MS })
    const title = await page.title()
    console.log('Page title:', title)

    // Optional: Screenshot for quick visual validation (viewport-only)
    await page.screenshot({ path: 'playwright-browserless-test.png' })
    console.log('Saved screenshot to playwright-browserless-test.png')
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

// Run if invoked directly
main().catch((err) => {
  console.error('Test run failed:', err)
  process.exitCode = 1
})

export { navigate, click, type }

