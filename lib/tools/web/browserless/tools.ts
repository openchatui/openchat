import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'
import { tool } from 'ai'
import { z } from 'zod'

export interface BrowserlessAdvancedParams {
  token: string
  route?: string
  stealth?: boolean
  stealthRoute?: boolean
  blockAds?: boolean
  headless?: boolean
  locale?: string
  timezone?: string
  userAgent?: string
}

const DEFAULT_TIMEOUT_MS = 30_000
const VIEWPORT_CANDIDATES = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
]

// Locale/timezone and UA tuning to reduce bot detection
function resolveLocale(p?: string) { return p || 'en-US' }
function resolveTimezone(p?: string) { return p || 'America/Los_Angeles' }

const USER_AGENTS: string[] = [
  // Recent stable Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  // Recent stable Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  // Recent stable Chrome on Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
]

function chooseUserAgent(overrideUA?: string): string {
  if (overrideUA) return overrideUA
  const index = Math.floor(Math.random() * USER_AGENTS.length)
  return USER_AGENTS[index]
}

function chooseViewport() {
  const index = Math.floor(Math.random() * VIEWPORT_CANDIDATES.length)
  return VIEWPORT_CANDIDATES[index]
}

async function applyStealth(context: BrowserContext, enabled: boolean) {
  if (!enabled) return
  await context.addInitScript(() => {
    // webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    // chrome runtime object
    ;(window as any).chrome = (window as any).chrome || { runtime: {} }
    // languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
    // plugins
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    // hardwareConcurrency & deviceMemory
    try {
      const cores = Math.floor(Math.random() * 8) + 4 // 4-12
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores })
    } catch {}
    try {
      const mem = [4, 8, 16][Math.floor(Math.random() * 3)]
      Object.defineProperty((navigator as any), 'deviceMemory', { get: () => mem })
    } catch {}
    // platform spoof
    try {
      const platforms = ['Win32', 'MacIntel', 'Linux x86_64']
      const p = platforms[Math.floor(Math.random() * platforms.length)]
      Object.defineProperty(navigator, 'platform', { get: () => p })
    } catch {}
    // permissions
    const originalQuery = (navigator.permissions as any).query
    ;(navigator.permissions as any).query = (parameters: any) => {
      if (parameters && parameters.name === 'notifications') {
        return Promise.resolve({ state: 'denied' })
      }
      return originalQuery(parameters)
    }
    // WebGL vendor/renderer spoofing (basic)
    const getParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function (parameter: any) {
      // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
      if (parameter === 37445) return 'Google Inc.'
      if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce, D3D11)'
      return getParameter.call(this, parameter)
    }
  })
}

