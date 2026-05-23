/**
 * 权限管理系统 (RBAC - Role-Based Access Control)
 * 
 * 功能模块：
 * 1. 权限定义和配置
 * 2. 角色管理
 * 3. 权限验证
 * 4. 审计日志
 * 5. 权限缓存
 */

const path = require('path');

// ==================== 权限定义 ====================

const PERMISSIONS = {
  // 用户管理权限
  USER_VIEW: 'user_view',              // 查看用户列表
  USER_MANAGEMENT: 'user_management',  // 管理用户
  USER_PROMOTE: 'user_promote',        // 提升用户为管理员
  USER_DEMOTE: 'user_demote',          // 降级管理员
  USER_BAN: 'user_ban',                // 封禁用户
  USER_UNBAN: 'user_unban',            // 解封用户
  USER_DISABLE_UPLOAD: 'user_disable_upload',  // 禁用上传
  USER_ENABLE_UPLOAD: 'user_enable_upload',    // 启用上传
  
  // 内容管理权限
  VIDEO_AUDIT: 'video_audit',          // 视频审核
  VIDEO_MANAGE: 'video_manage',        // 视频管理
  VIDEO_DELETE: 'video_delete',        // 删除视频
  PHOTO_MANAGE: 'photo_manage',        // 照片管理
  PHOTO_DELETE: 'photo_delete',        // 删除照片
  COMMENT_MANAGE: 'comment_manage',    // 评论管理
  COMMENT_DELETE: 'comment_delete',    // 删除评论
  
  // 系统管理权限
  CLASSMATES_MANAGE: 'classmates_manage',  // 同学录管理
  ABOUT_MANAGE: 'about_manage',        // 关于页面管理
  STATISTICS_VIEW: 'statistics_view',  // 查看统计
  
  // 权限管理权限 (仅超级管理员)
  AUDIT_LOG_VIEW: 'audit_log_view',    // 查看审计日志
  PERMISSION_MANAGE: 'permission_manage',  // 管理权限
  ROLE_MANAGE: 'role_manage',          // 管理角色
  SYSTEM_SETTINGS: 'system_settings',  // 系统设置
};

// ==================== 角色定义 ====================

const ROLES = {
  SUPERADMIN: {
    id: 'superadmin',
    name: '超级管理员',
    description: '拥有系统所有权限，包括权限管理和系统设置',
    level: 100,
    permissions: Object.values(PERMISSIONS),  // 拥有所有权限
    isSystem: true,  // 系统内置角色，不可删除
  },
  ADMIN: {
    id: 'admin',
    name: '管理员',
    description: '拥有标准管理权限，可管理用户和内容',
    level: 80,
    permissions: [
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_MANAGEMENT,
      PERMISSIONS.USER_BAN,
      PERMISSIONS.USER_UNBAN,
      PERMISSIONS.USER_DISABLE_UPLOAD,
      PERMISSIONS.USER_ENABLE_UPLOAD,
      PERMISSIONS.VIDEO_AUDIT,
      PERMISSIONS.VIDEO_MANAGE,
      PERMISSIONS.VIDEO_DELETE,
      PERMISSIONS.PHOTO_MANAGE,
      PERMISSIONS.PHOTO_DELETE,
      PERMISSIONS.COMMENT_MANAGE,
      PERMISSIONS.COMMENT_DELETE,
      PERMISSIONS.CLASSMATES_MANAGE,
      PERMISSIONS.ABOUT_MANAGE,
      PERMISSIONS.STATISTICS_VIEW,
    ],
    isSystem: true,
  },
  MODERATOR: {
    id: 'moderator',
    name: '版主',
    description: '拥有内容审核和管理权限',
    level: 60,
    permissions: [
      PERMISSIONS.VIDEO_AUDIT,
      PERMISSIONS.VIDEO_MANAGE,
      PERMISSIONS.COMMENT_MANAGE,
      PERMISSIONS.COMMENT_DELETE,
    ],
    isSystem: true,
  },
  USER: {
    id: 'user',
    name: '普通用户',
    description: '普通用户权限，只能查看和上传自己的内容',
    level: 10,
    permissions: [],  // 普通用户没有特殊权限
    isSystem: true,
  },
  GUEST: {
    id: 'guest',
    name: '访客',
    description: '未登录用户，只能浏览公开内容',
    level: 0,
    permissions: [],
    isSystem: true,
  },
};

// ==================== 权限分组 (用于界面展示) ====================

