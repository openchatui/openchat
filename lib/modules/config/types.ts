import 'server-only';

export interface AudioConfig {
  ttsEnabled: boolean;
  sttEnabled: boolean;
  tts: { provider: 'openai' | 'elevenlabs' };
  stt: { 
    provider: 'whisper-web' | 'openai' | 'webapi' | 'deepgram'; 
    whisperWeb: { model: string };
  };
}

export interface SystemConfig {
  websearch?: {
    ENABLED?: boolean;
    [key: string]: unknown;
  };
  image?: {
    provider?: string;
    openai?: {
      api_key?: string;
    };
    [key: string]: unknown;
  };
  connections?: {
    openai?: {
      api_keys?: string[];
    };
    [key: string]: unknown;
  };
  audio?: {
    ttsEnabled?: boolean;
    sttEnabled?: boolean;
    tts?: {
      provider?: string;
    };
    stt?: {
      provider?: string;
      whisperWeb?: {
        model?: string;
      };
    };
  };
  [key: string]: unknown;
}
