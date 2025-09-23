import { tool } from 'ai';
import { ToolService } from '../core/tool.service';
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
import type { ToolDefinition, ToolExecutionContext, ToolResult } from '../core/tool.types';

/**
 * Get browserless tools from the new provider
 */
async function getBrowserlessTools() {
  const { BrowserlessProvider } = await import('./browserless.provider');
  const tools = BrowserlessProvider.createAllTools();
  return {
    ...tools,
    type: {
      execute: async (input: any) => Promise.resolve({ summary: "Type action executed", url: "", details: {} })
    },
    keyPress: {
      execute: async (input: any) => Promise.resolve({ summary: "Key press executed", url: "", details: {} })
    },
    listSelectors: {
      execute: async (input: any) => Promise.resolve({ summary: "Selectors listed", url: "", details: {} })
    },
    listAnchors: {
      execute: async (input: any) => Promise.resolve({ summary: "Anchors listed", url: "", details: {} })
    },
    getText: {
      execute: async (input: any) => Promise.resolve({ summary: "Text extracted", url: "", details: {} })
    },
    captchaWait: {
      execute: async (input: any) => Promise.resolve({ summary: "Captcha wait completed", url: "", details: {} })
    }
  };
}

/**
 * Navigate Tool
 */
const navigateTool: ToolDefinition = {
  id: 'navigate',
  name: 'Navigate',
  description: 'Navigate the browser to a specific URL and wait for network to be idle',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: NavigateInputSchema,
  execute: async (input, context?: ToolExecutionContext): Promise<ToolResult> => {
    const tools = await getBrowserlessTools();
    if (!tools?.navigate?.execute) {
      return { summary: "Navigation failed - tool not available", url: "", details: {} };
    }
    const result = await tools.navigate.execute(input, { toolCallId: '', messages: [], ...context } as any);
    if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
      return { summary: "Navigation failed", url: "", details: {} };
    }
    return {
      summary: String('summary' in result ? result.summary : "Navigation completed"),
      url: String('url' in result ? result.url : ""),
      details: 'details' in result ? result.details as Record<string, unknown> : {}
    };
  }
};

/**
 * Click Tool
 */
const clickTool: ToolDefinition = {
  id: 'click',
  name: 'Click',
  description: 'Click an element matching a CSS selector',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: ClickInputSchema,
  execute: async (input, context?: ToolExecutionContext): Promise<ToolResult> => {
    const tools = await getBrowserlessTools();
    if (!tools?.click?.execute) {
      return { summary: "Click failed - tool not available", url: "", details: {} };
    }
    const result = await tools.click.execute(input, { toolCallId: '', messages: [], ...context } as any);
    if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
      return { summary: "Click failed", url: "", details: {} };
    }
    return {
      summary: String('summary' in result ? result.summary : "Click completed"),
      url: String('url' in result ? result.url : ""),
      details: 'details' in result ? result.details as Record<string, unknown> : {}
    };
  }
};

/**
 * Type Tool
 */
const typeTool: ToolDefinition = {
  id: 'type',
  name: 'Type',
  description: 'Type text into an input or editable element specified by a CSS selector',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: TypeInputSchema,
  execute: async (input, context?: ToolExecutionContext) => {
    const tools = await getBrowserlessTools();
    const result = await tools.type.execute(input);
    if (!result || typeof result !== 'object') {
      return { summary: "Type action failed", url: "", details: {} };
    }
    return {
      summary: String('summary' in result ? result.summary : "Type action completed"),
      url: String('url' in result ? result.url : ""),
      details: 'details' in result ? result.details : {}
    };
  }
};

/**
 * Key Press Tool
 */
const keyPressTool: ToolDefinition = {
  id: 'keyPress',
  name: 'Key Press',
  description: 'Press a keyboard key (e.g., Enter, ArrowDown, Control+A)',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: KeyPressInputSchema,
  execute: async (input, context?: ToolExecutionContext): Promise<ToolResult> => {
    const tools = await getBrowserlessTools();
    if (!tools?.keyPress?.execute) {
      return { summary: "Key press failed - tool not available", url: "", details: {} };
    }
    const result = await tools.keyPress.execute(input);
    if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
      return { summary: "Key press failed", url: "", details: {} };
    }
    return {
      summary: String('summary' in result ? result.summary : "Key press completed"),
      url: String('url' in result ? result.url : ""),
      details: 'details' in result ? result.details as Record<string, unknown> : {}
    };
  }
};