export function createBrowserlessTools(params: BrowserlessAdvancedParams) {
  const token = String(params.token || '')
  const wsParams = new URLSearchParams()
  if (token) wsParams.set('token', token)
  if (params.stealth !== false) wsParams.set('stealth', 'true')
  if (params.blockAds) wsParams.set('blockAds', 'true')
  if (params.headless === false) wsParams.set('headless', 'false')
  const route = params.route || (params.stealthRoute ? 'chromium/stealth' : 'chromium')
  const BROWSERLESS_WS = `wss://production-sfo.browserless.io/${route}?${wsParams.toString()}`

  const LOCALE = resolveLocale(params.locale)
  const TIMEZONE = resolveTimezone(params.timezone)
  const OVERRIDE_UA = params.userAgent

  let sharedBrowser: Browser | null = null
  let sharedPage: Page | null = null
  let sharedLiveURL: string | null = null

  async function ensurePage(): Promise<Page> {
    if (!token) {
      throw new Error('Missing Browserless token')
    }
    if (!sharedBrowser) {
      sharedBrowser = await chromium.connectOverCDP(BROWSERLESS_WS)
    }
    if (!sharedPage) {
      const ctx = sharedBrowser.contexts()[0] || await sharedBrowser.newContext({
        userAgent: chooseUserAgent(OVERRIDE_UA || undefined),
        locale: LOCALE,
        timezoneId: TIMEZONE,
        viewport: chooseViewport(),
        deviceScaleFactor: [1, 1.25, 1.5, 2][Math.floor(Math.random() * 4)],
        hasTouch: Math.random() < 0.2,
        extraHTTPHeaders: {
          'Accept-Language': LOCALE,
          'Sec-CH-UA-Platform': '"Windows"',
        },
      })
      await applyStealth(ctx, params.stealth !== false)
      sharedPage = await ctx.newPage()
      sharedPage.setDefaultTimeout(DEFAULT_TIMEOUT_MS)
    }
    return sharedPage
  }

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function humanizePageInteraction(page: Page) {
  // Random small delay
  await page.waitForTimeout(randomInt(200, 1200))
  // Occasional scroll
  if (Math.random() < 0.7) {
    const delta = randomInt(200, 1200)
    await page.mouse.wheel(0, delta)
  }
  // Occasional mouse move
  if (Math.random() < 0.6) {
    const vx = randomInt(20, 1200)
    const vy = randomInt(20, 700)
    await page.mouse.move(vx, vy, { steps: randomInt(5, 25) })
  }
}

  async function ensureLiveURL(options?: { timeoutMs?: number; showBrowserInterface?: boolean; quality?: number; resizable?: boolean }): Promise<string> {
  if (sharedLiveURL && typeof sharedLiveURL === 'string' && sharedLiveURL.length > 0) {
    return sharedLiveURL
  }
  const page = await ensurePage()
  const cdp = await page.context().newCDPSession(page as any)
  const params: any = { timeout: typeof options?.timeoutMs === 'number' ? options.timeoutMs : 300_000 }
  if (typeof options?.showBrowserInterface === 'boolean') params.showBrowserInterface = options.showBrowserInterface
  if (typeof options?.quality === 'number') params.quality = options.quality
  if (typeof options?.resizable === 'boolean') params.resizable = options.resizable
  const res = await (cdp as any).send('Browserless.liveURL', params)
  const liveURL: string | undefined = res?.liveURL
  if (typeof liveURL === 'string' && liveURL.length > 0) {
    sharedLiveURL = liveURL
    return liveURL
  }
  throw new Error('Browserless.liveURL did not return a URL')
  }

  return {
  navigate: tool({
    description: 'Navigate the browser to a specific URL and wait for network to be idle',
    inputSchema: z.object({ url: z.string().url() }),
    execute: async ({ url }: { url: string }) => {
      const page = await ensurePage()
      await page.goto(url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT_MS })
      let liveURL = ''
      try {
        liveURL = await ensureLiveURL()
      } catch {}
      return { html: '', summary: `navigated to ${url}`, url: liveURL || url }
    },
  }),

  listAnchors: tool({
    description: 'Return anchor links (<a> tags) from the current page with href, text and metadata',
    inputSchema: z.object({
      max: z.number().int().min(1).max(200).optional(),
      nearViewportOnly: z.boolean().optional(),
    }),
    execute: async ({ max, nearViewportOnly }: { max?: number; nearViewportOnly?: boolean }) => {
      const page = await ensurePage()
      const limit = Math.max(1, Math.min(200, max ?? 100))
      const anchors = await page.evaluate(({ limit, nearViewportOnly }) => {
        const isVisible = (el: Element) => {
          const rect = (el as HTMLElement).getBoundingClientRect()
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) return false
          if (rect.width === 0 || rect.height === 0) return false
          return true
        }

        const inViewport = (el: Element) => {
          const r = (el as HTMLElement).getBoundingClientRect()
          const vpH = window.innerHeight || document.documentElement.clientHeight
          const vpW = window.innerWidth || document.documentElement.clientWidth
          return r.bottom >= 0 && r.right >= 0 && r.top <= vpH && r.left <= vpW
        }

        const normalizeHref = (a: HTMLAnchorElement) => {
          try { return a.href || '' } catch { return '' }
        }

        const textSnippet = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)

        const list = Array.from(document.querySelectorAll('a[href]'))
          .map(el => {
            const a = el as HTMLAnchorElement
            const href = normalizeHref(a)
            const txt = textSnippet(a)
            const rect = (a as HTMLElement).getBoundingClientRect()
            const vis = isVisible(a)
            const inView = inViewport(a)
            const rel = (a.getAttribute('rel') || '').trim() || undefined
            const target = a.getAttribute('target') || undefined
            const title = a.getAttribute('title') || undefined
            const aria = a.getAttribute('aria-label') || undefined
            const nofollow = typeof rel === 'string' && /(^|\s)nofollow(\s|$)/i.test(rel)
            const external = (() => {
              try { return new URL(href, location.href).host !== location.host } catch { return false }
            })()
            return {
              href,
              text: txt || aria || title || href,
              title,
              ariaLabel: aria,
              rel,
              target,
              nofollow,
              external,
              visible: vis,
              inViewport: inView,
              bbox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            }
          })

        // Filter/sort/dedupe
        const filtered = list.filter(it => (nearViewportOnly ? it.inViewport : true))
        const score = (it: any) => (it.visible ? 3 : 0) + (it.inViewport ? 2 : 0) + (it.text ? 1 : 0) + (it.external ? 0 : 1)
        const sorted = filtered.sort((a, b) => score(b) - score(a))
        const seen = new Set<string>()
        const out: any[] = []
        for (const it of sorted) {
          const key = it.href + '|' + it.text
          if (seen.has(key)) continue
          seen.add(key)
          out.push(it)
          if (out.length >= limit) break
        }
        return out
      }, { limit, nearViewportOnly: Boolean(nearViewportOnly) })

      const currentUrl = page.url()
      let liveURL = ''
      try { liveURL = await ensureLiveURL() } catch {}
      const summary = `anchors (${anchors.length})`
      return { summary, url: liveURL || currentUrl, details: { anchors } as any }
    },
  }),

  click: tool({
    description: 'Click an element matching a CSS selector',
    inputSchema: z.object({ selector: z.string().min(1) }),
    execute: async ({ selector }: { selector: string }) => {
      const page = await ensurePage()
      const timeout = 20_000
      let methodUsed: 'locator-click' | 'js-click' | 'frame-click' = 'locator-click'
      let frameUrl: string | undefined
      const tryClickIn = async (targetPage: Page) => {
        const loc = targetPage.locator(selector).first()
        await loc.waitFor({ state: 'attached', timeout })
        try { await loc.scrollIntoViewIfNeeded() } catch {}
        // Trial to ensure actionability
        try { await loc.click({ trial: true, timeout: 2_000 }) } catch {}
        await loc.click({ timeout })
      }
      try {
        await tryClickIn(page)
      } catch (errMain: any) {
        // Fallback 1: JS click in main page
        try {
          methodUsed = 'js-click'
          await page.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLElement | null
            if (!el) throw new Error('element not found')
            el.click()
          }, selector)
        } catch (errJs: any) {
          // Fallback 2: search and click inside frames
          methodUsed = 'frame-click'
          let clicked = false
          for (const f of page.frames()) {
            try {
              await tryClickIn(f as any)
              frameUrl = f.url()
              clicked = true
              break
            } catch {}
          }
          if (!clicked) {
            const summaryErr = `click error on ${selector}: ${String(errJs?.message || errMain?.message || 'unknown')}`
            const currentUrlErr = page.url()
            return { summary: summaryErr, url: currentUrlErr }
          }
        }
      }
      const currentUrl = page.url()
      const summary = `clicked "${selector}" via ${methodUsed}`
      await humanizePageInteraction(page)
      let liveURL = ''
      try {
        liveURL = await ensureLiveURL()
      } catch {}
      return { summary, url: liveURL || currentUrl, details: { liveURL: liveURL || undefined, currentUrl, selector, methodUsed, frameUrl } as any }
    },
  }),

  type: tool({
    description: 'Type text into an input or editable element specified by a CSS selector',
    inputSchema: z.object({ selector: z.string().min(1), text: z.string() }),
    execute: async ({ selector, text }: { selector: string; text: string }) => {
      const page = await ensurePage()
      const target = page.locator(selector).first()
      let methodUsed: 'fill' | 'keyboard' | 'fallback' = 'fill'
      try {
        await target.waitFor({ state: 'attached', timeout: DEFAULT_TIMEOUT_MS })
        try { await target.scrollIntoViewIfNeeded() } catch {}
        await target.fill(text, { timeout: DEFAULT_TIMEOUT_MS })
      } catch (fillErr: any) {
        methodUsed = 'keyboard'
        try {
          await target.click({ timeout: DEFAULT_TIMEOUT_MS })
          try {
            await page.keyboard.press('Control+A')
            await page.keyboard.press('Backspace')
          } catch {}
          await page.keyboard.type(text)
        } catch (kbErr: any) {
          methodUsed = 'fallback'
          try {
            await target.evaluate((el, value) => {
              const anyEl = el as any
              if (anyEl && typeof anyEl.isContentEditable === 'boolean' && anyEl.isContentEditable) {
                anyEl.innerText = value
              } else if (anyEl && 'value' in anyEl) {
                anyEl.value = value
                anyEl.dispatchEvent(new Event('input', { bubbles: true }))
                anyEl.dispatchEvent(new Event('change', { bubbles: true }))
              }
            }, text)
          } catch (finalErr: any) {
            const currentUrlErr = page.url()
            const summaryErr = `type error on ${selector}: ${String(finalErr?.message || kbErr?.message || fillErr?.message || 'unknown')}`
            return { summary: summaryErr, url: currentUrlErr }
          }
        }
      }
      const currentUrl = page.url()
      const summary = `typed into "${selector}" via ${methodUsed}: ${JSON.stringify(text)}`
      await humanizePageInteraction(page)
      let liveURL = ''
      try {
        liveURL = await ensureLiveURL()
      } catch {}
      return { summary, url: liveURL || currentUrl, details: { liveURL: liveURL || undefined, currentUrl, selector, methodUsed } as any }
    },
  }),

  keyPress: tool({
    description: 'Press a keyboard key (e.g., Enter, ArrowDown, Control+A)',
    inputSchema: z.object({ key: z.string().min(1), delayMs: z.number().int().min(0).max(2000).optional() }),
    execute: async ({ key, delayMs }: { key: string; delayMs?: number }) => {
      const page = await ensurePage()
      const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => null)
      await page.keyboard.press(key, typeof delayMs === 'number' ? { delay: delayMs } : undefined)
      await navPromise
      let html = ''
      try {
        html = await page.content()
      } catch {
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 3_000 } as any)
          html = await page.content()
        } catch {
          // ignore; keep html as empty string
        }
      }
      const currentUrl = page.url()
      const summary = `pressed "${key}"`
      await humanizePageInteraction(page)
      let liveURL = ''
      try {
        liveURL = await ensureLiveURL()
      } catch {}
      return { summary, url: liveURL || currentUrl, details: { liveURL: liveURL || undefined, currentUrl, key, delayMs } as any }
    },
  }),

  // getPageHtml: tool({
  //   description: 'Get the full HTML of the current page',
  //   inputSchema: z.object({}),
  //   execute: async () => {
  //     const page = await ensurePage()
  //     const html = await page.content()
  //     const currentUrl = page.url()
  //     let liveURL = ''
  //     try { liveURL = await ensureLiveURL() } catch {}
  //     const summary = 'page html fetched'
  //     return { html, summary, url: liveURL || currentUrl }
  //   },
  // }),

  sessionEnd: tool({
    description: 'ALWAYS USE AT THE END OF A SESSION. THIS IS REQUIRED. Close the current Browserless browser session and clear cached references',
    inputSchema: z.object({}),
    execute: async () => {
      const hadBrowser = Boolean(sharedBrowser)
      try { if (sharedBrowser) await sharedBrowser.close() } catch {}
      sharedBrowser = null
      sharedPage = null
      sharedLiveURL = null
      const summary = hadBrowser ? 'browser session closed' : 'no active browser session'
      return { html: '', summary, url: '' }
    },
  }),

  captchaWait: tool({
    description: 'Wait for a CAPTCHA to be detected using Browserless.captchaFound CDP event',
    inputSchema: z.object({ timeoutMs: z.number().int().positive().max(300_000).optional() }),
    execute: async ({ timeoutMs }: { timeoutMs?: number }) => {
      const page = await ensurePage()
      const cdp = await page.context().newCDPSession(page as any)
      const waitMs = typeof timeoutMs === 'number' ? timeoutMs : DEFAULT_TIMEOUT_MS

      const detected = await new Promise<boolean>((resolve) => {
        let done = false
        const onFound = () => {
          if (done) return
          done = true
          resolve(true)
        }
        // Listen for Browserless captcha detection
        ;(cdp as any).on?.('Browserless.captchaFound', onFound)
        ;(cdp as any).on?.('Browserless.foundCaptcha', onFound)
        setTimeout(() => {
          if (done) return
          done = true
          resolve(false)
        }, waitMs)
      })

      const html = await page.content()
      let liveURL = ''
      try {
        liveURL = await ensureLiveURL()
      } catch {}
      const url = liveURL || page.url()
      const summary = detected ? 'captcha detected' : 'no captcha detected within timeout'
      return { summary, url, details: { detected, timeoutMs: waitMs, liveURL: liveURL || undefined } as any }
    },
  }),

  // captchaWaitForUser: tool({
  //   description: 'Detect CAPTCHA, ensure LiveURL, then wait for user to complete the live session before continuing',
  //   inputSchema: z.object({
  //     appearTimeoutMs: z.number().int().positive().max(600_000).optional(),
  //     completeTimeoutMs: z.number().int().positive().max(600_000).optional(),
  //     showBrowserInterface: z.boolean().optional(),
  //     quality: z.number().int().min(1).max(100).optional(),
  //     resizable: z.boolean().optional(),
  //   }),
  //   execute: async ({ appearTimeoutMs, completeTimeoutMs, showBrowserInterface, quality, resizable }: { appearTimeoutMs?: number; completeTimeoutMs?: number; showBrowserInterface?: boolean; quality?: number; resizable?: boolean }) => {
  //     const page = await ensurePage()
  //     const cdp = await page.context().newCDPSession(page as any)

  //     // Ensure user can intervene via LiveURL
  //     let liveURL = ''
  //     try {
  //       liveURL = await ensureLiveURL({ timeoutMs: 30_000, showBrowserInterface, quality, resizable })
  //     } catch {}

  //     // Phase 1: wait for captcha detection
  //     const appearMs = typeof appearTimeoutMs === 'number' ? appearTimeoutMs : 120_000
  //     const detected = await new Promise<boolean>((resolve) => {
  //       let done = false
  //       const onFound = () => {
  //         if (done) return
  //         done = true
  //         resolve(true)
  //       }
  //       ;(cdp as any).on?.('Browserless.captchaFound', onFound)
  //       ;(cdp as any).on?.('Browserless.foundCaptcha', onFound)
  //       setTimeout(() => {
  //         if (done) return
  //         done = true
  //         resolve(false)
  //       }, appearMs)
  //     })

  //     if (!detected) {
  //       const html0 = await page.content()
  //       const url0 = liveURL || page.url()
  //       return { summary: 'no captcha detected within timeout', url: url0, details: { detected: false, appearTimeoutMs: appearMs, liveURL: liveURL || undefined } as any }
  //     }

  //     // Phase 2: wait for user to complete (Hybrid Automation event)
  //     const completeMs = typeof completeTimeoutMs === 'number' ? completeTimeoutMs : 300_000
  //     const completed = await new Promise<boolean>((resolve) => {
  //       let finished = false
  //       const onComplete = () => {
  //         if (finished) return
  //         finished = true
  //         resolve(true)
  //       }
  //       ;(cdp as any).on?.('Browserless.liveComplete', onComplete)
  //       setTimeout(() => {
  //         if (finished) return
  //         finished = true
  //         resolve(false)
  //       }, completeMs)
  //     })

  //     const html = await page.content()
  //     const url = liveURL || page.url()
  //     const summary = completed ? 'captcha solved by user' : 'waiting for user timed out'
  //     return { html, summary, url, details: { detected: true, completed, appearTimeoutMs: appearMs, completeTimeoutMs: completeMs, liveURL: liveURL || undefined } as any }
  //   },
  // }),

  listSelectors: tool({
    description: 'Return a compact catalog of actionable DOM elements (selectors and labels)',
    inputSchema: z.object({ max: z.number().int().min(1).max(200).optional(), nearViewportOnly: z.boolean().optional() }),
    execute: async ({ max, nearViewportOnly }: { max?: number; nearViewportOnly?: boolean }) => {
      const page = await ensurePage()
      const limit = Math.max(1, Math.min(200, max ?? 80))
      const catalog = await page.evaluate(({ limit, nearViewportOnly }) => {
        const isVisible = (el: Element) => {
          const rect = (el as HTMLElement).getBoundingClientRect()
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) return false
          if (rect.width === 0 || rect.height === 0) return false
          return true
        }

        const inViewport = (el: Element) => {
          const r = (el as HTMLElement).getBoundingClientRect()
          const vpH = window.innerHeight || document.documentElement.clientHeight
          const vpW = window.innerWidth || document.documentElement.clientWidth
          return r.bottom >= 0 && r.right >= 0 && r.top <= vpH && r.left <= vpW
        }

        const textSnippet = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)

        const escapeAttr = (v?: string | null) => (v || '').replace(/"/g, '\\"')

        function shortestUniqueSelector(el: Element): string {
          if (!(el instanceof Element)) return ''
          const id = (el as HTMLElement).id
          if (id) return `#${CSS.escape(id)}`
          const testid = el.getAttribute('data-testid')
          if (testid) return `[data-testid="${escapeAttr(testid)}"]`
          const aria = el.getAttribute('aria-label')
          if (aria) return `[aria-label="${escapeAttr(aria)}"]`
          const name = el.getAttribute('name')
          if (name) return `${el.tagName.toLowerCase()}[name="${escapeAttr(name)}"]`
          const cls = ((el as HTMLElement).className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
          if (cls.length > 0) return `${el.tagName.toLowerCase()}.${cls.map(c => CSS.escape(c)).join('.')}`
          return el.tagName.toLowerCase()
        }

        const candidates = Array.from(document.querySelectorAll(
          'a, button, [role="button"], input, textarea, select, [onclick], [data-testid], [aria-label], [contenteditable=""], [contenteditable="true"]'
        ))

        const items = candidates.map(el => {
          const tag = el.tagName.toLowerCase()
          const sel = shortestUniqueSelector(el)
          const lab = textSnippet(el) || el.getAttribute('aria-label') || el.getAttribute('data-testid') || sel
          const rect = (el as HTMLElement).getBoundingClientRect()
          const vis = isVisible(el)
          const inView = inViewport(el)
          const role = el.getAttribute('role') || undefined
          const href = (el as HTMLAnchorElement).href || undefined
          const type = el.getAttribute('type') || undefined
          return {
            selector: sel,
            label: lab,
            tag,
            role,
            href,
            type,
            visible: vis,
            inViewport: inView,
            bbox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          }
        })

        // Rank: visible + inViewport first, then by area descending, then by presence of semantic attrs
        const score = (it: any) => (
          (it.visible ? 4 : 0) + (it.inViewport ? 3 : 0) + (it.role ? 1 : 0) + (it.href ? 1 : 0)
        ) * Math.max(1, it.bbox.w * it.bbox.h)

        const filtered = items
          .filter(it => (nearViewportOnly ? it.inViewport : true))
          .sort((a, b) => score(b) - score(a))

        // Deduplicate on selector/label
        const seen = new Set<string>()
        const out: any[] = []
        for (const it of filtered) {
          const key = `${it.selector}|${it.label}`
          if (seen.has(key)) continue
          seen.add(key)
          out.push(it)
          if (out.length >= limit) break
        }

        return out
      }, { limit, nearViewportOnly: Boolean(nearViewportOnly) })

      const currentUrl = page.url()
      let liveURL = ''
      try { liveURL = await ensureLiveURL() } catch {}
      const summary = `selectors catalog (${catalog.length})`
      return { summary, url: liveURL || currentUrl, details: { selectors: catalog } as any }
    },
  }),

  // selectorContext: tool({
  //   description: 'Fetch trimmed context for a selector: outerHTML and nearby elements summaries',
  //   inputSchema: z.object({ selector: z.string().min(1), neighbors: z.number().int().min(0).max(5).optional() }),
  //   execute: async ({ selector, neighbors }: { selector: string; neighbors?: number }) => {
  //     const page = await ensurePage()
  //     const neigh = Math.max(0, Math.min(5, neighbors ?? 2))
  //     const ctx = await page.evaluate(({ selector, neigh }) => {
  //       const el = document.querySelector(selector)
  //       if (!el) return { found: false }
  //       const serialize = (node: Element) => {
  //         const html = node.outerHTML
  //           .replace(/\s+/g, ' ')
  //           .replace(/>\s+</g, '><')
  //           .slice(0, 1000)
  //         return html
  //       }
  //       const textSnip = (node: Element) => (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
  //       const parent = el.parentElement
  //       const siblings = parent ? Array.from(parent.children) : []
  //       const idx = siblings.indexOf(el)
  //       const sibPrev = siblings.slice(Math.max(0, idx - neigh), idx)
  //       const sibNext = siblings.slice(idx + 1, Math.min(siblings.length, idx + 1 + neigh))
  //       return {
  //         found: true,
  //         outerHTML: serialize(el),
  //         parentHTML: parent ? serialize(parent) : undefined,
  //         siblingsBefore: sibPrev.map(serialize),
  //         siblingsAfter: sibNext.map(serialize),
  //         text: textSnip(el),
  //       }
  //     }, { selector, neigh })

  //     const currentUrl = page.url()
  //     let liveURL = ''
  //     try { liveURL = await ensureLiveURL() } catch {}
  //     const summary = ctx?.found ? 'selector context fetched' : 'selector not found'
  //     return { summary, url: liveURL || currentUrl, details: ctx as any }
  //   },
  // }),

  // querySelectors: tool({
  //   description: 'Search actionable selectors by keyword across labels and attributes',
  //   inputSchema: z.object({ query: z.string().min(1), max: z.number().int().min(1).max(200).optional() }),
  //   execute: async ({ query, max }: { query: string; max?: number }) => {
  //     const page = await ensurePage()
  //     const limit = Math.max(1, Math.min(200, max ?? 40))
  //     const q = query.toLowerCase()
  //     const matches = await page.evaluate(({ q, limit }) => {
  //       const textSnippet = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  //       const escapeAttr = (v?: string | null) => (v || '').replace(/"/g, '\\"')
  //       function shortestUniqueSelector(el: Element): string {
  //         if (!(el instanceof Element)) return ''
  //         const id = (el as HTMLElement).id
  //         if (id) return `#${CSS.escape(id)}`
  //         const testid = el.getAttribute('data-testid')
  //         if (testid) return `[data-testid="${escapeAttr(testid)}"]`
  //         const aria = el.getAttribute('aria-label')
  //         if (aria) return `[aria-label="${escapeAttr(aria)}"]`
  //         const name = el.getAttribute('name')
  //         if (name) return `${el.tagName.toLowerCase()}[name="${escapeAttr(name)}"]`
  //         const cls = ((el as HTMLElement).className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  //         if (cls.length > 0) return `${el.tagName.toLowerCase()}.${cls.map(c => CSS.escape(c)).join('.')}`
  //         return el.tagName.toLowerCase()
  //       }
  //       const all = Array.from(document.querySelectorAll(
  //         'a, button, [role="button"], input, textarea, select, [onclick], [data-testid], [aria-label], [contenteditable=""], [contenteditable="true"]'
  //       ))
  //       const scored = all.map(el => {
  //         const sel = shortestUniqueSelector(el)
  //         const label = textSnippet(el) || el.getAttribute('aria-label') || el.getAttribute('data-testid') || sel
  //         const hay = [label, el.getAttribute('aria-label') || '', el.getAttribute('data-testid') || '', sel].join(' ').toLowerCase()
  //         const score = hay.includes(q) ? (label.length ? 2 : 1) + (el.getAttribute('data-testid') ? 1 : 0) + (el.getAttribute('aria-label') ? 1 : 0) : 0
  //         return { selector: sel, label, score }
  //       })
  //       const filt = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score)
  //       const seen = new Set<string>()
  //       const out: any[] = []
  //       for (const it of filt) {
  //         const k = `${it.selector}|${it.label}`
  //         if (seen.has(k)) continue
  //         seen.add(k)
  //         out.push(it)
  //         if (out.length >= limit) break
  //       }
  //       return out
  //     }, { q, limit })

  //     const currentUrl = page.url()
  //     let liveURL = ''
  //     try { liveURL = await ensureLiveURL() } catch {}
  //     const summary = `selector query matches (${matches.length})`
  //     return { summary, url: liveURL || currentUrl, details: { matches } as any }
  //   },
  // })
  }
}

export type BrowserlessTools = ReturnType<typeof createBrowserlessTools>

