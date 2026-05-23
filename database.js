const path = require('path');

let db = null;

// Permission definitions
const PERMISSIONS = {
  // User management permissions
  USER_MANAGEMENT: 'user_management',
  USER_PROMOTE: 'user_promote',
  USER_DEMOTE: 'user_demote',
  USER_BAN: 'user_ban',
  USER_UNBAN: 'user_unban',
  
  // Content management permissions
  VIDEO_AUDIT: 'video_audit',
  VIDEO_MANAGE: 'video_manage',
  VIDEO_DELETE: 'video_delete',
  PHOTO_MANAGE: 'photo_manage',
  PHOTO_DELETE: 'photo_delete',
  COMMENT_MANAGE: 'comment_manage',
  COMMENT_DELETE: 'comment_delete',
  
  // System management permissions
  CLASSMATES_MANAGE: 'classmates_manage',
  ABOUT_MANAGE: 'about_manage',
  STATISTICS_VIEW: 'statistics_view',
  AUDIT_LOG_VIEW: 'audit_log_view',
  
  // Super admin only permissions
  PERMISSION_MANAGE: 'permission_manage',
  ROLE_MANAGE: 'role_manage',
  SYSTEM_SETTINGS: 'system_settings'
};

// Default permission templates
const PERMISSION_TEMPLATES = {
  superadmin: {
    name: '超级管理员',
    description: '拥有所有权限，包括系统设置和权限管理',
    permissions: Object.values(PERMISSIONS)
  },
  admin: {
    name: '管理员',
    description: '拥有标准管理权限',
    permissions: [
      PERMISSIONS.USER_MANAGEMENT,
      PERMISSIONS.USER_BAN,
      PERMISSIONS.USER_UNBAN,
      PERMISSIONS.VIDEO_AUDIT,
      PERMISSIONS.VIDEO_MANAGE,
      PERMISSIONS.VIDEO_DELETE,
      PERMISSIONS.PHOTO_MANAGE,
      PERMISSIONS.PHOTO_DELETE,
      PERMISSIONS.COMMENT_MANAGE,
      PERMISSIONS.COMMENT_DELETE,
      PERMISSIONS.CLASSMATES_MANAGE,
      PERMISSIONS.ABOUT_MANAGE,
      PERMISSIONS.STATISTICS_VIEW
    ]
  },
  moderator: {
    name: '版主',
    description: '拥有内容审核和管理权限',
    permissions: [
      PERMISSIONS.VIDEO_AUDIT,
      PERMISSIONS.VIDEO_MANAGE,
      PERMISSIONS.COMMENT_MANAGE,
      PERMISSIONS.COMMENT_DELETE
    ]
  },
  user: {
    name: '普通用户',
    description: '普通用户权限',
    permissions: []
  }
};

async function initDatabase() {
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');
  
  const dbPath = path.join(__dirname, 'db.json');
  const adapter = new JSONFile(dbPath);
  db = new Low(adapter, { 
    users: [], 
    videos: [], 
    photos: [],
    comments: [], 
    classmates: [], 
    about: null,
    auditLogs: [],
    permissionTemplates: PERMISSION_TEMPLATES
  });
  
  await db.read();
  db.data ||= { 
    users: [], 
    videos: [], 
    photos: [],
    photoBatches: [],
    comments: [], 
    classmates: [], 
    about: null,
    auditLogs: [],
    permissionTemplates: PERMISSION_TEMPLATES
  };
  
  // Initialize arrays
  db.data.comments ||= [];
  db.data.classmates ||= [];
  db.data.photos ||= [];
  db.data.photoBatches ||= [];
  db.data.auditLogs ||= [];
  db.data.permissionTemplates ||= PERMISSION_TEMPLATES;
  
  // Migrate existing users to new permission system
  db.data.users.forEach(user => {
    // Set default role if not exists
    if (!user.role) {
      user.role = 'user';
    }
    
    // Migrate old 'admin' role to new system
    if (user.role === 'admin' && !user.isSuperAdmin) {
      user.role = 'admin';
      user.permissions = [...PERMISSION_TEMPLATES.admin.permissions];
    }
    
    // Set superadmin
    if (user.role === 'superadmin' || user.isSuperAdmin) {
      user.role = 'superadmin';
      user.permissions = [...PERMISSION_TEMPLATES.superadmin.permissions];
      user.isSuperAdmin = true;
    }
    
    // Set user status
    if (!user.status) {
      user.status = 'approved';
    }
    
    // Set permissions for regular users
    if (user.role === 'user') {
      user.permissions = [];
    }
  });
  
  // Initialize default about page content
  if (!db.data.about) {
    db.data.about = {
      creatorName: '2302班技术团队',
      creatorRole: '网站开发 & 设计',
      projectDesc: '2302班回忆录是一个专门为我们班级打造的视频分享与回忆记录平台。在这里，我们可以上传、观看和分享我们在校园里的美好时光。',
      projectDesc2: '从课堂上的欢声笑语，活动中的精彩瞬间，旅行中的难忘记忆，都可以在这里永久保存。',
      thanks: '感谢每一位为这个项目付出的同学们，感谢老师的指导与支持！',
      thanks2: '愿我们的回忆永远珍贵，友谊地久天长！',
      updated_at: new Date().toISOString()
    };
  }
  
  await db.write();
  console.log('Database initialized with permission system');
  return db;
}

function getDb() {
  return db;
}

function getPermissions() {
  return PERMISSIONS;
}

function getPermissionTemplates() {
  return PERMISSION_TEMPLATES;
}

// Check if user has a specific permission
function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'superadmin' || user.isSuperAdmin) return true;
  if (!user.permissions) return false;
  return user.permissions.includes(permission);
}

// Check if user has any of the specified permissions
function hasAnyPermission(user, permissions) {
  if (!user) return false;
  if (user.role === 'superadmin' || user.isSuperAdmin) return true;
  if (!user.permissions) return false;
  return permissions.some(p => user.permissions.includes(p));
}

// Check if user has all of the specified permissions
function hasAllPermissions(user, permissions) {
  if (!user) return false;
  if (user.role === 'superadmin' || user.isSuperAdmin) return true;
  if (!user.permissions) return false;
  return permissions.every(p => user.permissions.includes(p));
}

module.exports = { 
  getDb, 
  initDatabase, 
  getPermissions, 
  getPermissionTemplates,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
};
