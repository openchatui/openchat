export interface WorkspacePerms {
  models: boolean
  knowledge: boolean
  prompts: boolean
  tools: boolean
}

export interface SharingPerms {
  public_models: boolean
  public_knowledge: boolean
  public_prompts: boolean
  public_tools: boolean
}

export interface ChatPerms {
  controls: boolean
  valves: boolean
  system_prompt: boolean
  params: boolean
  file_upload: boolean
  delete: boolean
  edit: boolean
  share: boolean
  export: boolean
  stt: boolean
  tts: boolean
  call: boolean
  multiple_models: boolean
  temporary: boolean
  temporary_enforced: boolean
}

export interface FeaturesPerms {
  direct_tool_servers: boolean
  web_search: boolean
  image_generation: boolean
  code_interpreter: boolean
  notes: boolean
}

export interface GroupPermissions {
  workspace?: Partial<WorkspacePerms>
  sharing?: Partial<SharingPerms>
  chat?: Partial<ChatPerms>
  features?: Partial<FeaturesPerms>
}

export interface EffectivePermissions {
  workspace: WorkspacePerms
  sharing: SharingPerms
  chat: ChatPerms
  features: FeaturesPerms
}

export const DEFAULT_GROUP_PERMISSIONS: GroupPermissions = {
  workspace: { models: false, knowledge: false, prompts: false, tools: false },
  sharing: { public_models: false, public_knowledge: false, public_prompts: false, public_tools: false },
  chat: {
    controls: true,
    valves: true,
    system_prompt: true,
    params: true,
    file_upload: true,
    delete: true,
    edit: true,
    share: true,
    export: true,
    stt: true,
    tts: false,
    call: true,
    multiple_models: true,
    temporary: true,
    temporary_enforced: false,
  },
  features: { direct_tool_servers: false, web_search: true, image_generation: true, code_interpreter: true, notes: true },
}


