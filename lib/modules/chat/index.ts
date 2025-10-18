// Main service classes
export {
  ChatStore,
  ModelResolutionService,
  ModelParametersService,
  ChatPreparationService,
  SystemPromptService,
  ToolsService,
} from './chat.service';

// Utility classes
export {
  MessageUtils,
  GenerationUtils,
  ProviderUtils,
  StreamUtils,
  PersistenceUtils,
  ValidationUtils,
  IdUtils,
} from './chat.utils';

// Types
export type {
  ChatData,
  SelectedModelInfo,
  ModelResolutionArgs,
  ResolvedModelInfo,
  AdvancedControls,
  GenerationRequest,
  RawParamsRecord,
  NormalizedModelParams,
  ModelParamsInput,
  ChatPreparationInput,
  PreparedChat,
  SystemPromptInput,
  ToolOptions,
  StreamArgs,
  SaveMessagesParams,
  CreateChatParams,
  SaveChatParams,
  LoadChatParams,
  UpdateChatTitleParams,
  ArchiveChatParams,
  MessageMetadata,
  AppUIMessage,
} from './chat.types';

// Legacy compatibility exports (to ease migration)
// These can be removed once all imports are updated
export { ChatStore as createChat } from './chat.service';
export { ChatStore as loadChat } from './chat.service';
export { ChatStore as saveChat } from './chat.service';
export { ChatStore as getUserChats } from './chat.service';
export { ChatStore as getUserArchivedChats } from './chat.service';
export { ChatStore as chatExists } from './chat.service';
export { ChatStore as deleteChat } from './chat.service';
export { ChatStore as archiveChat } from './chat.service';
export { ChatStore as unarchiveChat } from './chat.service';
export { ChatStore as updateChatTitle } from './chat.service';

export { ModelParametersService as fetchModelParams } from './chat.service';
export { ModelParametersService as normalizeModelParams } from './chat.service';
export { ModelResolutionService as resolveModelInfoAndHandle } from './chat.service';
export { ChatPreparationService as prepareChatAndMessages } from './chat.service';
export { SystemPromptService as composeSystemPrompt } from './chat.service';
export { ToolsService as buildTools } from './chat.service';

export { MessageUtils as buildMessageMetadataStart } from './chat.utils';
export { MessageUtils as filterToTextParts } from './chat.utils';
export { MessageUtils as trimByCharBudget } from './chat.utils';
export { MessageUtils as hasSystemInMessages } from './chat.utils';
export { MessageUtils as systemParamForModel } from './chat.utils';
export { GenerationUtils as mergeGenerationParams } from './chat.utils';
export { ProviderUtils as resolveOpenAIProviderOptions } from './chat.utils';
export { StreamUtils as buildToUIMessageStreamArgs } from './chat.utils';
export { PersistenceUtils as saveMessagesReplacingLastAssistant } from './chat.utils';
