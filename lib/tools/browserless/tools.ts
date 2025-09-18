import { chromium, type Browser, type Page } from 'playwright'
import { tool } from 'ai'
import { z } from 'zod'

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_KEY || ''
const BROWSERLESS_WS = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}`
const DEFAULT_TIMEOUT_MS = 30_000
const VIEWPORT = { width: 1280, height: 720 }

let sharedBrowser: Browser | null = null
let sharedPage: Page | null = null

async function ensurePage(): Promise<Page> {
  if (!BROWSERLESS_TOKEN) {
    throw new Error('Missing BROWSERLESS_API_KEY environment variable')
  }
  if (!sharedBrowser) {
    sharedBrowser = await chromium.connectOverCDP(BROWSERLESS_WS)
  }
  if (!sharedPage) {
    const ctx = sharedBrowser.contexts()[0] || await sharedBrowser.newContext()
    sharedPage = await ctx.newPage()
    await sharedPage.setViewportSize(VIEWPORT)
    sharedPage.setDefaultTimeout(DEFAULT_TIMEOUT_MS)
  }
  return sharedPage
}

export const browserlessTools = {
  navigate: tool({
    description: 'Navigate the browser to a specific URL and wait for network to be idle',
    inputSchema: z.object({ url: z.string().url() }),
    execute: async ({ url }: { url: string }) => {
      const page = await ensurePage()
      await page.goto(url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT_MS })
      const title = await page.title()
      return `navigated to ${url} (title: ${title})`
    },
  }),

  click: tool({
    description: 'Click an element matching a CSS selector',
    inputSchema: z.object({ selector: z.string().min(1) }),
    execute: async ({ selector }: { selector: string }) => {
      const page = await ensurePage()
      await page.click(selector, { timeout: DEFAULT_TIMEOUT_MS })
      return `clicked "${selector}"`
    },
  }),

  type: tool({
    description: 'Type text into an input or editable element specified by a CSS selector',
    inputSchema: z.object({ selector: z.string().min(1), text: z.string() }),
    execute: async ({ selector, text }: { selector: string; text: string }) => {
      const page = await ensurePage()
      await page.fill(selector, text, { timeout: DEFAULT_TIMEOUT_MS })
      return `typed into "${selector}": ${JSON.stringify(text)}`
    },
  }),
}

export type BrowserlessTools = typeof browserlessTools

