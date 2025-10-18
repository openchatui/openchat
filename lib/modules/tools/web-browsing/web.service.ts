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
      
      const data = (cfg?.data ?? {}) as Record<string, unknown>;
      const rawWebsearch = (data['websearch'] && typeof data['websearch'] === 'object') ? (data['websearch'] as Record<string, unknown>) : {};
      const websearch = rawWebsearch;

      const provider = (typeof websearch['PROVIDER'] === 'string' && (websearch['PROVIDER'] as string).toLowerCase() === 'googlepse') ? 'googlepse' : 'browserless';
      const enabled = Boolean(websearch['ENABLED']);

      const bl = (websearch['browserless'] && typeof websearch['browserless'] === 'object') ? (websearch['browserless'] as Record<string, unknown>) : {};
      const browserlessConfig: BrowserConfig = {
        provider: 'browserless',
        token: typeof bl['apiKey'] === 'string' ? (bl['apiKey'] as string) : undefined,
        settings: {
          stealth: bl['stealth'] !== false,
          stealthRoute: bl['stealthRoute'] === true,
          blockAds: bl['blockAds'] === true,
          headless: bl['headless'] !== false,
          locale: typeof bl['locale'] === 'string' && (bl['locale'] as string).trim().length > 0 ? (bl['locale'] as string) : 'en-US',
          timezone: typeof bl['timezone'] === 'string' && (bl['timezone'] as string).trim().length > 0 ? (bl['timezone'] as string) : 'America/Los_Angeles',
          userAgent: typeof bl['userAgent'] === 'string' ? (bl['userAgent'] as string) : undefined,
          route: typeof bl['route'] === 'string' ? (bl['route'] as string) : undefined,
        }
      };

      const googlepseRawObj = (websearch['googlepse'] && typeof websearch['googlepse'] === 'object') ? (websearch['googlepse'] as Record<string, unknown>) : {};
      const googlepseConfig = {
        apiKey: typeof googlepseRawObj['apiKey'] === 'string' ? (googlepseRawObj['apiKey'] as string) : undefined,
        // Support both keys (engineId preferred; fall back to searchEngineId)
        engineId: typeof googlepseRawObj['engineId'] === 'string' ? (googlepseRawObj['engineId'] as string) : undefined,
        searchEngineId: typeof googlepseRawObj['searchEngineId'] === 'string' ? (googlepseRawObj['searchEngineId'] as string) : undefined,
        resultCount: Number.isFinite(googlepseRawObj['resultCount'] as number) ? Math.max(1, Math.min(50, Number(googlepseRawObj['resultCount']))) : undefined,
        domainFilters: Array.isArray(googlepseRawObj['domainFilters'])
          ? (googlepseRawObj['domainFilters'] as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          : undefined,
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
      
      const data = (cfg?.data ?? {}) as Record<string, unknown>;
      const rawWebsearch2 = (data['websearch'] && typeof data['websearch'] === 'object') ? (data['websearch'] as Record<string, unknown>) : {};
      const websearch = rawWebsearch2;

      // Provider-specific prompts
      let providerPrompt = '';
      
      if (config.provider === 'browserless') {
        const bl = (websearch['browserless'] && typeof websearch['browserless'] === 'object') ? (websearch['browserless'] as Record<string, unknown>) : {};
        providerPrompt = (typeof bl['systemPrompt'] === 'string' ? (bl['systemPrompt'] as string) : '') ||
                        (typeof websearch['SYSTEM_PROMPT'] === 'string' ? (websearch['SYSTEM_PROMPT'] as string) : '') ||
                        process.env.BROWSERLESS_SYSTEM_PROMPT ||
                        'Web browsing tools are available (Browserless). Use them when helpful to fetch up-to-date information. ' +
                        'Prefer: navigate -> listAnchors/listSelectors -> click/type/keyPress as needed. Summarize findings with URLs. ' +
                        'Keep actions minimal, avoid unnecessary clicks, and stop when you have enough info. If you finish, call sessionEnd. ' +
                        'Use navigate with thoughtfully crafted URLs (including query params) to reach targets efficiently. ' +
                        'If a CAPTCHA appears, use captchaWait and report status; do not attempt to solve it yourself.';
      } else if (config.provider === 'googlepse') {
        const gp = (websearch['googlepse'] && typeof websearch['googlepse'] === 'object') ? (websearch['googlepse'] as Record<string, unknown>) : {};
        providerPrompt = (typeof gp['systemPrompt'] === 'string' ? (gp['systemPrompt'] as string) : '') ||
                        (typeof websearch['SYSTEM_PROMPT'] === 'string' ? (websearch['SYSTEM_PROMPT'] as string) : '') ||
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
