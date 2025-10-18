import { ToolService } from '../core/tool.service';
import { type ToolDefinition } from '../core/tool.types';
import { WebSearchInputSchema, type WebSearchInput } from './web.types';
import { GooglePSEProvider } from './googlepse.provider';

const webSearchTool: ToolDefinition = {
  id: 'webSearch',
  name: 'Web Search',
  description: 'Search the web via Google Programmable Search Engine and return top results',
  category: 'web-browsing',
  provider: 'googlepse',
  inputSchema: WebSearchInputSchema,
  execute: async (input: WebSearchInput) => {
    const { query, num, domainFilters } = input;
    const result = await GooglePSEProvider.search({ query, num, domainFilters });
    return {
      summary: result.summary,
      details: result.details,
    };
  },
};

export function registerGooglePseTools(): void {
  ToolService.registerTool(webSearchTool);
}

// Auto-register on import
registerGooglePseTools();

export async function createGooglePseTools() {
  return {
    webSearch: {
      description: webSearchTool.description,
      inputSchema: WebSearchInputSchema,
      execute: async (input: WebSearchInput) => {
        const { query, num, domainFilters } = input;
        const result = await GooglePSEProvider.search({ query, num, domainFilters });
        return {
          summary: result.summary,
          url: '',
          details: result.details,
        };
      },
    },
  } as const;
}


