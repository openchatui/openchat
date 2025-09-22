import 'server-only'

import db from '@/lib/db'
import type { GroupPermissions, EffectivePermissions, WorkspacePerms, SharingPerms, ChatPerms, FeaturesPerms } from '@/types/permissions'

type Role = 'ADMIN' | 'USER' | 'admin' | 'user'

interface MinimalUser {
  id: string
  role: Role
}

function allFalseWorkspace(): WorkspacePerms {
  return { models: false, knowledge: false, prompts: false, tools: false }
}

function allFalseSharing(): SharingPerms {
  return { public_models: false, public_knowledge: false, public_prompts: false, public_tools: false }
}

function allFalseChat(): ChatPerms {
  return {
    controls: false,
    valves: false,
    system_prompt: false,
    params: false,
    file_upload: false,
    delete: false,
    edit: false,
    share: false,
    export: false,
    stt: false,
    tts: false,
    call: false,
    multiple_models: false,
    temporary: false,
    temporary_enforced: false,
  }
}

function allFalseFeatures(): FeaturesPerms {
  return { direct_tool_servers: false, web_search: false, image_generation: false, code_interpreter: false, notes: false }
}

function allTrueWorkspace(): WorkspacePerms {
  return { models: true, knowledge: true, prompts: true, tools: true }
}

function allTrueSharing(): SharingPerms {
  return { public_models: true, public_knowledge: true, public_prompts: true, public_tools: true }
}

function allTrueChat(): ChatPerms {
  return {
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
    tts: true,
    call: true,
    multiple_models: true,
    temporary: true,
    temporary_enforced: false,
  }
}

function allTrueFeatures(): FeaturesPerms {
  return { direct_tool_servers: true, web_search: true, image_generation: true, code_interpreter: true, notes: true }
}

/**
 * Load a user with role only. Returns null if not found.
 */
export async function getUserRole(userId: string): Promise<Role | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  return (user?.role as Role) ?? null
}

/**
 * Returns IDs of groups containing the user via the JSON userIds array.
 */
export async function getUserGroupIds(userId: string): Promise<string[]> {
  const groups = await (db as any).group.findMany()
  const ids: string[] = []
  for (const g of groups || []) {
    const raw = Array.isArray(g.userIds)
      ? g.userIds
      : Array.isArray(g.user_ids)
        ? g.user_ids
        : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
          ? (g.userIds.set as string[])
          : []
    const memberIds: string[] = Array.isArray(raw) ? raw.filter((v: any) => typeof v === 'string') : []
    if (memberIds.includes(userId)) ids.push(String(g.id))
  }
  return ids
}

/**
 * Returns the merged permissions of all groups the user belongs to.
 * Admins receive full allow on all features regardless of group settings.
 */