const PERMISSION_GROUPS = {
  user: {
    name: '用户管理',
    icon: 'mdi:account-group',
    permissions: [
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_MANAGEMENT,
      PERMISSIONS.USER_PROMOTE,
      PERMISSIONS.USER_DEMOTE,
      PERMISSIONS.USER_BAN,
      PERMISSIONS.USER_UNBAN,
      PERMISSIONS.USER_DISABLE_UPLOAD,
      PERMISSIONS.USER_ENABLE_UPLOAD,
    ],
  },
  content: {
    name: '内容管理',
    icon: 'mdi:folder-multiple',
    permissions: [
      PERMISSIONS.VIDEO_AUDIT,
      PERMISSIONS.VIDEO_MANAGE,
      PERMISSIONS.VIDEO_DELETE,
      PERMISSIONS.PHOTO_MANAGE,
      PERMISSIONS.PHOTO_DELETE,
      PERMISSIONS.COMMENT_MANAGE,
      PERMISSIONS.COMMENT_DELETE,
    ],
  },
  system: {
    name: '系统管理',
    icon: 'mdi:cog',
    permissions: [
      PERMISSIONS.CLASSMATES_MANAGE,
      PERMISSIONS.ABOUT_MANAGE,
      PERMISSIONS.STATISTICS_VIEW,
    ],
  },
  security: {
    name: '权限与安全',
    icon: 'mdi:shield-account',
    permissions: [
      PERMISSIONS.AUDIT_LOG_VIEW,
      PERMISSIONS.PERMISSION_MANAGE,
      PERMISSIONS.ROLE_MANAGE,
      PERMISSIONS.SYSTEM_SETTINGS,
    ],
  },
};

// ==================== 权限描述 ====================

const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.USER_VIEW]: { name: '查看用户', description: '查看用户列表和详情' },
  [PERMISSIONS.USER_MANAGEMENT]: { name: '管理用户', description: '管理用户账号和状态' },
  [PERMISSIONS.USER_PROMOTE]: { name: '提升用户', description: '将普通用户提升为管理员' },
  [PERMISSIONS.USER_DEMOTE]: { name: '降级用户', description: '将管理员降级为普通用户' },
  [PERMISSIONS.USER_BAN]: { name: '封禁用户', description: '封禁违规用户账号' },
  [PERMISSIONS.USER_UNBAN]: { name: '解封用户', description: '解封已封禁的用户' },
  [PERMISSIONS.USER_DISABLE_UPLOAD]: { name: '禁用上传', description: '禁用用户的上传功能' },
  [PERMISSIONS.USER_ENABLE_UPLOAD]: { name: '启用上传', description: '启用用户的上传功能' },
  [PERMISSIONS.VIDEO_AUDIT]: { name: '视频审核', description: '审核用户上传的视频' },
  [PERMISSIONS.VIDEO_MANAGE]: { name: '视频管理', description: '管理所有视频内容' },
  [PERMISSIONS.VIDEO_DELETE]: { name: '删除视频', description: '删除违规视频' },
  [PERMISSIONS.PHOTO_MANAGE]: { name: '照片管理', description: '管理同学录照片' },
  [PERMISSIONS.PHOTO_DELETE]: { name: '删除照片', description: '删除照片' },
  [PERMISSIONS.COMMENT_MANAGE]: { name: '评论管理', description: '管理用户评论' },
  [PERMISSIONS.COMMENT_DELETE]: { name: '删除评论', description: '删除违规评论' },
  [PERMISSIONS.CLASSMATES_MANAGE]: { name: '同学录管理', description: '管理同学录信息' },
  [PERMISSIONS.ABOUT_MANAGE]: { name: '关于页面', description: '编辑关于页面内容' },
  [PERMISSIONS.STATISTICS_VIEW]: { name: '查看统计', description: '查看数据统计信息' },
  [PERMISSIONS.AUDIT_LOG_VIEW]: { name: '审计日志', description: '查看系统操作日志' },
  [PERMISSIONS.PERMISSION_MANAGE]: { name: '权限管理', description: '管理用户权限' },
  [PERMISSIONS.ROLE_MANAGE]: { name: '角色管理', description: '管理系统角色' },
  [PERMISSIONS.SYSTEM_SETTINGS]: { name: '系统设置', description: '配置系统参数' },
};

// ==================== 权限验证函数 ====================

/**
 * 检查用户是否拥有特定权限
 * @param {Object} user - 用户对象
 * @param {String} permission - 权限标识
 * @returns {Boolean}
 */
function hasPermission(user, permission) {
  if (!user) return false;
  
  // 超级管理员拥有所有权限
  if (user.role === 'superadmin' || user.isSuperAdmin) {
    return true;
  }
  
  // 检查用户权限列表
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }
  
  // 检查角色默认权限
  const role = ROLES[user.role?.toUpperCase()];
  if (role && role.permissions.includes(permission)) {
    return true;
  }
  
  return false;
}

