// Access Control
export {
  PermissionsService,
} from './access-control/permissions.service';

export {
  ModelAccessService,
} from './access-control/model-access.service';

// Configuration
export {
  ConfigService,
} from './configuration/config.service';

export type {
  AudioConfig,
} from './configuration/config.service';

// User Management
export {
  UserService,
} from './user-management/user.service';

// Group Management
export {
  GroupService,
} from './group-management/group.service';

// Legacy compatibility exports - import and re-export
export { getUserRole, getUserGroupIds, getEffectivePermissionsForUser, isFeatureEnabled } from './access-control/permissions.service';
export { canReadModel, canWriteModel, canReadModelById, filterModelsReadableByUser } from './access-control/model-access.service';
export { getWebSearchEnabled, getImageGenerationAvailable, getAudioConfig } from './configuration/config.service';
export { getAdminUsers, getAdminUsersLight, getAdminUsersLightPage } from './user-management/user.service';
export { getAdminGroups } from './group-management/group.service';
