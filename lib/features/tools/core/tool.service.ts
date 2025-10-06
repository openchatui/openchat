import 'server-only';
import db from '@/lib/db';
import type { 
  ToolDefinition, 
  ToolConfig, 
  ToolResult, 
  ToolExecutionContext, 
  ProviderConfig,
  ToolCategory,
  ToolProvider 
} from './tool.types';

/**
 * Core Tool Management Service
 */
export class ToolService {
  private static toolRegistry = new Map<string, ToolDefinition>();

  /**
   * Register a tool definition
   */
  static registerTool(tool: ToolDefinition): void {
    this.toolRegistry.set(tool.id, tool);
  }

  /**
   * Get all registered tools
   */
  static getAllTools(): ToolDefinition[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Get tools by category
   */
  static getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    return this.getAllTools().filter(tool => tool.category === category);
  }

  /**
   * Get tools by provider
   */
  static getToolsByProvider(provider: ToolProvider): ToolDefinition[] {
    return this.getAllTools().filter(tool => tool.provider === provider);
  }

  /**
   * Get a specific tool by ID
   */
  static getTool(toolId: string): ToolDefinition | undefined {
    return this.toolRegistry.get(toolId);
  }

  /**
   * Execute a tool with the given input
   */
  static async executeTool(
    toolId: string, 
    input: any, 
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.getTool(toolId);
    if (!tool) {
      return {
        summary: `Tool '${toolId}' not found`,
        error: 'TOOL_NOT_FOUND'
      };
    }

    try {
      // Validate input against schema
      const validatedInput = tool.inputSchema.parse(input);
      
      // Execute the tool
      return await tool.execute(validatedInput, context);
    } catch (error: any) {
      return {
        summary: `Tool execution failed: ${error.message}`,
        error: 'EXECUTION_FAILED',
        details: { originalError: error.message }
      };
    }
  }

  /**
   * Get enabled tools for a user based on permissions and configuration
   */
  static async getEnabledToolsForUser(userId: string): Promise<ToolDefinition[]> {
    try {
      // Get user's effective permissions (using existing access control)
      const { getEffectivePermissionsForUser } = await import('@/lib/server');
      const permissions = await getEffectivePermissionsForUser(userId);

      const enabledTools: ToolDefinition[] = [];

      // Check image generation tools
      if (permissions.features.image_generation) {
        enabledTools.push(...this.getToolsByCategory('image-generation'));
      }

      // Check web search tools
      if (permissions.features.web_search) {
        enabledTools.push(...this.getToolsByCategory('web-browsing'));
      }

      // Check data analysis tools (Pyodide)
      const featuresAny = (permissions as any)?.features || {};
      const hasDataAnalysisFeature = Boolean(
        featuresAny['data_analysis'] ||
        featuresAny['dataAnalysis'] ||
        featuresAny['pyodide']
      );

      if (hasDataAnalysisFeature) {
        enabledTools.push(...this.getToolsByCategory('data-analysis'));
      } else {
        // Fallback: enable if provider config is enabled
        try {
          const providerCfg = await ToolConfigService.getProviderConfig('pyodide');
          if (providerCfg?.enabled) {
            enabledTools.push(...this.getToolsByCategory('data-analysis'));
          }
        } catch {}
      }

      return enabledTools;
    } catch (error) {
      console.error('Error getting enabled tools for user:', error);
      return [];
    }
  }
}

/**
 * Tool Configuration Service
 */
export class ToolConfigService {
  /**
   * Get tool configuration from database
   */
  static async getToolConfig(toolId: string): Promise<ToolConfig | null> {
    try {
      const config = await db.config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (config?.data || {}) as any;
      const toolConfig = data?.tools?.[toolId];
      
      return toolConfig ? {
        enabled: Boolean(toolConfig.enabled),
        provider: toolConfig.provider,
        settings: toolConfig.settings || {}
      } : null;
    } catch (error) {
      console.error(`Error getting tool config for ${toolId}:`, error);
      return null;
    }
  }

  /**
   * Get provider configuration from database
   */
  static async getProviderConfig(provider: ToolProvider): Promise<ProviderConfig | null> {
    try {
      const config = await db.config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (config?.data || {}) as any;
      const providerConfig = data?.providers?.[provider];
      
      return providerConfig ? {
        type: provider,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        enabled: Boolean(providerConfig.enabled),
        settings: providerConfig.settings || {}
      } : null;
    } catch (error) {
      console.error(`Error getting provider config for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Update tool configuration
   */
  static async updateToolConfig(toolId: string, config: Partial<ToolConfig>): Promise<void> {
    try {
      const currentConfig = await db.config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (currentConfig?.data || {}) as any;
      const tools = data.tools || {};
      
      tools[toolId] = {
        ...tools[toolId],
        ...config
      };

      await db.config.upsert({
        where: { id: 1 },
        create: { id: 1, data: { ...data, tools } },
        update: { data: { ...data, tools } }
      });
    } catch (error) {
      console.error(`Error updating tool config for ${toolId}:`, error);
      throw error;
    }
  }
}

/**
 * Tool Builder Service - Creates tool objects for AI SDK
 */
export class ToolBuilderService {
  /**
   * Build AI SDK compatible tools from enabled tool definitions
   */
  static async buildToolsForUser(userId: string): Promise<Record<string, any>> {
    const enabledTools = await ToolService.getEnabledToolsForUser(userId);
    const toolsObject: Record<string, any> = {};

    for (const toolDef of enabledTools) {
      // Get tool configuration
      const toolConfig = await ToolConfigService.getToolConfig(toolDef.id);
      
      if (toolConfig?.enabled !== false) {
        toolsObject[toolDef.id] = {
          description: toolDef.description,
          inputSchema: toolDef.inputSchema,
          execute: async (input: any) => {
            return await ToolService.executeTool(toolDef.id, input, { userId });
          }
        };
      }
    }

    return toolsObject;
  }

  /**
   * Build tools based on feature flags (legacy compatibility)
   */
  static async buildLegacyTools(options: { 
    enableWebSearch?: boolean; 
    enableImage?: boolean; 
  }): Promise<Record<string, any>> {
    const tools: Record<string, any> = {};

    if (options.enableWebSearch) {
      const webTools = ToolService.getToolsByCategory('web-browsing');
      for (const tool of webTools) {
        const config = await ToolConfigService.getToolConfig(tool.id);
        if (config?.enabled !== false) {
          tools[tool.id] = {
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: tool.execute
          };
        }
      }
    }

    if (options.enableImage) {
      const imageTools = ToolService.getToolsByCategory('image-generation');
      for (const tool of imageTools) {
        const config = await ToolConfigService.getToolConfig(tool.id);
        if (config?.enabled !== false) {
          tools[tool.id] = {
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: tool.execute
          };
        }
      }
    }

    return tools;
  }
}