export async function getEffectivePermissionsForUser(userId: string): Promise<EffectivePermissions> {
  const role = await getUserRole(userId)
  const isAdmin = role === 'ADMIN' || role === 'admin'
  if (isAdmin) {
    return {
      workspace: allTrueWorkspace(),
      sharing: allTrueSharing(),
      chat: allTrueChat(),
      features: allTrueFeatures(),
    }
  }

  const groups = await (db as any).group.findMany()
  const userGroups = (groups || []).filter((g: any) => {
    const raw = Array.isArray(g.userIds)
      ? g.userIds
      : Array.isArray(g.user_ids)
        ? g.user_ids
        : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
          ? (g.userIds.set as string[])
          : []
    const memberIds: string[] = Array.isArray(raw) ? raw.filter((v: any) => typeof v === 'string') : []
    return memberIds.includes(userId)
  })

  const out: EffectivePermissions = {
    workspace: allFalseWorkspace(),
    sharing: allFalseSharing(),
    chat: allFalseChat(),
    features: allFalseFeatures(),
  }

  for (const g of userGroups) {
    const perms: GroupPermissions = (g?.permissions || {}) as GroupPermissions
    if (perms?.workspace) {
      out.workspace.models = out.workspace.models || !!perms.workspace.models
      out.workspace.knowledge = out.workspace.knowledge || !!perms.workspace.knowledge
      out.workspace.prompts = out.workspace.prompts || !!perms.workspace.prompts
      out.workspace.tools = out.workspace.tools || !!perms.workspace.tools
    }
    if (perms?.sharing) {
      out.sharing.public_models = out.sharing.public_models || !!perms.sharing.public_models
      out.sharing.public_knowledge = out.sharing.public_knowledge || !!perms.sharing.public_knowledge
      out.sharing.public_prompts = out.sharing.public_prompts || !!perms.sharing.public_prompts
      out.sharing.public_tools = out.sharing.public_tools || !!perms.sharing.public_tools
    }
    if (perms?.chat) {
      const c = perms.chat
      out.chat.controls = out.chat.controls || !!c.controls
      out.chat.valves = out.chat.valves || !!c.valves
      out.chat.system_prompt = out.chat.system_prompt || !!c.system_prompt
      out.chat.params = out.chat.params || !!c.params
      out.chat.file_upload = out.chat.file_upload || !!c.file_upload
      out.chat.delete = out.chat.delete || !!c.delete
      out.chat.edit = out.chat.edit || !!c.edit
      out.chat.share = out.chat.share || !!c.share
      out.chat.export = out.chat.export || !!c.export
      out.chat.stt = out.chat.stt || !!c.stt
      out.chat.tts = out.chat.tts || !!c.tts
      out.chat.call = out.chat.call || !!c.call
      out.chat.multiple_models = out.chat.multiple_models || !!c.multiple_models
      out.chat.temporary = out.chat.temporary || !!c.temporary
      // For enforcement, if any group enforces temporary, treat as enforced
      out.chat.temporary_enforced = out.chat.temporary_enforced || !!c.temporary_enforced
    }
    if (perms?.features) {
      out.features.direct_tool_servers = out.features.direct_tool_servers || !!perms.features.direct_tool_servers
      out.features.web_search = out.features.web_search || !!perms.features.web_search
      out.features.image_generation = out.features.image_generation || !!perms.features.image_generation
      out.features.code_interpreter = out.features.code_interpreter || !!perms.features.code_interpreter
      out.features.notes = out.features.notes || !!perms.features.notes
    }
  }

  return out
}

/**
 * Checks whether a given feature (by key path) is enabled for the user. Admins always true.
 * key can be like: 'workspace.models', 'features.web_search', 'chat.tts', etc.
 */
export async function isFeatureEnabled(userId: string, key: string): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'ADMIN' || role === 'admin') return true
  const eff = await getEffectivePermissionsForUser(userId)
  const [group, prop] = key.split('.') as [keyof EffectivePermissions, string]
  if (!group || !prop) return false
  const obj: any = (eff as any)[group]
  if (!obj) return false
  return !!obj[prop]
}

interface ModelLikeAC {
  id: string
  userId: string
  accessControl?: any | null
}

function arr(val: any): string[] {
  if (Array.isArray(val)) return val.filter((v) => typeof v === 'string')
  return []
}

/**
 * Returns whether the user can read the model. Admins and owners are allowed.
 * Otherwise, checks accessControl.read lists for user_ids or group_ids.
 */
export async function canReadModel(userId: string, model: ModelLikeAC): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'ADMIN' || role === 'admin') return true
  if (model.userId === userId) return true
  const ac = (model as any).accessControl || (model as any).access_control || {}
  const read = (ac?.read || {}) as any
  const userIds = arr(read.user_ids)
  if (userIds.includes(userId)) return true
  const groupIds = arr(read.group_ids)
  if (groupIds.length === 0) return false
  const userGroupIds = await getUserGroupIds(userId)
  return userGroupIds.some((gid) => groupIds.includes(gid))
}

/**
 * Returns whether the user can write the model. Admins and owners are allowed.
 */
export async function canWriteModel(userId: string, model: ModelLikeAC): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'ADMIN' || role === 'admin') return true
  if (model.userId === userId) return true
  const ac = (model as any).accessControl || (model as any).access_control || {}
  const write = (ac?.write || {}) as any
  const userIds = arr(write.user_ids)
  if (userIds.includes(userId)) return true
  const groupIds = arr(write.group_ids)
  if (groupIds.length === 0) return false
  const userGroupIds = await getUserGroupIds(userId)
  return userGroupIds.some((gid) => groupIds.includes(gid))
}

export async function canReadModelById(userId: string, modelId: string): Promise<boolean> {
  const model = await db.model.findUnique({ where: { id: modelId }, select: { id: true, userId: true, accessControl: true } })
  if (!model) return false
  return canReadModel(userId, model as any)
}

export async function filterModelsReadableByUser(userId: string, models: any[]): Promise<any[]> {
  const results: any[] = []
  for (const m of models) {
    if (await canReadModel(userId, m)) results.push(m)
  }
  return results
}


