export const PERMISSIONS = {
  USER_VIEW: 'user_view',
  USER_MANAGEMENT: 'user_management',
  USER_PROMOTE: 'user_promote',
  USER_DEMOTE: 'user_demote',
  USER_BAN: 'user_ban',
  USER_UNBAN: 'user_unban',
  USER_DISABLE_UPLOAD: 'user_disable_upload',
  USER_ENABLE_UPLOAD: 'user_enable_upload',
  VIDEO_AUDIT: 'video_audit',
  VIDEO_MANAGE: 'video_manage',
  VIDEO_DELETE: 'video_delete',
  PHOTO_MANAGE: 'photo_manage',
  PHOTO_DELETE: 'photo_delete',
  COMMENT_MANAGE: 'comment_manage',
  COMMENT_DELETE: 'comment_delete',
  CLASSMATES_MANAGE: 'classmates_manage',
  ABOUT_MANAGE: 'about_manage',
  STATISTICS_VIEW: 'statistics_view',
  AUDIT_LOG_VIEW: 'audit_log_view',
  PERMISSION_MANAGE: 'permission_manage',
  ROLE_MANAGE: 'role_manage',
  SYSTEM_SETTINGS: 'system_settings',
}

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
}

export const ROLE_LEVELS = {
  superadmin: 100,
  admin: 80,
  moderator: 60,
  user: 10,
  guest: 0,
}

// Default permissions per role
export const ROLE_DEFAULT_PERMISSIONS = {
  superadmin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.USER_VIEW, PERMISSIONS.USER_MANAGEMENT,
    PERMISSIONS.USER_PROMOTE, PERMISSIONS.USER_DEMOTE,
    PERMISSIONS.USER_BAN, PERMISSIONS.USER_UNBAN,
    PERMISSIONS.USER_DISABLE_UPLOAD, PERMISSIONS.USER_ENABLE_UPLOAD,
    PERMISSIONS.VIDEO_AUDIT, PERMISSIONS.VIDEO_MANAGE, PERMISSIONS.VIDEO_DELETE,
    PERMISSIONS.PHOTO_MANAGE, PERMISSIONS.PHOTO_DELETE,
    PERMISSIONS.COMMENT_MANAGE, PERMISSIONS.COMMENT_DELETE,
    PERMISSIONS.CLASSMATES_MANAGE, PERMISSIONS.ABOUT_MANAGE,
    PERMISSIONS.STATISTICS_VIEW,
  ],
  moderator: [
    PERMISSIONS.VIDEO_AUDIT, PERMISSIONS.VIDEO_MANAGE,
    PERMISSIONS.COMMENT_MANAGE, PERMISSIONS.COMMENT_DELETE,
  ],
  user: [],
  guest: [],
}
