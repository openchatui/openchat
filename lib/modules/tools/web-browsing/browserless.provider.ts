
import { tool } from 'ai';
import { z } from 'zod';
import {
  chromium,
  type Browser,
  type Page,
  type BrowserContext,
} from "playwright";
import { WebBrowsingService } from './web.service';
import {
  NavigateInputSchema,
  ClickInputSchema,
  TypeInputSchema,
  KeyPressInputSchema,
  ListSelectorsInputSchema,
  ListAnchorsInputSchema,
  GetTextInputSchema,
  CaptchaWaitInputSchema,
  SessionEndInputSchema,
} from './web.types';

/**
 * Browserless Provider Implementation
 */
export class BrowserlessProvider {
  private static sharedBrowser: Browser | null = null;
  private static sharedPage: Page | null = null;
  private static sharedLiveURL: string | null = null;
  
  private static readonly DEFAULT_TIMEOUT_MS = 30_000;
  private static readonly VIEWPORT_CANDIDATES = [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 800 },
  ];

  private static readonly USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  ];

  /**
   * Choose random user agent
   */
  private static chooseUserAgent(overrideUA?: string): string {
    if (overrideUA) return overrideUA;
    const index = Math.floor(Math.random() * this.USER_AGENTS.length);
    return this.USER_AGENTS[index];
  }

  /**
   * Choose random viewport
   */
  private static chooseViewport() {
    const index = Math.floor(Math.random() * this.VIEWPORT_CANDIDATES.length);
    return this.VIEWPORT_CANDIDATES[index];
  }

  /**
   * Ensure browser page is available
   */
  private static async ensurePage(): Promise<Page> {
    const config = await WebBrowsingService.getBrowserlessConfig();
    if (!config?.token) {
      throw new Error("Missing Browserless token");
    }

    if (!this.sharedBrowser) {
      const wsParams = new URLSearchParams();
      wsParams.set("token", config.token);
      if (config.settings?.stealth !== false) wsParams.set("stealth", "true");
      if (config.settings?.blockAds) wsParams.set("blockAds", "true");
      if (config.settings?.headless === false) wsParams.set("headless", "false");
      
      const route = config.settings?.route || 
                   (config.settings?.stealthRoute ? "chromium/stealth" : "chromium");
      const wsUrl = `wss://production-sfo.browserless.io/${route}?${wsParams.toString()}`;

      this.sharedBrowser = await chromium.connectOverCDP(wsUrl);
    }

    if (!this.sharedPage) {
      const ctx = this.sharedBrowser.contexts()[0] || 
                  (await this.sharedBrowser.newContext({
                    userAgent: this.chooseUserAgent(config.settings?.userAgent),
                    locale: config.settings?.locale || 'en-US',
                    timezoneId: config.settings?.timezone || 'America/Los_Angeles',
                    viewport: this.chooseViewport(),
                    deviceScaleFactor: [1, 1.25, 1.5, 2][Math.floor(Math.random() * 4)],
                    hasTouch: Math.random() < 0.2,
                    extraHTTPHeaders: {
                      "Accept-Language": config.settings?.locale || 'en-US',
                      "Sec-CH-UA-Platform": '"Windows"',
                    },
                  }));

      this.sharedPage = await ctx.newPage();
      this.sharedPage.setDefaultTimeout(this.DEFAULT_TIMEOUT_MS);
    }

    return this.sharedPage;
  }

  /**
   * Ensure Live URL is available (cached)
   */
  private static async ensureLiveURL(options?: { timeoutMs?: number; showBrowserInterface?: boolean; quality?: number; resizable?: boolean; }): Promise<string> {
    if (this.sharedLiveURL && typeof this.sharedLiveURL === 'string' && this.sharedLiveURL.length > 0) {
      return this.sharedLiveURL;
    }
    const page = await this.ensurePage();
    const cdp = await page.context().newCDPSession(page);
    type GenericCDPSession = { send: (method: string, params?: Record<string, unknown>) => Promise<unknown>; on?: (event: string, handler: (params: unknown) => void) => void };
    const params = { timeout: typeof options?.timeoutMs === 'number' ? options.timeoutMs : 300_000 } as Record<string, unknown>;
    if (typeof options?.showBrowserInterface === 'boolean') params.showBrowserInterface = options.showBrowserInterface;
    if (typeof options?.quality === 'number') params.quality = options.quality;
    if (typeof options?.resizable === 'boolean') params.resizable = options.resizable;
    const resUnknown = await (cdp as GenericCDPSession).send('Browserless.liveURL', params);
    const resObj = (resUnknown && typeof resUnknown === 'object') ? (resUnknown as Record<string, unknown>) : {};
    const liveURL: string | undefined = typeof resObj['liveURL'] === 'string' ? (resObj['liveURL'] as string) : undefined;
    if (typeof liveURL === 'string' && liveURL.length > 0) {
      this.sharedLiveURL = liveURL;
      return liveURL;
    }
    throw new Error('Browserless.liveURL did not return a URL');
  }

  /**
   * Create navigate tool
   */
  static createNavigateTool() {
    return tool({
      description: "Navigate the browser to a specific URL and wait for network to be idle",
      inputSchema: NavigateInputSchema,
      execute: async ({ url }: { url: string }) => {
        const page = await this.ensurePage();
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: this.DEFAULT_TIMEOUT_MS,
        });

        const liveURL = await this.ensureLiveURL();
        return {
          summary: `navigated to ${url}`,
          url: liveURL,
          details: { pageURL: page.url() },
        };
      },
    });
  }

  

  /**
   * Create click tool
   */
  static createClickTool() {
    return tool({
      description: "Click an element matching a CSS selector",
      inputSchema: ClickInputSchema,
      execute: async ({ selector }: { selector: string }) => {
        const page = await this.ensurePage();
        let liveURL: string | undefined;
        try {
          liveURL = await this.ensureLiveURL();
        } catch {}

        try {
          const element = page.locator(selector).first();
          await element.waitFor({ state: "attached", timeout: 20_000 });
          await element.scrollIntoViewIfNeeded();
          await element.click({ timeout: 20_000 });
          
          return {
            summary: `clicked "${selector}"`,
            url: liveURL || page.url(),
            details: { pageURL: page.url() },
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            summary: `click error on ${selector}: ${message}`,
            url: liveURL || page.url(),
            error: message,
            details: { pageURL: page.url() },
          };
        }
      },
    });
  }

  /**
   * Create type tool
   */
  static createTypeTool() {
    return tool({
      description: "Type text into an input or editable element specified by a CSS selector",
      inputSchema: TypeInputSchema,
      execute: async ({ selector, text }: { selector: string; text: string }) => {
        const page = await this.ensurePage();
        let liveURL: string | undefined;
        try {
          liveURL = await this.ensureLiveURL();
        } catch {}

        try {
          const element = page.locator(selector).first();
          await element.waitFor({ state: "attached", timeout: 20_000 });
          await element.scrollIntoViewIfNeeded();
          const isEditable = await element.isEditable({ timeout: 5_000 }).catch(() => false);
          if (!isEditable) {
            await element.click({ timeout: 10_000 });
          }
          // Prefer fill to replace existing content reliably
          await element.fill(text, { timeout: 20_000 });

          return {
            summary: `typed into \"${selector}\"`,
            url: liveURL || page.url(),
            details: { pageURL: page.url(), valueLength: text.length },
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            summary: `type error on ${selector}: ${message}`,
            url: liveURL || page.url(),
            error: message,
            details: { pageURL: page.url() },
          };
        }
      },
    });
  }

  /**
   * Create key press tool
   */
  static createKeyPressTool() {
    return tool({
      description: "Press a keyboard key (e.g., Enter, ArrowDown, Control+A)",
      inputSchema: KeyPressInputSchema,
      execute: async ({ key, delayMs }: { key: string; delayMs?: number }) => {
        const page = await this.ensurePage();
        let liveURL: string | undefined;
        try {
          liveURL = await this.ensureLiveURL();
        } catch {}

        try {
          await page.keyboard.press(key, { delay: typeof delayMs === 'number' ? Math.max(0, Math.min(2000, delayMs)) : undefined });
          return {
            summary: `pressed key ${key}`,
            url: liveURL || page.url(),
            details: { pageURL: page.url() },
          };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            summary: `key press error for ${key}: ${message}`,
            url: liveURL || page.url(),
            error: message,
            details: { pageURL: page.url() },
          };
        }
      },
    });
  }

  /**
   * Create list selectors tool
   */
  static createListSelectorsTool() {
    return tool({
      description: "Return a compact catalog of actionable DOM elements (selectors and labels)",
      inputSchema: ListSelectorsInputSchema,
      execute: async ({ max, nearViewportOnly }: { max?: number; nearViewportOnly?: boolean }) => {
        const page = await this.ensurePage();
        const limit = Number.isFinite(max) ? Math.max(1, Math.min(200, Number(max))) : 100;
        const elements = await page.evaluate(({ limit, nearViewportOnly }: { limit: number; nearViewportOnly: boolean }) => {
          function isElementVisible(el: Element): boolean {
            const style = window.getComputedStyle(el as HTMLElement);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.width <= 1 || rect.height <= 1) return false;
            if (!nearViewportOnly) return true;
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            return rect.bottom >= -50 && rect.right >= -50 && rect.top <= vh + 50 && rect.left <= vw + 50;
          }

          function getLabel(el: Element): string {
            const aria = (el as HTMLElement).getAttribute('aria-label') || '';
            const title = (el as HTMLElement).getAttribute('title') || '';
            const alt = (el as HTMLElement).getAttribute('alt') || '';
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
            const placeholder = (el as HTMLElement).getAttribute('placeholder') || '';
            return [aria, title, alt, text, placeholder].find(v => v && v.trim().length > 0) || (el as HTMLElement).tagName.toLowerCase();
          }

          function cssPath(el: Element): string {
            if (!(el instanceof Element)) return '';
            const path: string[] = [];
            let node: Element | null = el;
            while (node && path.length < 5) {
              let selector = node.nodeName.toLowerCase();
              const id = (node as HTMLElement).id;
              if (id) { selector += `#${CSS.escape(id)}`; path.unshift(selector); break; }
              const className = (node as HTMLElement).className;
              if (className && typeof className === 'string') {
                const classes = className.split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');
                if (classes) selector += classes;
              }
              const parentEl: Element | null = (node as Element).parentElement;
              if (parentEl) {
                const siblings = Array.from(parentEl.children).filter(c => (c as Element).tagName === (node as Element).tagName);
                if (siblings.length > 1) {
                  const index = siblings.indexOf(node);
                  selector += `:nth-of-type(${index + 1})`;
                }
              }
              path.unshift(selector);
              node = parentEl;
            }
            return path.join(' > ');
          }

          const candidates = Array.from(document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="link"], [contenteditable="true"]')) as Element[];
          const results: {
            selector: string;
            label: string;
            tag: string;
            role?: string;
            href?: string;
            type?: string;
            visible: boolean;
            inViewport: boolean;
            bbox: { x: number; y: number; w: number; h: number };
          }[] = [];
          for (const el of candidates) {
            if (!isElementVisible(el)) continue;
            const label = getLabel(el);
            const tag = (el as HTMLElement).tagName.toLowerCase();
            const role = (el as HTMLElement).getAttribute('role') || undefined;
            const href = (el as HTMLAnchorElement).href || undefined;
            const type = (el as HTMLInputElement).type || undefined;
            const rect = (el as HTMLElement).getBoundingClientRect();
            const selector = cssPath(el);
            results.push({
              selector,
              label,
              tag,
              role,
              href,
              type,
              visible: true,
              inViewport: true,
              bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            });
            if (results.length >= limit) break;
          }
          return results;
        }, { limit, nearViewportOnly: Boolean(nearViewportOnly) });

        const liveURL = await (async () => { try { return await this.ensureLiveURL(); } catch { return undefined; } })();
        return {
          summary: `found ${elements.length} actionable elements`,
          url: liveURL || page.url(),
          details: { elements },
        };
      },
    });
  }

  /**
   * Create list anchors tool
   */
  static createListAnchorsTool() {
    return tool({
      description: "Return anchor links (<a> tags) from the current page with href, text and metadata",
      inputSchema: ListAnchorsInputSchema,
      execute: async ({ max, nearViewportOnly }: { max?: number; nearViewportOnly?: boolean }) => {
        const page = await this.ensurePage();
        const limit = Number.isFinite(max) ? Math.max(1, Math.min(200, Number(max))) : 100;
        const anchors = await page.evaluate(({ limit, nearViewportOnly }: { limit: number; nearViewportOnly: boolean }) => {
          function isElementVisible(el: Element): boolean {
            const style = window.getComputedStyle(el as HTMLElement);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.width <= 1 || rect.height <= 1) return false;
            if (!nearViewportOnly) return true;
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
            return rect.bottom >= -50 && rect.right >= -50 && rect.top <= vh + 50 && rect.left <= vw + 50;
          }

          function cssPath(el: Element): string {
            if (!(el instanceof Element)) return '';
            const path: string[] = [];
            let node: Element | null = el;
            while (node && path.length < 5) {
              let selector = node.nodeName.toLowerCase();
              const id = (node as HTMLElement).id;
              if (id) { selector += `#${CSS.escape(id)}`; path.unshift(selector); break; }
              const className = (node as HTMLElement).className;
              if (className && typeof className === 'string') {
                const classes = className.split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');
                if (classes) selector += classes;
              }
              const parentEl: Element | null = (node as Element).parentElement;
              if (parentEl) {
                const siblings = Array.from(parentEl.children).filter(c => (c as Element).tagName === (node as Element).tagName);
                if (siblings.length > 1) {
                  const index = siblings.indexOf(node);
                  selector += `:nth-of-type(${index + 1})`;
                }
              }
              path.unshift(selector);
              node = parentEl;
            }
            return path.join(' > ');
          }

          const results: {
            selector: string;
            tag: 'a';
            href: string;
            text: string;
            visible: boolean;
            inViewport: boolean;
            bbox: { x: number; y: number; w: number; h: number };
          }[] = [];
          const candidates = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
          for (const a of candidates) {
            if (!a.href) continue;
            if (!isElementVisible(a)) continue;
            const rect = a.getBoundingClientRect();
            const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
            const selector = cssPath(a);
            results.push({
              selector,
              tag: 'a',
              href: a.href,
              text,
              visible: true,
              inViewport: true,
              bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            });
            if (results.length >= limit) break;
          }
          return results;
        }, { limit, nearViewportOnly: Boolean(nearViewportOnly) });

        const liveURL = await (async () => { try { return await this.ensureLiveURL(); } catch { return undefined; } })();
        return {
          summary: `found ${anchors.length} anchors`,
          url: liveURL || page.url(),
          details: { anchors },
        };
      },
    });
  }

  /**
   * Create get text tool
   */
  static createGetTextTool() {
    return tool({
      description: "Extract plain visible text from the current page (no HTML; whitespace normalized)",
      inputSchema: GetTextInputSchema,
      execute: async (_input: { url?: string }) => {
        const page = await this.ensurePage();
        const text = await page.evaluate(() => {
          function isNodeVisible(node: Element): boolean {
            const style = window.getComputedStyle(node as HTMLElement);
            return !(style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0');
          }
          function getVisibleText(root: Element): string {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
              acceptNode: (n: Node) => {
                const parent = (n.parentElement || n.parentNode) as Element | null;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (!isNodeVisible(parent)) return NodeFilter.FILTER_REJECT;
                const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
                return t.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
              }
            } as NodeFilter);
            const parts: string[] = [];
            let current: Node | null;
            while ((current = walker.nextNode())) {
              parts.push((current.textContent || '').replace(/\s+/g, ' ').trim());
            }
            return parts.join('\n');
          }
          return getVisibleText(document.body);
        });
        const liveURL = await (async () => { try { return await this.ensureLiveURL(); } catch { return undefined; } })();
        return {
          summary: `extracted ${text.length} characters of text`,
          url: liveURL || page.url(),
          details: { text },
        };
      },
    });
  }

  /**
   * Create captcha wait tool
   */
  static createCaptchaWaitTool() {
    return tool({
      description: "Wait for a CAPTCHA to be detected using Browserless.captchaFound CDP event",
      inputSchema: CaptchaWaitInputSchema,
      execute: async ({ timeoutMs }: { timeoutMs?: number }) => {
        const page = await this.ensurePage();
        const timeout = Number.isFinite(timeoutMs) ? Math.min(300_000, Math.max(1_000, Number(timeoutMs))) : 60_000;
        const cdp = await page.context().newCDPSession(page);
        type GenericCDPSession = { send: (method: string, params?: Record<string, unknown>) => Promise<unknown>; on?: (event: string, handler: (params: unknown) => void) => void };

        const found = await new Promise<{ found: boolean; info?: unknown }>((resolve) => {
          let resolved = false;
          const onEvent = (eventName: string, params: unknown) => {
            if (eventName === 'Browserless.captchaFound' && !resolved) {
              resolved = true;
              resolve({ found: true, info: params });
            }
          };
          // Some CDP wrappers expose on() API; we fallback to generic send/receive
          try {
            (cdp as GenericCDPSession).on?.('Browserless.captchaFound', (params: unknown) => onEvent('Browserless.captchaFound', params));
          } catch {}

          setTimeout(() => {
            if (!resolved) resolve({ found: false });
          }, timeout);
        });

        const liveURL = await (async () => { try { return await this.ensureLiveURL({ timeoutMs: 300_000 }); } catch { return undefined; } })();
        if (found.found) {
          return {
            summary: 'captcha detected',
            url: liveURL || page.url(),
            details: { event: 'Browserless.captchaFound', info: found.info },
          };
        }
        return {
          summary: 'no captcha detected within timeout',
          url: liveURL || page.url(),
          details: { timeoutMs: timeout },
        };
      },
    });
  }

  /**
   * Create session end tool
   */
  static createSessionEndTool() {
    return tool({
      description: "Close the current Browserless browser session and clear cached references",
      inputSchema: SessionEndInputSchema,
      execute: async () => {
        const hadBrowser = Boolean(this.sharedBrowser);
        
        try {
          if (this.sharedBrowser) await this.sharedBrowser.close();
        } catch (error) {
          console.error('Error closing browser:', error);
        }
        
        this.sharedBrowser = null;
        this.sharedPage = null;
        this.sharedLiveURL = null;
        
        const summary = hadBrowser
          ? "browser session closed"
          : "no active browser session";
          
        return { summary, url: "" };
      },
    });
  }

  /**
   * Create all browserless tools
   */
  static createAllTools() {
    return {
      navigate: this.createNavigateTool(),
      click: this.createClickTool(),
      type: this.createTypeTool(),
      keyPress: this.createKeyPressTool(),
      listSelectors: this.createListSelectorsTool(),
      listAnchors: this.createListAnchorsTool(),
      getText: this.createGetTextTool(),
      captchaWait: this.createCaptchaWaitTool(),
      sessionEnd: this.createSessionEndTool(),
      // Add more tools as needed
    };
  }
}

/**
 * Legacy-compatible export
 */
export function createBrowserlessTools(params?: unknown) {
  return BrowserlessProvider.createAllTools();
}
