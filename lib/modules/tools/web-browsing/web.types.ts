import { z } from 'zod';

// Web browsing specific types
export interface BrowserConfig {
  provider: 'browserless' | 'googlepse';
  token?: string;
  apiKey?: string;
  baseUrl?: string;
  settings?: BrowserSettings;
}

export interface BrowserSettings {
  stealth?: boolean;
  stealthRoute?: boolean;
  blockAds?: boolean;
  headless?: boolean;
  locale?: string;
  timezone?: string;
  userAgent?: string;
  route?: string;
}

export interface BrowserResult {
  summary: string;
  url?: string;
  html?: string;
  text?: string;
  details?: Record<string, unknown>;
}

export interface ElementInfo {
  selector: string;
  label: string;
  tag: string;
  role?: string;
  href?: string;
  type?: string;
  visible: boolean;
  inViewport: boolean;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// Input schemas for different tools
export const NavigateInputSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

export const ClickInputSchema = z.object({
  selector: z.string().min(1, 'Selector is required'),
});

export const TypeInputSchema = z.object({
  selector: z.string().min(1, 'Selector is required'),
  text: z.string(),
});

export const KeyPressInputSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  delayMs: z.number().int().min(0).max(2000).optional(),
});

export const ListSelectorsInputSchema = z.object({
  max: z.number().int().min(1).max(200).optional(),
  nearViewportOnly: z.boolean().optional(),
});

export const ListAnchorsInputSchema = z.object({
  max: z.number().int().min(1).max(200).optional(),
  nearViewportOnly: z.boolean().optional(),
});

export const GetTextInputSchema = z.object({
  url: z.string().url().optional(),
});

export const CaptchaWaitInputSchema = z.object({
  timeoutMs: z.number().int().positive().max(300_000).optional(),
});

export const SessionEndInputSchema = z.object({});

// Live URL (Browserless.liveURL) input
export const LiveURLInputSchema = z.object({
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  showBrowserInterface: z.boolean().optional(),
  quality: z.number().int().min(1).max(100).optional(),
  resizable: z.boolean().optional(),
});

// Google PSE search input
export const WebSearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  num: z.number().int().min(1).max(50).optional(),
  domainFilters: z.array(z.string()).optional(),
});

export type NavigateInput = z.infer<typeof NavigateInputSchema>;
export type ClickInput = z.infer<typeof ClickInputSchema>;
export type TypeInput = z.infer<typeof TypeInputSchema>;
export type KeyPressInput = z.infer<typeof KeyPressInputSchema>;
export type ListSelectorsInput = z.infer<typeof ListSelectorsInputSchema>;
export type ListAnchorsInput = z.infer<typeof ListAnchorsInputSchema>;
export type GetTextInput = z.infer<typeof GetTextInputSchema>;
export type CaptchaWaitInput = z.infer<typeof CaptchaWaitInputSchema>;
export type SessionEndInput = z.infer<typeof SessionEndInputSchema>;
export type LiveURLInput = z.infer<typeof LiveURLInputSchema>;
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
