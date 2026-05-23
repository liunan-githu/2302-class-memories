module.exports = function ({ db, optionalAuth, authRequired, adminRequired, guestApiLimiter, PERMISSIONS }) {
  const router = require('express').Router();

  /**
   * @openapi
   * /api/about:
   *   get:
   *     summary: 获取关于页面信息
   *     tags: [关于]
   *     responses:
   *       200:
   *         description: 关于页面信息
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 creatorName:
   *                   type: string
   *                 creatorRole:
   *                   type: string
   *                 projectDesc:
   *                   type: string
   *                 updated_at:
   *                   type: string
   *                   format: date-time
   */
  router.get('/about', optionalAuth, guestApiLimiter, async (req, res) => {
    await db.read();
    res.json(db.data.about || null);
  });

  router.put('/admin/about', adminRequired(PERMISSIONS.ABOUT_MANAGE), async (req, res) => {
    try {
      const { creatorName, creatorRole, projectDesc, projectDesc2, thanks, thanks2 } = req.body;

      await db.read();

      db.data.about = {
        creatorName: creatorName || '2302班技术团队',
        creatorRole: creatorRole || '网站开发 & 设计',
        projectDesc: projectDesc || '',
        projectDesc2: projectDesc2 || '',
        thanks: thanks || '',
        thanks2: thanks2 || '',
        updated_at: new Date().toISOString()
      };

      await db.write();
      res.json({ message: '关于页面更新成功', about: db.data.about });
    } catch (error) {
      console.error('更新关于页面失败:', error);
      res.status(500).json({ error: '操作失败' });
    }
  });

  return router;
};
