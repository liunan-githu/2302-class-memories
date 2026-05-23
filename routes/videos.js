const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const {
  getVideoInfo,
  transcodeAllQualities,
  getAvailableQualities,
  getActiveTranscodes,
  getRecentTranscodes,
} = require('../transcoding');

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
  const uploadsDir = path.join(__dirname, '..', 'uploads');

  /**
   * @openapi
   * /api/upload:
   *   post:
   *     summary: 上传视频
   *     description: 上传视频文件（需要登录），自动触发转码
   *     tags: [视频]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [video, title]
   *             properties:
   *               video:
   *                 type: string
   *                 format: binary
   *                 description: 视频文件
   *               cover:
   *                 type: string
   *                 format: binary
   *                 description: 封面图片（可选）
   *               title:
   *                 type: string
   *                 description: 视频标题
   *                 example: 班级回忆
   *               description:
   *                 type: string
   *                 description: 视频描述
   *               category:
   *                 type: string
   *                 description: 分类
   *               tags:
   *                 type: string
   *                 description: 标签（逗号分隔）
   *               privacy:
   *                 type: string
   *                 enum: [public, private]
   *                 default: public
   *               allowComments:
   *                 type: string
   *                 enum: [true, false]
   *                 default: true
   *     responses:
   *       200:
   *         description: 上传成功，等待审核
   *       400:
   *         description: 请求参数错误
   *       403:
   *         description: 上传已被禁用
   */
  router.post(
    '/upload',
    authRequired,
    uploadLimiter,
    upload.fields([{ name: 'video' }, { name: 'cover' }]),
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

        const { title, description, category, tags, privacy, allowComments } = req.body;
        const filename = req.files.video[0].filename;
        const coverFilename = req.files.cover ? req.files.cover[0].filename : null;

        const newVideo = {
          id: Date.now(),
          title,
          description,
          category: category || '未分类',
          tags: tags || '',
          privacy: privacy || 'public',
          allowComments: allowComments === 'true',
          filename,
          coverFilename,
          uploader_id: req.user.id,
          status: 'pending',
          views: 0,
          likes: 0,
          duration: Math.floor(Math.random() * 300) + 60,
          created_at: new Date().toISOString(),
        };

        await db.read();
        db.data.videos.push(newVideo);
        await db.write();

        let videoInfo = null;
        try {
          const videoPath = path.join(__dirname, '..', 'uploads', filename);
          videoInfo = await getVideoInfo(videoPath);
        } catch (infoErr) {
          console.warn('Read video info failed:', infoErr.message);
        }

        res.json({
          message: 'Video uploaded successfully, waiting for review',
          video: newVideo,
          videoInfo,
        });

        if (!videoInfo || videoInfo.height > 360) {
          const videoDir = path.join(__dirname, '..', 'uploads');
          const videoPath = path.join(videoDir, filename);

          db.read().then(() => {
            const idx = db.data.videos.findIndex(v => v.id === newVideo.id);
            if (idx !== -1) {
              db.data.videos[idx].transcodeStartedAt = new Date().toISOString();
              return db.write();
            }
          }).catch(e => {
            console.error('Save transcode start time failed:', e.message);
          });

          transcodeAllQualities(videoPath, videoDir, newVideo.id, null, { title: newVideo.title })
            .then(async ({ results }) => {
              try {
                await db.read();
                const idx = db.data.videos.findIndex(v => v.id === newVideo.id);
                if (idx !== -1) {
                  db.data.videos[idx].qualities = getAvailableQualities(
                    newVideo.id,
                    videoDir,
                    filename
                  );
                  db.data.videos[idx].transcodeCompletedAt = new Date().toISOString();
                  await db.write();
                }
              } catch (e) {
                console.error('Auto-transcode DB update failed:', e.message);
              }
            })
            .catch(err => {
              console.error('Auto-transcode failed:', err.message);
            });
        }
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
      }
    }
  );

  /**
   * @openapi
   * /api/videos:
   *   get:
   *     summary: 获取视频列表（公开）
   *     description: 获取所有已审核通过的视频列表，按时间倒序
   *     tags: [视频]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: 页码
   *     responses:
   *       200:
   *         description: 视频列表
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Video'
   */
  router.get('/videos', optionalAuth, guestApiLimiter, async (req, res) => {
    await db.read();
    const videos = db.data.videos
      .filter(v => v.status === 'approved')
      .map(v => {
        const user = db.data.users.find(u => u.id === v.uploader_id);
        return {
          ...v,
          username: user ? user.username : 'Unknown',
          uploaderUsername: user ? user.username : 'Unknown',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(videos);
  });

  router.get('/videos/pending', adminRequired(PERMISSIONS.VIDEO_AUDIT), async (req, res) => {
    await db.read();
    const videos = db.data.videos
      .filter(v => v.status === 'pending')
      .map(v => {
        const user = db.data.users.find(u => u.id === v.uploader_id);
        return {
          ...v,
          username: user ? user.username : 'Unknown',
          uploaderUsername: user ? user.username : 'Unknown',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(videos);
  });

  router.get('/admin/videos', adminRequired(PERMISSIONS.VIDEO_MANAGE), async (req, res) => {
    await db.read();
    const videos = db.data.videos
      .map(v => {
        const user = db.data.users.find(u => u.id === v.uploader_id);
        return {
          ...v,
          username: user ? user.username : 'Unknown',
          uploaderUsername: user ? user.username : 'Unknown',
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(videos);
  });

  router.get('/video-cover/:id', optionalAuth, guestApiLimiter, async (req, res) => {
    try {
      await db.read();
      const video = db.data.videos.find(v => v.id === parseInt(req.params.id));
      if (!video) return res.status(404).json({ error: 'Video not found' });

      if (video.coverFilename) {
        const coverPath = path.join(__dirname, '..', 'uploads', video.coverFilename);
        if (fs.existsSync(coverPath)) return res.sendFile(coverPath);
      }

      const autoCoverFilename = `${video.id}_cover.jpg`;
      const autoCoverPath = path.join(__dirname, '..', 'uploads', autoCoverFilename);
      if (fs.existsSync(autoCoverPath)) return res.sendFile(autoCoverPath);

      const videoPath = path.join(__dirname, '..', 'uploads', video.filename);
      if (!fs.existsSync(videoPath))
        return res.status(404).json({ error: 'Video file not found' });

      const tempPath = path.join(__dirname, '..', 'uploads', `_temp_cover_${video.id}.jpg`);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(2)
          .frames(1)
          .outputOptions(['-vframes', '1', '-q:v', '3'])
          .output(tempPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      fs.renameSync(tempPath, autoCoverPath);

      video.coverFilename = autoCoverFilename;
      await db.write();

      res.sendFile(autoCoverPath);
    } catch (err) {
      console.error('Generate video cover failed:', err.message);
      res.status(500).json({ error: 'Cover generation failed' });
    }
  });

  /**
   * @openapi
   * /api/videos/{id}:
   *   get:
   *     summary: 获取视频详情
   *     description: 获取单个视频的详细信息，访问时会增加播放次数
   *     tags: [视频]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: 视频ID
   *     responses:
   *       200:
   *         description: 视频详情
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Video'
   *       404:
   *         description: 视频不存在
   */
  router.get('/videos/:id', optionalAuth, guestApiLimiter, async (req, res) => {
    await db.read();
    const videoIndex = db.data.videos.findIndex(v => v.id === parseInt(req.params.id));
    if (videoIndex === -1) {
      res.status(404).json({ error: 'Video not found' });
    } else {
      db.data.videos[videoIndex].views = (db.data.videos[videoIndex].views || 0) + 1;
      await db.write();

      const video = db.data.videos[videoIndex];
      const user = db.data.users.find(u => u.id === video.uploader_id);
      res.json({ ...video, username: user ? user.username : 'Unknown' });
    }
  });

  router.delete('/videos/:id', adminRequired(PERMISSIONS.VIDEO_DELETE), async (req, res) => {
    await db.read();
    const videoIndex = db.data.videos.findIndex(v => v.id === parseInt(req.params.id));

    if (videoIndex === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = db.data.videos[videoIndex];

    if (video.filename) {
      const videoPath = path.join(__dirname, '..', 'uploads', video.filename);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    if (video.coverFilename) {
      const coverPath = path.join(__dirname, '..', 'uploads', video.coverFilename);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    const { QUALITY_PRESETS } = require('../transcoding');
    for (const quality of Object.keys(QUALITY_PRESETS)) {
      const qualityFile = path.join(__dirname, '..', 'uploads', `${video.id}_${quality}.mp4`);
      if (fs.existsSync(qualityFile)) {
        fs.unlinkSync(qualityFile);
      }
    }

    db.data.videos.splice(videoIndex, 1);
    await db.write();

    res.json({ message: 'Video deleted successfully' });
  });

  router.post('/videos/:id/approve', adminRequired(PERMISSIONS.VIDEO_AUDIT), async (req, res) => {
    await db.read();
    const video = db.data.videos.find(v => v.id === parseInt(req.params.id));

    if (video) {
      video.status = 'approved';
      await db.write();
      res.json({ message: 'Video approved' });
    } else {
      res.status(404).json({ error: 'Video not found' });
    }
  });

  router.post('/videos/:id/reject', adminRequired(PERMISSIONS.VIDEO_AUDIT), async (req, res) => {
    const { reason } = req.body;

    await db.read();
    const video = db.data.videos.find(v => v.id === parseInt(req.params.id));

    if (video) {
      video.status = 'rejected';
      video.rejectReason = reason || '';
      video.rejectedAt = new Date().toISOString();
      await db.write();
      res.json({ message: 'Video rejected' });
    } else {
      res.status(404).json({ error: 'Video not found' });
    }
  });

  router.get('/videos/:id/qualities', optionalAuth, guestApiLimiter, async (req, res) => {
    try {
      await db.read();
      const video = db.data.videos.find(v => v.id === parseInt(req.params.id));
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }
      const qualities = getAvailableQualities(video.id, uploadsDir, video.filename);
      res.json({ qualities });
    } catch (error) {
      console.error('Get video qualities failed:', error);
      res.status(500).json({ error: '获取画质信息失败' });
    }
  });

  router.post('/videos/:id/transcode', adminRequired(PERMISSIONS.VIDEO_MANAGE), async (req, res) => {
    try {
      await db.read();
      const videoIndex = db.data.videos.findIndex(v => v.id === parseInt(req.params.id));
      if (videoIndex === -1) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const video = db.data.videos[videoIndex];
      const inputPath = path.join(uploadsDir, video.filename);

      if (!fs.existsSync(inputPath)) {
        return res.status(400).json({ error: '源视频文件不存在' });
      }

      const { results } = await transcodeAllQualities(
        inputPath,
        uploadsDir,
        video.id,
        null,
        { title: video.title }
      );
      const qualities = getAvailableQualities(video.id, uploadsDir, video.filename);

      db.data.videos[videoIndex].qualities = qualities;
      await db.write();

      res.json({ message: '转码完成', results, qualities });
    } catch (error) {
      console.error('Transcode failed:', error);
      res.status(500).json({ error: '转码失败' });
    }
  });

  router.get(
    '/admin/transcode/status',
    adminRequired(PERMISSIONS.VIDEO_MANAGE),
    (req, res) => {
      try {
        const now = Date.now();
        const active = getActiveTranscodes().map(task => ({
          ...task,
          currentQuality: task.currentQuality || null,
          qualities: task.qualities || {},
          elapsed: task.startedAt
            ? Math.floor((now - new Date(task.startedAt).getTime()) / 1000)
            : 0,
        }));
        const recent = getRecentTranscodes().map(task => ({
          ...task,
          duration:
            task.startedAt && task.finishedAt
              ? Math.floor(
                  (new Date(task.finishedAt).getTime() -
                    new Date(task.startedAt).getTime()) /
                    1000
                )
              : 0,
        }));
        res.json({ active, recent });
      } catch (error) {
        console.error('Get transcode status failed:', error);
        res.status(500).json({ error: '获取转码状态失败' });
      }
    }
  );

  router.get('/user/transcode/status', authRequired, async (req, res) => {
    try {
      const now = Date.now();
      const active = getActiveTranscodes().map(task => ({
        ...task,
        currentQuality: task.currentQuality || null,
        qualities: task.qualities || {},
        elapsed: task.startedAt
          ? Math.floor((now - new Date(task.startedAt).getTime()) / 1000)
          : 0,
      }));
      const recent = getRecentTranscodes().map(task => ({
        ...task,
        duration:
          task.startedAt && task.finishedAt
            ? Math.floor(
                (new Date(task.finishedAt).getTime() -
                  new Date(task.startedAt).getTime()) /
                  1000
              )
            : 0,
      }));
      res.json({ active, recent });
    } catch (error) {
      console.error('Get user transcode status failed:', error);
      res.status(500).json({ error: '获取转码状态失败' });
    }
  });

  router.get('/user/videos', authRequired, async (req, res) => {
    await db.read();
    const videos = db.data.videos
      .filter(v => v.uploader_id === req.user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(videos);
  });

  return router;
};
