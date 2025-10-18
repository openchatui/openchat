import { ToolService } from '../core/tool.service';
import type { ToolDefinition } from '../core/tool.types';
import { PyodideManager } from './pyodide.service';
import { PyodideRunInputSchema } from './pyodide.types';

const pyodideRunTool: ToolDefinition = {
  id: 'pyodideRun',
  name: 'Run Python (Pyodide)',
  description: 'Execute a Python script with an optional context and packages using Pyodide',
  category: 'data-analysis',
  provider: 'pyodide',
  inputSchema: PyodideRunInputSchema,
  execute: async (input) => {
    return await PyodideManager.run(input);
  }
};

export function registerPyodideTools(): void {
  ToolService.registerTool(pyodideRunTool);
}

// Auto-register upon import
registerPyodideTools();


