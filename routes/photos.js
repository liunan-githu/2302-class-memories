const path = require('path');
const fs = require('fs');

module.exports = function ({
  db,
  upload,
  optionalAuth,
  authRequired,
  adminRequired,
  guestApiLimiter,
  uploadLimiter,
  PERMISSIONS,
}) {
  const router = require('express').Router();

  /**
   * @openapi
   * /api/photos/batch:
   *   post:
   *     summary: 批量上传照片
   *     description: 批量上传照片（需要登录），最多50张
   *     tags: [照片]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [photos]
   *             properties:
   *               photos:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: 照片文件（最多50张）
   *               title:
   *                 type: string
   *                 description: 相册标题
   *               description:
   *                 type: string
   *                 description: 相册描述
   *               category:
   *                 type: string
   *                 description: 分类
   *               tags:
   *                 type: string
   *                 description: 标签
   *     responses:
   *       200:
   *         description: 上传成功，等待审核
   *       400:
   *         description: 请求参数错误
   *       403:
   *         description: 上传已被禁用
   */
  router.post(
    '/photos/batch',
    authRequired,
    uploadLimiter,
    upload.array('photos', 50),
    async (req, res) => {
      try {
        await db.read();
        const user = db.data.users.find(u => u.id === req.user.id);
        if (user && user.uploadDisabled) {
          return res.status(403).json({
            error: '上传已禁用',
            reason: user.uploadDisableReason || '您的上传功能已被禁用',
            uploadDisabled: true,
          });
        }

        const { title, description, category, tags } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
          return res.status(400).json({ error: '请选择至少一张图片' });
        }

        const batchId =
          Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        const photoBatch = {
          id: batchId,
          title: title || '未命名相册',
          description: description || '',
          category: category || '未分类',
          tags: tags || '',
          uploader_id: req.user.id,
          status: 'pending',
          created_at: new Date().toISOString(),
          photos: files.map((file, index) => ({
            id: Date.now() + index,
            filename: file.filename,
            originalName: file.originalname,
            order: index,
          })),
        };

        if (!db.data.photoBatches) {
          db.data.photoBatches = [];
        }
        db.data.photoBatches.push(photoBatch);
        await db.write();

        res.json({
          message: `成功上传 ${files.length} 张图片，等待审核`,
          batchId: batchId,
          count: files.length,
        });
      } catch (error) {
        console.error('图片上传失败:', error);
        res.status(500).json({ error: '上传失败' });
      }
    }
  );

  /**
   * @openapi
   * /api/photos:
   *   get:
   *     summary: 获取公开照片列表
   *     description: 获取所有已审核通过的照片批次
   *     tags: [照片]
   *     responses:
   *       200:
   *         description: 照片批次列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/PhotoBatch'
   */
  router.get('/photos', optionalAuth, guestApiLimiter, async (req, res) => {
    await db.read();
    const batches = (db.data.photoBatches || [])
      .filter(b => b.status === 'approved')
      .map(b => {
        const user = db.data.users.find(u => u.id === b.uploader_id);
        return {
          ...b,
          username: user ? user.username : 'Unknown',
          photoCount: b.photos.length,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(batches);
  });

  router.get('/photos/pending', adminRequired(PERMISSIONS.PHOTO_MANAGE), async (req, res) => {
    await db.read();
    const allBatches = db.data.photoBatches || [];
    const pendingBatches = allBatches
      .filter(b => b.status === 'pending')
      .map(b => {
        const user = db.data.users.find(u => u.id === b.uploader_id);
        return {
          ...b,
          username: user ? user.username : 'Unknown',
          photoCount: b.photos.length,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(
      `[DEBUG] /api/photos/pending - 总批次: ${allBatches.length}, 待审核: ${pendingBatches.length}`
    );
    res.json(pendingBatches);
  });

  router.get('/admin/photos', adminRequired(PERMISSIONS.PHOTO_MANAGE), async (req, res) => {
    await db.read();
    const batches = (db.data.photoBatches || [])
      .map(b => {
        const user = db.data.users.find(u => u.id === b.uploader_id);
        return {
          ...b,
          username: user ? user.username : 'Unknown',
          photoCount: b.photos.length,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(batches);
  });

  router.post(
    '/photos/:id/approve',
    adminRequired(PERMISSIONS.PHOTO_MANAGE),
    async (req, res) => {
      try {
        const batchId = req.params.id;
        console.log(`[DEBUG] 审核通过请求 - batchId: ${batchId}`);

        await db.read();
        const batch = (db.data.photoBatches || []).find(b => b.id === batchId);

        if (!batch) {
          return res
            .status(404)
            .json({ error: '相册不存在', code: 'BATCH_NOT_FOUND' });
        }

        if (batch.status === 'approved') {
          return res
            .status(400)
            .json({ error: '相册已经通过审核', code: 'ALREADY_APPROVED' });
        }

        const oldStatus = batch.status;
        batch.status = 'approved';
        await db.write();

        console.log(
          `[DEBUG] 相册审核通过 - batchId: ${batchId}, 旧状态: ${oldStatus}, 新状态: approved`
        );

        res.json({
          message: '相册已通过审核',
          batchId: batchId,
          status: 'approved',
        });
      } catch (error) {
        console.error('[ERROR] 审核通过失败:', error);
        res
          .status(500)
          .json({ error: '审核失败，请稍后重试', code: 'INTERNAL_ERROR' });
      }
    }
  );

  router.post(
    '/photos/:id/reject',
    adminRequired(PERMISSIONS.PHOTO_MANAGE),
    async (req, res) => {
      try {
        const batchId = req.params.id;
        const { reason } = req.body;
        console.log(`[DEBUG] 拒绝审核请求 - batchId: ${batchId}, reason: ${reason}`);

        await db.read();
        const batch = (db.data.photoBatches || []).find(b => b.id === batchId);

        if (!batch) {
          return res
            .status(404)
            .json({ error: '相册不存在', code: 'BATCH_NOT_FOUND' });
        }

        if (batch.status === 'rejected') {
          return res
            .status(400)
            .json({ error: '相册已经被拒绝', code: 'ALREADY_REJECTED' });
        }

        const oldStatus = batch.status;
        batch.status = 'rejected';
        batch.rejectReason = reason || '';
        batch.rejectedAt = new Date().toISOString();
        await db.write();

        console.log(
          `[DEBUG] 相册已拒绝 - batchId: ${batchId}, 旧状态: ${oldStatus}, 新状态: rejected`
        );

        res.json({
          message: '相册已被拒绝',
          batchId: batchId,
          status: 'rejected',
          reason: reason || '',
        });
      } catch (error) {
        console.error('[ERROR] 拒绝审核失败:', error);
        res
          .status(500)
          .json({ error: '拒绝失败，请稍后重试', code: 'INTERNAL_ERROR' });
      }
    }
  );

  router.get(
    '/admin/photos/:id',
    adminRequired(PERMISSIONS.PHOTO_MANAGE),
    async (req, res) => {
      try {
        const batchId = req.params.id;
        console.log(`[DEBUG] 管理员获取相册详情 - batchId: ${batchId}`);

        await db.read();
        const batch = (db.data.photoBatches || []).find(b => b.id === batchId);

        if (!batch) {
          return res
            .status(404)
            .json({ error: '相册不存在', code: 'BATCH_NOT_FOUND' });
        }

        const user = db.data.users.find(u => u.id === batch.uploader_id);
        const batchWithUser = {
          ...batch,
          username: user ? user.username : 'Unknown',
        };

        console.log(
          `[DEBUG] 返回相册详情 - batchId: ${batchId}, status: ${batch.status}`
        );
        res.json(batchWithUser);
      } catch (error) {
        console.error('[ERROR] 获取相册详情失败:', error);
        res
          .status(500)
          .json({ error: '获取相册详情失败', code: 'INTERNAL_ERROR' });
      }
    }
  );

  router.delete(
    '/photos/:id',
    adminRequired(PERMISSIONS.PHOTO_DELETE),
    async (req, res) => {
      try {
        const batchId = req.params.id;
        console.log(`[DEBUG] 删除请求 - batchId: ${batchId}`);

        await db.read();
        const batchIndex = (db.data.photoBatches || []).findIndex(
          b => b.id === batchId
        );

        if (batchIndex === -1) {
          return res
            .status(404)
            .json({ error: '相册不存在', code: 'BATCH_NOT_FOUND' });
        }

        const batch = db.data.photoBatches[batchIndex];
        let deletedFiles = 0;
        let failedFiles = 0;
        if (batch.photos && batch.photos.length > 0) {
          batch.photos.forEach(photo => {
            if (photo.filename) {
              const photoPath = path.join(__dirname, '..', 'uploads', photo.filename);
              try {
                if (fs.existsSync(photoPath)) {
                  fs.unlinkSync(photoPath);
                  deletedFiles++;
                }
              } catch (fileError) {
                failedFiles++;
                console.error(`[ERROR] 删除文件失败: ${photo.filename}`, fileError.message);
              }
            }
          });
        }

        db.data.photoBatches.splice(batchIndex, 1);
        await db.write();

        res.json({
          message: '相册已删除',
          batchId: batchId,
          deletedFiles: deletedFiles,
          failedFiles: failedFiles,
        });
      } catch (error) {
        console.error('[ERROR] 删除相册失败:', error);
        res
          .status(500)
          .json({ error: '删除失败，请稍后重试', code: 'INTERNAL_ERROR' });
      }
    }
  );

  router.get('/user/photos', authRequired, async (req, res) => {
    await db.read();
    const batches = (db.data.photoBatches || [])
      .filter(b => b.uploader_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(batches);
  });

  // 获取单个公开相册详情 — must be last /photos/:id route
  router.get('/photos/:id', optionalAuth, guestApiLimiter, async (req, res) => {
    await db.read();
    const batch = (db.data.photoBatches || []).find(b => b.id === req.params.id);

    if (!batch) {
      return res.status(404).json({ error: '相册不存在' });
    }

    if (batch.status !== 'approved') {
      return res.status(403).json({ error: '相册未通过审核' });
    }

    const user = db.data.users.find(u => u.id === batch.uploader_id);
    res.json({
      ...batch,
      username: user ? user.username : 'Unknown',
    });
  });

  return router;
};