/**
 * 检查用户是否拥有任意一个权限
 * @param {Object} user - 用户对象
 * @param {Array} permissions - 权限标识数组
 * @returns {Boolean}
 */
function hasAnyPermission(user, permissions) {
  if (!user || !Array.isArray(permissions)) return false;
  return permissions.some(p => hasPermission(user, p));
}

/**
 * 检查用户是否拥有所有权限
 * @param {Object} user - 用户对象
 * @param {Array} permissions - 权限标识数组
 * @returns {Boolean}
 */
function hasAllPermissions(user, permissions) {
  if (!user || !Array.isArray(permissions)) return false;
  return permissions.every(p => hasPermission(user, p));
}

/**
 * 获取用户的所有权限
 * @param {Object} user - 用户对象
 * @returns {Array}
 */
function getUserPermissions(user) {
  if (!user) return [];
  
  // 超级管理员返回所有权限
  if (user.role === 'superadmin' || user.isSuperAdmin) {
    return Object.values(PERMISSIONS);
  }
  
  // 合并角色默认权限和用户自定义权限
  const role = ROLES[user.role?.toUpperCase()];
  const rolePermissions = role ? role.permissions : [];
  const userPermissions = user.permissions || [];
  
  return [...new Set([...rolePermissions, ...userPermissions])];
}

/**
 * 获取用户角色信息
 * @param {String} roleId - 角色ID
 * @returns {Object|null}
 */
function getRole(roleId) {
  return ROLES[roleId?.toUpperCase()] || null;
}

/**
 * 获取所有角色列表
 * @returns {Array}
 */
function getAllRoles() {
  return Object.values(ROLES);
}

/**
 * 获取所有权限列表
 * @returns {Object}
 */
function getAllPermissions() {
  return PERMISSIONS;
}

/**
 * 获取权限分组
 * @returns {Object}
 */
function getPermissionGroups() {
  return PERMISSION_GROUPS;
}

/**
 * 获取权限描述
 * @param {String} permission - 权限标识
 * @returns {Object}
 */
function getPermissionDescription(permission) {
  return PERMISSION_DESCRIPTIONS[permission] || { name: permission, description: '' };
}

// ==================== 审计日志 ====================

let db = null;

/**
 * 初始化审计日志数据库连接
 * @param {Object} database - 数据库实例
 */
function initAuditLog(database) {
  db = database;
}

/**
 * 添加审计日志
 * @param {Object} logEntry - 日志条目
 * @returns {Promise}
 */
async function addAuditLog(logEntry) {
  if (!db) {
    console.error('Audit log database not initialized');
    return;
  }
  
  try {
    await db.read();
    
    if (!db.data.auditLogs) {
      db.data.auditLogs = [];
    }
    
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: new Date().toISOString(),
      ...logEntry,
    };
    
    db.data.auditLogs.push(entry);
    
    // 只保留最近1000条日志
    if (db.data.auditLogs.length > 1000) {
      db.data.auditLogs = db.data.auditLogs.slice(-1000);
    }
    
    await db.write();
  } catch (error) {
    console.error('Failed to add audit log:', error);
  }
}

/**
 * 获取审计日志
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>}
 */
async function getAuditLogs(options = {}) {
  if (!db) {
    console.error('Audit log database not initialized');
    return [];
  }
  
  try {
    await db.read();
    let logs = db.data.auditLogs || [];
    
    // 按时间倒序
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 过滤
    if (options.action) {
      logs = logs.filter(log => log.action === options.action);
    }
    if (options.userId) {
      logs = logs.filter(log => log.performedBy === options.userId);
    }
    if (options.targetId) {
      logs = logs.filter(log => log.targetId === options.targetId);
    }
    if (options.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(options.startDate));
    }
    if (options.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(options.endDate));
    }
    
    // 分页
    const page = options.page || 1;
    const limit = options.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      logs: logs.slice(startIndex, endIndex),
      total: logs.length,
      page,
      totalPages: Math.ceil(logs.length / limit),
    };
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return { logs: [], total: 0, page: 1, totalPages: 0 };
  }
}

// ==================== 导出模块 ====================

module.exports = {
  // 常量
  PERMISSIONS,
  ROLES,
  PERMISSION_GROUPS,
  PERMISSION_DESCRIPTIONS,
  
  // 权限验证
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  
  // 角色管理
  getRole,
  getAllRoles,
  
  // 权限管理
  getAllPermissions,
  getPermissionGroups,
  getPermissionDescription,
  
  // 审计日志
  initAuditLog,
  addAuditLog,
  getAuditLogs,
};