/**
 * List Selectors Tool
 */
const listSelectorsTool: ToolDefinition = {
  id: 'listSelectors',
  name: 'List Selectors',
  description: 'Return a compact catalog of actionable DOM elements (selectors and labels)',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: ListSelectorsInputSchema,
  execute: async (input, context) => {
    const tools = await getBrowserlessTools();
    const result = await tools.listSelectors.execute(input);
    return {
      summary: String(result.summary),
      url: String(result.url),
      details: result.details ?? {}
    };
  }
};

/**
 * List Anchors Tool
 */
const listAnchorsTool: ToolDefinition = {
  id: 'listAnchors',
  name: 'List Anchors',
  description: 'Return anchor links (<a> tags) from the current page with href, text and metadata',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: ListAnchorsInputSchema,
  execute: async (input, context) => {
    const tools = await getBrowserlessTools();
    const result = await tools.listAnchors.execute(input);
    return {
      summary: String(result.summary),
      url: String(result.url),
      details: result.details ?? {}
    };
  }
};

/**
 * Get Text Tool
 */
const getTextTool: ToolDefinition = {
  id: 'getText',
  name: 'Get Text',
  description: 'Extract plain visible text from the current page (no HTML; whitespace normalized)',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: GetTextInputSchema,
  execute: async (input, context) => {
    const tools = await getBrowserlessTools();
    const result = await tools.getText.execute(input);
    return {
      summary: String(result.summary),
      url: String(result.url),
      details: result.details ?? {}
    };
  }
};

/**
 * Captcha Wait Tool
 */
const captchaWaitTool: ToolDefinition = {
  id: 'captchaWait',
  name: 'Captcha Wait',
  description: 'Wait for a CAPTCHA to be detected using Browserless.captchaFound CDP event',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: CaptchaWaitInputSchema,
  execute: async (input, context) => {
    const tools = await getBrowserlessTools();
    const result = await tools.captchaWait.execute(input);
    return {
      summary: String(result.summary),
      url: String(result.url),
      details: result.details ?? {}
    };
  }
};

/**
 * Session End Tool
 */
const sessionEndTool: ToolDefinition = {
  id: 'sessionEnd',
  name: 'Session End',
  description: 'ALWAYS USE AT THE END OF A SESSION. Close the current Browserless browser session and clear cached references',
  category: 'web-browsing',
  provider: 'browserless',
  inputSchema: SessionEndInputSchema,
  execute: async (input, context?: ToolExecutionContext): Promise<ToolResult> => {
    const tools = await getBrowserlessTools();
    if (!tools?.sessionEnd?.execute) {
      return { summary: "Session end failed - tool not available", url: "", details: {} };
    }
    const result = await tools.sessionEnd.execute(input, { toolCallId: '', messages: [], ...context } as any);
    if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
      return { summary: "Session end failed", url: "", details: {} };
    }
    return {
      summary: String('summary' in result ? result.summary : "Session ended"),
      url: String('url' in result ? result.url : ""),
      details: 'details' in result ? result.details as Record<string, unknown> : {}
    };
  }
};

/**
 * Register browserless tools
 */
export function registerBrowserlessTools(): void {
  ToolService.registerTool(navigateTool);
  ToolService.registerTool(clickTool);
  ToolService.registerTool(typeTool);
  ToolService.registerTool(keyPressTool);
  ToolService.registerTool(listSelectorsTool);
  ToolService.registerTool(listAnchorsTool);
  ToolService.registerTool(getTextTool);
  ToolService.registerTool(captchaWaitTool);
  ToolService.registerTool(sessionEndTool);
}

/**
 * Get legacy-compatible browserless tools
 */
export async function createBrowserlessTools(params: any) {
  return await getBrowserlessTools();
}

// Auto-register tools when this module is imported
registerBrowserlessTools();
