import { z } from 'zod';

// Input schema for running Python via Pyodide
export const PyodideRunInputSchema = z.object({
  script: z.string().min(1, 'Python script is required'),
  context: z.record(z.string(), z.unknown()).default({}),
  packages: z.array(z.string()).optional(),
  warmup: z.boolean().optional().default(false),
});

export type PyodideRunInput = z.infer<typeof PyodideRunInputSchema>;

export interface PyodideRunResultDetails {
  output?: unknown;
  outputType?: string;
  usedPackages?: string[];
  executionMs?: number;
}


