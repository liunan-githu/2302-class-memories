module.exports = function ({
  db,
  authRequired,
  adminRequired,
  PERMISSIONS,
  addAuditLog,
  getAuditLogs,
  getAllPermissions,
  getAllRoles,
  getPermissionGroups,
  getPermissionDescription,
}) {
  const router = require('express').Router();

  // ==================== 用户管理API ====================

  router.post('/admin/user/:id/ban', adminRequired(PERMISSIONS.USER_BAN), async (req, res) => {
    try {
      await db.read();
      const userIndex = db.data.users.findIndex(u => u.id === parseInt(req.params.id));

      if (userIndex === -1) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const { reason } = req.body;
      db.data.users[userIndex].isBanned = true;
      db.data.users[userIndex].banReason = reason || '';
      db.data.users[userIndex].bannedAt = new Date().toISOString();
      await db.write();

      await addAuditLog({
        action: 'USER_BAN',
        targetId: parseInt(req.params.id),
        targetUsername: db.data.users[userIndex].username,
        performedBy: req.user.id,
        performedByUsername: req.user.username,
        details: { reason: reason || '' },
      });

      res.json({ message: '用户已封禁' });
    } catch (error) {
      console.error('封禁用户失败:', error);
      res.status(500).json({ error: '操作失败' });
    }
  });

  router.post(
    '/admin/user/:id/unban',
    adminRequired(PERMISSIONS.USER_UNBAN),
    async (req, res) => {
      try {
        await db.read();
        const userIndex = db.data.users.findIndex(u => u.id === parseInt(req.params.id));

        if (userIndex === -1) {
          return res.status(404).json({ error: '用户不存在' });
        }

        db.data.users[userIndex].isBanned = false;
        db.data.users[userIndex].banReason = '';
        await db.write();

        await addAuditLog({
          action: 'USER_UNBAN',
          targetId: parseInt(req.params.id),
          targetUsername: db.data.users[userIndex].username,
          performedBy: req.user.id,
          performedByUsername: req.user.username,
          details: {},
        });

        res.json({ message: '用户已解封' });
      } catch (error) {
        console.error('解封用户失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  router.post(
    '/admin/user/:id/disable-upload',
    adminRequired(PERMISSIONS.USER_DISABLE_UPLOAD),
    async (req, res) => {
      try {
        await db.read();
        const userIndex = db.data.users.findIndex(u => u.id === parseInt(req.params.id));

        if (userIndex === -1) {
          return res.status(404).json({ error: '用户不存在' });
        }

        const { reason } = req.body;
        db.data.users[userIndex].uploadDisabled = true;
        db.data.users[userIndex].uploadDisableReason = reason || '';
        await db.write();

        res.json({ message: '用户上传已禁止' });
      } catch (error) {
        console.error('禁止上传失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  router.post(
    '/admin/user/:id/enable-upload',
    adminRequired(PERMISSIONS.USER_ENABLE_UPLOAD),
    async (req, res) => {
      try {
        await db.read();
        const userIndex = db.data.users.findIndex(u => u.id === parseInt(req.params.id));

        if (userIndex === -1) {
          return res.status(404).json({ error: '用户不存在' });
        }

        db.data.users[userIndex].uploadDisabled = false;
        db.data.users[userIndex].uploadDisableReason = '';
        await db.write();

        res.json({ message: '用户上传已允许' });
      } catch (error) {
        console.error('允许上传失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  /**
   * @openapi
   * /api/user/status:
   *   get:
   *     summary: 获取当前用户状态
   *     description: 获取当前登录用户的状态信息（封禁、上传限制等）
   *     tags: [用户]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 用户状态信息
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 isBanned:
   *                   type: boolean
   *                 banReason:
   *                   type: string
   *                 uploadDisabled:
   *                   type: boolean
   *                 uploadDisableReason:
   *                   type: string
   */
  router.get('/user/status', authRequired, async (req, res) => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.sendStatus(404);

    res.json({
      isBanned: user.isBanned,
      banReason: user.banReason,
      uploadDisabled: user.uploadDisabled,
      uploadDisableReason: user.uploadDisableReason,
    });
  });

  /**
   * @openapi
   * /api/user/permissions:
   *   get:
   *     summary: 获取当前用户权限
   *     description: 获取当前登录用户的权限列表
   *     tags: [用户]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 用户权限信息
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 permissions:
   *                   type: array
   *                   items:
   *                     type: string
   *                 role:
   *                   type: string
   *                 isSuperAdmin:
   *                   type: boolean
   */
  router.get('/user/permissions', authRequired, async (req, res) => {
    try {
      await db.read();
      const user = db.data.users.find(u => u.id === req.user.id);
      if (!user) return res.sendStatus(404);

      const { getUserPermissions } = require('../permissions');
      const permissions = getUserPermissions(user);

      res.json({
        permissions: permissions,
        role: user.role,
        isSuperAdmin: user.role === 'superadmin' || user.isSuperAdmin,
      });
    } catch (error) {
      console.error('获取用户权限失败:', error);
      res.status(500).json({ error: '获取权限失败' });
    }
  });

  /**
   * @openapi
   * /api/admin/users/all:
   *   get:
   *     summary: 获取所有用户列表（管理员）
   *     tags: [管理-用户]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 用户列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   */
  router.get(
    '/admin/users/all',
    adminRequired(PERMISSIONS.USER_MANAGEMENT),
    async (req, res) => {
      try {
        await db.read();
        const users = db.data.users.map(u => ({
          id: u.id,
          username: u.username,
          name: u.name || '',
          role: u.role || 'user',
          status: u.status || 'pending',
          isBanned: u.isBanned || false,
          isSuperAdmin: u.isSuperAdmin || false,
          permissions: u.permissions || [],
          created_at: u.created_at,
          lastLogin: u.lastLogin || null,
        }));
        res.json(users);
      } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ error: '获取用户列表失败' });
      }
    }
  );

  router.post(
    '/admin/users/:id/promote',
    adminRequired(PERMISSIONS.USER_PROMOTE),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        await db.read();

        const user = db.data.users.find(u => u.id === userId);
        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        if (user.role === 'admin' || user.role === 'superadmin') {
          return res.status(400).json({ error: '用户已经是管理员' });
        }

        const { ROLES } = require('../permissions');
        const oldRole = user.role;
        user.role = 'admin';
        user.permissions = [...ROLES.ADMIN.permissions];

        await db.write();

        await addAuditLog({
          action: 'USER_PROMOTE',
          targetId: userId,
          targetUsername: user.username,
          performedBy: req.user.id,
          performedByUsername: req.user.username,
          details: { oldRole, newRole: 'admin' },
        });

        res.json({
          message: '用户已提升为管理员',
          user: { id: user.id, username: user.username, role: user.role },
        });
      } catch (error) {
        console.error('提升用户失败:', error);
        res.status(500).json({ error: '提升用户失败' });
      }
    }
  );

  router.post(
    '/admin/users/:id/demote',
    adminRequired(PERMISSIONS.USER_DEMOTE),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        await db.read();

        const user = db.data.users.find(u => u.id === userId);
        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        if (user.role === 'superadmin') {
          return res.status(403).json({ error: '不能降级超级管理员' });
        }

        if (user.role !== 'admin') {
          return res.status(400).json({ error: '用户不是管理员' });
        }

        const oldRole = user.role;
        user.role = 'user';
        user.permissions = [];

        await db.write();

        await addAuditLog({
          action: 'USER_DEMOTE',
          targetId: userId,
          targetUsername: user.username,
          performedBy: req.user.id,
          performedByUsername: req.user.username,
          details: { oldRole, newRole: 'user' },
        });

        res.json({
          message: '管理员已降级为普通用户',
          user: { id: user.id, username: user.username, role: user.role },
        });
      } catch (error) {
        console.error('降级用户失败:', error);
        res.status(500).json({ error: '降级用户失败' });
      }
    }
  );

  router.put(
    '/admin/users/:id/permissions',
    adminRequired(PERMISSIONS.PERMISSION_MANAGE),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
          return res.status(400).json({ error: '权限格式不正确' });
        }

        await db.read();

        const user = db.data.users.find(u => u.id === userId);
        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        if (user.role === 'superadmin') {
          return res.status(403).json({ error: '不能修改超级管理员权限' });
        }

        const oldPermissions = [...(user.permissions || [])];
        user.permissions = permissions;

        await db.write();

        await addAuditLog({
          action: 'PERMISSION_UPDATE',
          targetId: userId,
          targetUsername: user.username,
          performedBy: req.user.id,
          performedByUsername: req.user.username,
          details: { oldPermissions, newPermissions: permissions },
        });

        res.json({
          message: '权限已更新',
          user: { id: user.id, username: user.username, permissions },
        });
      } catch (error) {
        console.error('更新权限失败:', error);
        res.status(500).json({ error: '更新权限失败' });
      }
    }
  );

  // ==================== 权限管理API ====================

  router.get(
    '/admin/permissions',
    adminRequired(PERMISSIONS.PERMISSION_MANAGE),
    async (req, res) => {
      try {
        res.json({
          permissions: getAllPermissions(),
          roles: getAllRoles(),
          groups: getPermissionGroups(),
          descriptions: Object.fromEntries(
            Object.keys(getAllPermissions()).map(key => [
              getAllPermissions()[key],
              getPermissionDescription(getAllPermissions()[key]),
            ])
          ),
        });
      } catch (error) {
        console.error('获取权限列表失败:', error);
        res.status(500).json({ error: '获取权限列表失败' });
      }
    }
  );

  router.get(
    '/admin/audit-logs',
    adminRequired(PERMISSIONS.AUDIT_LOG_VIEW),
    async (req, res) => {
      try {
        const { page = 1, limit = 50, action, userId, targetId } = req.query;

        const result = await getAuditLogs({
          page: parseInt(page),
          limit: parseInt(limit),
          action,
          userId: userId ? parseInt(userId) : undefined,
          targetId: targetId ? parseInt(targetId) : undefined,
        });

        res.json(result);
      } catch (error) {
        console.error('获取审计日志失败:', error);
        res.status(500).json({ error: '获取审计日志失败' });
      }
    }
  );

  // ==================== 调试API ====================

  router.get(
    '/debug/db',
    adminRequired(PERMISSIONS.SYSTEM_SETTINGS),
    async (req, res) => {
      await db.read();
      res.json({
        users: db.data.users,
        videos: db.data.videos,
        comments: db.data.comments,
        classmates: db.data.classmates,
        about: db.data.about,
      });
    }
  );

  return router;
};
