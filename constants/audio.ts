export const MESSAGES = {
  TITLE: "Audio",
  DESCRIPTION: "Manage Text-to-Speech (TTS) and Speech-to-Text (STT) providers, voices, and settings.",
  LOADING: "Loading audio settings...",

  TTS_TITLE: "Text-to-Speech",
  TTS_DESCRIPTION: "Enable TTS and manage available voices and providers.",
  TTS_ENABLE_LABEL: "Enable TTS",
  TTS_ENABLE_HINT: "Allow generating audio from assistant responses.",
  TTS_VOICES_LABEL: "Voices",
  TTS_VOICES_HINT: "Configure available voices and defaults.",

  STT_TITLE: "Speech-to-Text",
  STT_DESCRIPTION: "Enable STT and manage recognition models and providers.",
  STT_ENABLE_LABEL: "Enable STT",
  STT_ENABLE_HINT: "Allow users to dictate messages via microphone.",
  STT_MODELS_LABEL: "Models",
  STT_MODELS_HINT: "Configure available recognition models and defaults.",
  STT_PROVIDER_LABEL: "Provider",
  STT_PROVIDER_HINT: "Choose a speech-to-text provider.",
  STT_PROVIDER_WHISPER_WEB: "Whisper Web (local)",
  STT_PROVIDER_OPENAI: "OpenAI",
  STT_PROVIDER_WEB_API: "Web API",
  STT_PROVIDER_DEEPGRAM: "Deepgram",
  STT_WHISPER_MODEL_LABEL: "Model",
  STT_WHISPER_MODEL_HELP: "You can select models from Hugging Face.",

  MANAGE: "Manage"
} as const


