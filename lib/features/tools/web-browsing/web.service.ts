import 'server-only';
import db from '@/lib/db';
import type { BrowserConfig, BrowserSettings } from './web.types';

/**
 * Web Browsing Configuration Service
 */
export class WebBrowsingService {
  /**
   * Get web search/browsing configuration from database
   */
  static async getWebSearchConfig(): Promise<{
    enabled: boolean;
    provider: 'browserless' | 'googlepse';
    browserless?: BrowserConfig;
    googlepse?: { apiKey?: string; engineId?: string; searchEngineId?: string; resultCount?: number; domainFilters?: string[] };
  }> {
    try {
      const cfg = await db.config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (cfg?.data || {}) as any;
      const websearch = data?.websearch || {};
      
      const provider = websearch.PROVIDER?.toLowerCase() === 'googlepse' ? 'googlepse' : 'browserless';
      const enabled = Boolean(websearch.ENABLED);

      const browserlessConfig: BrowserConfig = {
        provider: 'browserless',
        token: websearch.browserless?.apiKey,
        settings: {
          stealth: websearch.browserless?.stealth !== false,
          stealthRoute: websearch.browserless?.stealthRoute === true,
          blockAds: websearch.browserless?.blockAds === true,
          headless: websearch.browserless?.headless !== false,
          locale: websearch.browserless?.locale || 'en-US',
          timezone: websearch.browserless?.timezone || 'America/Los_Angeles',
          userAgent: websearch.browserless?.userAgent,
          route: websearch.browserless?.route,
        }
      };

      const googlepseRaw = websearch.googlepse || {};
      const googlepseConfig = {
        apiKey: googlepseRaw?.apiKey,
        // Support both keys (engineId preferred; fall back to searchEngineId)
        engineId: typeof googlepseRaw?.engineId === 'string' ? googlepseRaw.engineId : undefined,
        searchEngineId: typeof googlepseRaw?.searchEngineId === 'string' ? googlepseRaw.searchEngineId : undefined,
        resultCount: Number.isFinite(googlepseRaw?.resultCount) ? Math.max(1, Math.min(50, Number(googlepseRaw?.resultCount))) : undefined,
        domainFilters: Array.isArray(googlepseRaw?.domainFilters) ? (googlepseRaw.domainFilters as any[]).filter(v => typeof v === 'string' && v.trim().length > 0) : undefined,
      };

      return {
        enabled,
        provider,
        browserless: browserlessConfig,
        googlepse: googlepseConfig,
      };
    } catch (error) {
      console.error('Error getting web search config:', error);
      return {
        enabled: false,
        provider: 'browserless',
      };
    }
  }

  /**
   * Check if web browsing is available
   */
  static async isWebBrowsingAvailable(): Promise<boolean> {
    try {
      const config = await this.getWebSearchConfig();
      
      if (!config.enabled) return false;

      if (config.provider === 'browserless') {
        return Boolean(config.browserless?.token);
      }

      if (config.provider === 'googlepse') {
        const cx = config.googlepse?.engineId || config.googlepse?.searchEngineId;
        return Boolean(config.googlepse?.apiKey && cx);
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get browserless configuration
   */
  static async getBrowserlessConfig(): Promise<BrowserConfig | null> {
    try {
      const config = await this.getWebSearchConfig();
      return config.browserless || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate browserless token
   */
  static async validateBrowserlessToken(token: string): Promise<boolean> {
    try {
      // Simple validation - check if token is not empty
      // In a real implementation, you might want to make a test request
      return typeof token === 'string' && token.trim().length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Web Search Provider Service
 */
export class WebSearchProviderService {
  /**
   * Get system prompt for web search based on provider
   */
  static async getWebSearchSystemPrompt(): Promise<string | undefined> {
    try {
      const config = await WebBrowsingService.getWebSearchConfig();
      
      if (!config.enabled) return undefined;

      const cfg = await db.config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (cfg?.data || {}) as any;
      const websearch = data?.websearch || {};

      // Provider-specific prompts
      let providerPrompt = '';
      
      if (config.provider === 'browserless') {
        providerPrompt = websearch.browserless?.systemPrompt ||
                        websearch.SYSTEM_PROMPT ||
                        process.env.BROWSERLESS_SYSTEM_PROMPT ||
                        'Web browsing tools are available (Browserless). Use them when helpful to fetch up-to-date information. ' +
                        'Prefer: navigate -> listAnchors/listSelectors -> click/type/keyPress as needed. Summarize findings with URLs. ' +
                        'Keep actions minimal, avoid unnecessary clicks, and stop when you have enough info. If you finish, call sessionEnd. ' +
                        'Use navigate with thoughtfully crafted URLs (including query params) to reach targets efficiently. ' +
                        'If a CAPTCHA appears, use captchaWait and report status; do not attempt to solve it yourself.';
      } else if (config.provider === 'googlepse') {
        providerPrompt = websearch.googlepse?.systemPrompt ||
                        websearch.SYSTEM_PROMPT ||
                        process.env.GOOGLEPSE_SYSTEM_PROMPT ||
                        'Web search is available via Google Programmable Search Engine. Use it to retrieve sources and summarize findings. ' +
                        'Favor precise queries and cite result titles and URLs. Avoid unnecessary requests.';
      }

      return providerPrompt.trim() || undefined;
    } catch (error) {
      console.error('Error getting web search system prompt:', error);
      return undefined;
    }
  }
}
