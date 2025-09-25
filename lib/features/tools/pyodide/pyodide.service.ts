import 'server-only';
import type { ToolResult } from '../core/tool.types';
import { ToolConfigService } from '../core/tool.service';
import type { PyodideRunInput, PyodideRunResultDetails } from './pyodide.types';

type PyodideInterface = any;

/**
 * Server-side Pyodide Manager
 * Loads a single shared Pyodide instance and runs Python scripts with optional packages.
 */
export class PyodideManager {
  private static instance: PyodideInterface | undefined;
  private static loadingPromise: Promise<PyodideInterface | undefined> | undefined;

  private static async getIndexURL(): Promise<string | undefined> {
    // Provider config may carry a baseUrl for Pyodide assets
    const provider = await ToolConfigService.getProviderConfig('pyodide');
    const baseUrl = provider?.baseUrl || process.env.PYODIDE_INDEX_URL;
    return baseUrl;
  }

  private static rewritePackageNames(packages: string[] | undefined, packageIndexUrl?: string): string[] | undefined {
    if (!packages || packages.length === 0) return packages;
    if (!packageIndexUrl) return packages;
    return packages.map((name) => (name.endsWith('.whl') ? `${packageIndexUrl.replace(/\/$/, '')}/${name}` : name));
  }

  static async loadInstance(packages?: string[]): Promise<PyodideInterface | undefined> {
    if (this.instance) return this.instance;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        // Dynamic import via eval to avoid bundler static analysis of 'pyodide'
        const dynamicImport: any = new Function('m', 'return import(m)');
        const { loadPyodide } = await dynamicImport('pyodide');
        const indexURL = (await this.getIndexURL()) || 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/';
        const pyodide: PyodideInterface = await loadPyodide({ indexURL });

        // Optionally install packages via micropip
        if (packages && packages.length > 0) {
          await this.installPackages(pyodide, packages);
        }

        this.instance = pyodide;
        return pyodide;
      } catch (error) {
        console.error('Error initializing Pyodide:', error);
        return undefined;
      } finally {
        this.loadingPromise = undefined;
      }
    })();

    return this.loadingPromise;
  }

  private static async installPackages(pyodide: PyodideInterface, packages: string[]): Promise<void> {
    const provider = await ToolConfigService.getProviderConfig('pyodide');
    const packageIndexUrl = (provider?.settings as any)?.packageIndexUrl as string | undefined;
    const rewritten = this.rewritePackageNames(packages, packageIndexUrl);

    await pyodide.loadPackage('micropip');
    const micropip = await pyodide.pyimport('micropip');
    await micropip.install(rewritten, true);
  }

  static async run(input: PyodideRunInput): Promise<ToolResult> {
    const t0 = Date.now();
    const pyodide = await this.loadInstance(input.packages);
    if (!pyodide) {
      return {
        summary: 'Pyodide not available',
        error: 'PYODIDE_INIT_FAILED',
      };
    }

    const provider = await ToolConfigService.getProviderConfig('pyodide');

    try {
      const locals = pyodide.toPy({ ...(input.context || {}), warmup: Boolean(input.warmup) });
      const result = await pyodide.runPythonAsync(input.script, { locals });

      let output: unknown = result;
      try {
        if (result && typeof result === 'object' && typeof (result as any).toJs === 'function') {
          output = (result as any).toJs({ create_proxies: false });
        }
      } catch {}

      const details: PyodideRunResultDetails = {
        output,
        outputType: output === null ? 'null' : typeof output,
        usedPackages: input.packages && input.packages.length > 0 ? input.packages : undefined,
        executionMs: Date.now() - t0,
      };

      const summaryParts = [
        'python executed',
        input.warmup ? '(warmup)' : '',
        details.executionMs ? `${details.executionMs}ms` : '',
      ].filter(Boolean);

      return {
        summary: summaryParts.join(' '),
        details: details as any,
      };
    } catch (error: any) {
      return {
        summary: `Python execution failed: ${error?.message || 'Unknown error'}`,
        error: 'PYODIDE_EXECUTION_FAILED',
        details: {
          message: String(error?.message || error),
        },
      };
    }
  }
}


