
import { tool } from 'ai';
import { PyodideManager } from './pyodide.service';
import { PyodideRunInputSchema } from './pyodide.types';

export class PyodideProvider {
  static createRunTool() {
    return tool({
      description: 'Execute a Python script via Pyodide with optional context and packages',
      inputSchema: PyodideRunInputSchema,
      execute: async (input: any) => {
        const result = await PyodideManager.run(input);
        return {
          summary: result.summary,
          url: result.url || '',
          details: result.details || {},
        } as any;
      },
    });
  }
}

export const pyodideTools = {
  pyodideRun: PyodideProvider.createRunTool(),
};


