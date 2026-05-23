module.exports = function ({ db, optionalAuth, authRequired, commentLimiter, guestApiLimiter, PERMISSIONS, hasPermission }) {
  const router = require('express').Router();

  /**
   * @openapi
   * /api/videos/{id}/comments:
   *   get:
   *     summary: 获取视频评论列表
   *     tags: [评论]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 视频ID
   *     responses:
   *       200:
   *         description: 评论列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Comment'
   */
  router.get('/videos/:id/comments', optionalAuth, guestApiLimiter, async (req, res) => {
    await db.read();
    const comments = db.data.comments
      .filter(c => c.videoId === parseInt(req.params.id))
      .map(c => {
        const user = db.data.users.find(u => u.id === c.userId);
        return { ...c, username: user ? user.username : 'Unknown' };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(comments);
  });

  /**
   * @openapi
   * /api/videos/{id}/comments:
   *   post:
   *     summary: 发表评论
   *     description: 对视频发表评论（需要登录）
   *     tags: [评论]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 视频ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [content]
   *             properties:
   *               content:
   *                 type: string
   *                 description: 评论内容（最多500字符）
   *                 example: 这个视频拍得真好！
   *     responses:
   *       200:
   *         description: 评论成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Comment'
   *       400:
   *         description: 评论内容为空或超长
   *       404:
   *         description: 视频不存在
   */
  router.post('/videos/:id/comments', authRequired, commentLimiter, async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '评论不能超过500字符' });
    }

    await db.read();
    const video = db.data.videos.find(v => v.id === parseInt(req.params.id));

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const newComment = {
      id: Date.now(),
      videoId: parseInt(req.params.id),
      userId: req.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    db.data.comments.push(newComment);
    await db.write();

    const user = db.data.users.find(u => u.id === req.user.id);
    res.json({ ...newComment, username: user ? user.username : 'Unknown' });
  });

  /**
   * @openapi
   * /api/videos/{id}/like:
   *   post:
   *     summary: 点赞视频
   *     description: 给视频点赞（需要登录）
   *     tags: [点赞]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 视频ID
   *     responses:
   *       200:
   *         description: 点赞成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 likes:
   *                   type: integer
   *                   description: 当前点赞数
   *       404:
   *         description: 视频不存在
   */
  router.post('/videos/:id/like', authRequired, async (req, res) => {
    await db.read();
    const videoIndex = db.data.videos.findIndex(v => v.id === parseInt(req.params.id));
    if (videoIndex === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }

    db.data.videos[videoIndex].likes = (db.data.videos[videoIndex].likes || 0) + 1;
    await db.write();

    res.json({ likes: db.data.videos[videoIndex].likes });
  });

  router.delete('/comments/:id', authRequired, async (req, res) => {
    await db.read();
    const commentIndex = db.data.comments.findIndex(c => c.id === parseInt(req.params.id));

    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = db.data.comments[commentIndex];

    if (comment.userId !== req.user.id && !hasPermission(req.user, PERMISSIONS.COMMENT_DELETE)) {
      return res.sendStatus(403);
    }

    db.data.comments.splice(commentIndex, 1);
    await db.write();

    res.json({ message: 'Comment deleted successfully' });
  });

  return router;
};
