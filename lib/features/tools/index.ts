// Core tool functionality
export {
  ToolService,
  ToolConfigService,
  ToolBuilderService,
} from './core/tool.service';

export type {
  ToolDefinition,
  ToolConfig,
  ToolResult,
  ToolExecutionContext,
  ProviderConfig,
  ToolCategory,
  ToolProvider,
  ProviderConfigType,
  ToolConfigType,
} from './core/tool.types';

// Image generation
export {
  ImageGenerationService,
  ImageProviderService,
} from './image-generation/image.service';

export {
  openaiImageTools,
} from './image-generation/openai.provider';

export type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageGenerationInput,
  OpenAIImageConfig,
} from './image-generation/image.types';

// Pyodide
export {
  PyodideManager,
} from './pyodide/pyodide.service';

export {
  pyodideTools,
} from './pyodide/pyodide.provider';

export {
  registerPyodideTools,
} from './pyodide/pyodide.tools';

export type {
  PyodideRunInput,
} from './pyodide/pyodide.types';

// Web browsing
export {
  WebBrowsingService,
  WebSearchProviderService,
} from './web-browsing/web.service';

export {
  createBrowserlessTools,
} from './web-browsing/browserless.provider';

export type {
  BrowserConfig,
  BrowserSettings,
  BrowserResult,
  ElementInfo,
  NavigateInput,
  ClickInput,
  TypeInput,
  KeyPressInput,
  ListSelectorsInput,
  ListAnchorsInput,
  GetTextInput,
  CaptchaWaitInput,
  SessionEndInput,
} from './web-browsing/web.types';

// Legacy compatibility - re-export for existing imports
export async function buildTools(options: { enableWebSearch?: boolean; enableImage?: boolean }): Promise<Record<string, unknown> | undefined> {
  const { ToolBuilderService } = await import('./core/tool.service');
  return await ToolBuilderService.buildLegacyTools(options);
}
