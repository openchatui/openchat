import 'server-only';
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
    const cdp = await page.context().newCDPSession(page as any);
    const params: any = { timeout: typeof options?.timeoutMs === 'number' ? options.timeoutMs : 300_000 };
    if (typeof options?.showBrowserInterface === 'boolean') params.showBrowserInterface = options.showBrowserInterface;
    if (typeof options?.quality === 'number') params.quality = options.quality;
    if (typeof options?.resizable === 'boolean') params.resizable = options.resizable;
    const res = await (cdp as any).send('Browserless.liveURL', params);
    const liveURL: string | undefined = res?.liveURL;
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
        } catch (error: any) {
          return {
            summary: `click error on ${selector}: ${error.message}`,
            url: liveURL || page.url(),
            error: error.message,
            details: { pageURL: page.url() },
          };
        }
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
      sessionEnd: this.createSessionEndTool(),
      // Add more tools as needed
    };
  }
}

/**
 * Legacy-compatible export
 */
export function createBrowserlessTools(params: any) {
  return BrowserlessProvider.createAllTools();
}
