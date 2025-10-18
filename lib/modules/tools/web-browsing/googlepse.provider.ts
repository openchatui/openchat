import 'server-only';
import { z } from 'zod';
import { WebBrowsingService } from './web.service';

const GooglePseResultSchema = z.object({
  kind: z.string().optional(),
  title: z.string().optional(),
  htmlTitle: z.string().optional(),
  link: z.string().url().optional(),
  displayLink: z.string().optional(),
  snippet: z.string().optional(),
});

const GooglePseResponseSchema = z.object({
  items: z.array(GooglePseResultSchema).optional(),
});

export interface GooglePseSearchOptions {
  query: string;
  num?: number;
  domainFilters?: string[];
}

export class GooglePSEProvider {
  /**
   * Execute a Google Programmable Search Engine query
   */
  static async search({ query, num, domainFilters }: GooglePseSearchOptions): Promise<{ summary: string; details: Record<string, unknown> }> {
    const cfg = await WebBrowsingService.getWebSearchConfig();
    if (cfg.provider !== 'googlepse') {
      return { summary: 'Google PSE is not the active provider', details: {} };
    }
    const apiKey = cfg.googlepse?.apiKey;
    const cx = cfg.googlepse?.engineId || cfg.googlepse?.searchEngineId;
    if (!apiKey || !cx) {
      return { summary: 'Google PSE is not configured', details: {} };
    }

    const effectiveNum = Math.max(1, Math.min(50, typeof num === 'number' ? num : (cfg.googlepse?.resultCount || 5)));
    const configuredDomains = Array.isArray(cfg.googlepse?.domainFilters) ? cfg.googlepse!.domainFilters! : [];
    const inputDomains = Array.isArray(domainFilters) ? domainFilters : [];
    const allDomains = [...configuredDomains, ...inputDomains].filter((v, i, a) => v && a.indexOf(v) === i);

    const siteQuery = allDomains.length > 0
      ? ' ' + allDomains.map(d => `site:${d}`).join(' OR ')
      : '';

    const params = new URLSearchParams();
    params.set('q', query + siteQuery);
    params.set('cx', cx);
    params.set('key', apiKey);
    params.set('num', String(effectiveNum));

    const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { summary: `Google PSE request failed (${res.status})`, details: { status: res.status, body: text } };
    }
    const json = await res.json();
    const parsed = GooglePseResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { summary: 'Unexpected Google PSE response format', details: { raw: json } };
    }

    const items = (parsed.data.items || []).map((it) => ({
      title: it.title || '',
      url: it.link || '',
      displayLink: it.displayLink || '',
      snippet: it.snippet || '',
    }));

    return {
      summary: `Found ${items.length} result${items.length === 1 ? '' : 's'}`,
      details: { items },
    };
  }
}



