module.exports = function ({
  db,
  upload,
  optionalAuth,
  authRequired,
  adminRequired,
  guestApiLimiter,
  PERMISSIONS,
}) {
  const router = require('express').Router();

  /**
   * @openapi
   * /api/classmates:
   *   get:
   *     summary: 获取同学录列表
   *     description: 获取所有同学信息，支持搜索、排序
   *     tags: [同学录]
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 搜索关键词（按姓名、性格、简介、联系方式搜索）
   *       - in: query
   *         name: graduationYear
   *         schema:
   *           type: string
   *         description: 毕业年份筛选
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, graduationYear, newest]
   *         description: 排序方式
   *     responses:
   *       200:
   *         description: 同学录列表
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 classmates:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Classmate'
   *                 total:
   *                   type: integer
   *                   description: 总数
   *                 allGraduationYears:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: 所有毕业年份
   */
  router.get('/classmates', optionalAuth, guestApiLimiter, async (req, res) => {
    try {
      await db.read();
      let classmates = db.data.classmates || [];

      const { search, graduationYear, sortBy } = req.query;

      if (search) {
        const searchLower = search.toLowerCase();
        classmates = classmates.filter(
          c =>
            c.name.toLowerCase().includes(searchLower) ||
            (c.personality && c.personality.toLowerCase().includes(searchLower)) ||
            (c.description && c.description.toLowerCase().includes(searchLower)) ||
            (c.contact && c.contact.toLowerCase().includes(searchLower))
        );
      }

      if (graduationYear) {
        classmates = classmates.filter(c => c.graduationYear === graduationYear);
      }

      if (sortBy === 'name') {
        classmates.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      } else if (sortBy === 'graduationYear') {
        classmates.sort((a, b) =>
          (b.graduationYear || '').localeCompare(a.graduationYear || '', 'zh-CN')
        );
      } else if (sortBy === 'newest') {
        classmates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else {
        classmates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      res.json({
        classmates,
        total: classmates.length,
        allGraduationYears: [
          ...new Set(classmates.map(c => c.graduationYear).filter(Boolean)),
        ],
      });
    } catch (error) {
      console.error('获取同学录失败:', error);
      res.status(500).json({ error: '获取同学录失败' });
    }
  });

  router.get(
    '/classmates/stats',
    optionalAuth,
    guestApiLimiter,
    async (req, res) => {
      try {
        await db.read();
        const classmates = db.data.classmates || [];

        const graduationYears = {};
        classmates.forEach(c => {
          const year = c.graduationYear || '未指定';
          graduationYears[year] = (graduationYears[year] || 0) + 1;
        });

        res.json({
          total: classmates.length,
          withPhoto: classmates.filter(c => c.photo).length,
          graduationYears,
          recentCount: classmates.filter(c => {
            const created = new Date(c.created_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return created > weekAgo;
          }).length,
        });
      } catch (error) {
        console.error('获取同学录统计失败:', error);
        res.status(500).json({ error: '获取统计失败' });
      }
    }
  );

  router.post(
    '/admin/classmates',
    adminRequired(PERMISSIONS.CLASSMATES_MANAGE),
    upload.single('photo'),
    async (req, res) => {
      try {
        const { name, graduationYear, personality, contact, description, existingPhoto } =
          req.body;

        if (!name) {
          return res.status(400).json({ error: '姓名不能为空' });
        }

        if (name.length > 50) {
          return res.status(400).json({ error: '姓名不能超过50个字符' });
        }

        if (description && description.length > 500) {
          return res.status(400).json({ error: '个人简介不能超过500个字符' });
        }

        await db.read();

        const existingClassmate = db.data.classmates.find(
          c => c.name === name.trim()
        );
        if (existingClassmate) {
          return res.status(400).json({ error: '该同学姓名已存在' });
        }

        let photoFilename = existingPhoto || '';
        if (req.file) {
          photoFilename = req.file.filename;
        }

        const newClassmate = {
          id: Date.now(),
          name: name.trim(),
          graduationYear: graduationYear || '',
          personality: personality || '',
          contact: contact || '',
          photo: photoFilename,
          description: description || '',
          created_at: new Date().toISOString(),
        };

        db.data.classmates.push(newClassmate);
        await db.write();

        console.log(
          `[CLASSMATES] 添加同学: ${newClassmate.name}, ID: ${newClassmate.id}`
        );
        res.json({ message: '同学录添加成功', classmate: newClassmate });
      } catch (error) {
        console.error('添加同学录失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  router.put(
    '/admin/classmates/:id',
    adminRequired(PERMISSIONS.CLASSMATES_MANAGE),
    upload.single('photo'),
    async (req, res) => {
      try {
        const { name, graduationYear, personality, contact, description, existingPhoto } =
          req.body;
        const classmateId = parseInt(req.params.id);

        if (!name) {
          return res.status(400).json({ error: '姓名不能为空' });
        }

        if (name.length > 50) {
          return res.status(400).json({ error: '姓名不能超过50个字符' });
        }

        if (description && description.length > 500) {
          return res.status(400).json({ error: '个人简介不能超过500个字符' });
        }

        await db.read();
        const classmateIndex = db.data.classmates.findIndex(
          c => c.id === classmateId
        );

        if (classmateIndex === -1) {
          return res.status(404).json({ error: '同学录不存在' });
        }

        const existingClassmate = db.data.classmates.find(
          c => c.name === name.trim() && c.id !== classmateId
        );
        if (existingClassmate) {
          return res.status(400).json({ error: '该同学姓名已存在' });
        }

        db.data.classmates[classmateIndex].name = name.trim();
        db.data.classmates[classmateIndex].graduationYear = graduationYear || '';
        db.data.classmates[classmateIndex].personality = personality || '';
        db.data.classmates[classmateIndex].contact = contact || '';
        db.data.classmates[classmateIndex].description = description || '';

        if (req.file) {
          db.data.classmates[classmateIndex].photo = req.file.filename;
        } else if (existingPhoto !== undefined) {
          db.data.classmates[classmateIndex].photo = existingPhoto;
        }

        await db.write();

        console.log(
          `[CLASSMATES] 更新同学: ${db.data.classmates[classmateIndex].name}, ID: ${classmateId}`
        );
        res.json({
          message: '同学录更新成功',
          classmate: db.data.classmates[classmateIndex],
        });
      } catch (error) {
        console.error('更新同学录失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  router.delete(
    '/admin/classmates/:id',
    adminRequired(PERMISSIONS.CLASSMATES_MANAGE),
    async (req, res) => {
      try {
        const classmateId = parseInt(req.params.id);

        await db.read();
        const classmateIndex = db.data.classmates.findIndex(
          c => c.id === classmateId
        );

        if (classmateIndex === -1) {
          return res.status(404).json({ error: '同学录不存在' });
        }

        const deletedClassmate = db.data.classmates[classmateIndex];
        db.data.classmates.splice(classmateIndex, 1);
        await db.write();

        console.log(
          `[CLASSMATES] 删除同学: ${deletedClassmate.name}, ID: ${classmateId}`
        );
        res.json({ message: '同学录删除成功', deletedId: classmateId });
      } catch (error) {
        console.error('删除同学录失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  router.post(
    '/admin/classmates/batch-delete',
    adminRequired(PERMISSIONS.CLASSMATES_MANAGE),
    async (req, res) => {
      try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: '请选择要删除的同学' });
        }

        await db.read();
        const idsToDelete = ids.map(id => parseInt(id));

        const initialCount = db.data.classmates.length;
        db.data.classmates = db.data.classmates.filter(
          c => !idsToDelete.includes(c.id)
        );
        const deletedCount = initialCount - db.data.classmates.length;

        await db.write();

        console.log(`[CLASSMATES] 批量删除: ${deletedCount}条记录`);
        res.json({
          message: `成功删除${deletedCount}条同学录`,
          deletedCount,
        });
      } catch (error) {
        console.error('批量删除同学录失败:', error);
        res.status(500).json({ error: '操作失败' });
      }
    }
  );

  return router;
};
