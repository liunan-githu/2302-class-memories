const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { getDb, initDatabase } = require('./database');
const {
  PERMISSIONS,
  initAuditLog,
  addAuditLog,
  getAuditLogs,
  getAllPermissions,
  getAllRoles,
  getPermissionGroups,
  getPermissionDescription,
  hasPermission,
} = require('./permissions');
const {
  guestApiLimiter,
  loginLimiter,
  registerLimiter,
  uploadLimiter,
  commentLimiter,
  optionalAuth,
  authRequired,
  adminRequired,
  securityHeaders,
  requestLogger,
} = require('./middleware/api-access-control');

let db = null;

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置，请检查 .env 文件');
  process.exit(1);
}
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

async function startServer() {
  db = await initDatabase();
  app.set('db', db);
  initAuditLog(db);

  // ==================== 中间件 ====================
  app.use(cors({ exposedHeaders: ['X-Refresh-Token'] }));
  app.use(express.json());
  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(express.static('public'));

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
  }

  // ==================== Swagger API 文档 ====================
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: '2302班回忆录 API 文档',
        version: '1.0.0',
        description: `
### 项目简介
2302班回忆录 - 一个班级视频/照片分享网站的后端 API 接口。

### 认证方式
大多数接口需要在请求头中携带 JWT Token：
\`Authorization: Bearer <your-token>\`

### 权限说明
- **访客 (Guest)**: 无需登录，可浏览公开内容
- **普通用户 (User)**: 登录后可上传、评论、点赞
- **版主 (Moderator)**: 可审核内容、管理评论
- **管理员 (Admin)**: 可管理用户、管理所有内容
- **超级管理员 (SuperAdmin)**: 拥有所有权限

> ⚠️ 管理后台接口需要相应权限才能访问
        `,
        contact: {
          name: '2302班技术团队',
        },
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: '本地开发服务器',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: '登录后获取的 JWT Token',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', description: '错误信息' },
              code: { type: 'string', description: '错误代码' },
            },
          },
          Video: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: '视频ID' },
              title: { type: 'string', description: '视频标题' },
              description: { type: 'string', description: '视频描述' },
              category: { type: 'string', description: '分类' },
              tags: { type: 'string', description: '标签' },
              filename: { type: 'string', description: '文件名称' },
              coverFilename: { type: 'string', description: '封面图文件' },
              uploader_id: { type: 'integer', description: '上传者ID' },
              username: { type: 'string', description: '上传者用户名' },
              status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: '审核状态' },
              views: { type: 'integer', description: '播放次数' },
              likes: { type: 'integer', description: '点赞数' },
              duration: { type: 'integer', description: '时长(秒)' },
              created_at: { type: 'string', format: 'date-time', description: '创建时间' },
            },
          },
          PhotoBatch: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '批次ID' },
              title: { type: 'string', description: '相册标题' },
              description: { type: 'string', description: '相册描述' },
              uploader_id: { type: 'integer', description: '上传者ID' },
              username: { type: 'string', description: '上传者用户名' },
              status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: '审核状态' },
              photoCount: { type: 'integer', description: '照片数量' },
              created_at: { type: 'string', format: 'date-time', description: '创建时间' },
            },
          },
          Comment: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: '评论ID' },
              videoId: { type: 'integer', description: '关联视频ID' },
              userId: { type: 'integer', description: '评论者ID' },
              username: { type: 'string', description: '评论者用户名' },
              content: { type: 'string', description: '评论内容' },
              createdAt: { type: 'string', format: 'date-time', description: '评论时间' },
            },
          },
          Classmate: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: '同学ID' },
              name: { type: 'string', description: '姓名' },
              graduationYear: { type: 'string', description: '毕业年份' },
              personality: { type: 'string', description: '性格特点' },
              contact: { type: 'string', description: '联系方式' },
              photo: { type: 'string', description: '照片文件名' },
              description: { type: 'string', description: '个人简介' },
              created_at: { type: 'string', format: 'date-time', description: '创建时间' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: '用户ID' },
              username: { type: 'string', description: '用户名' },
              role: { type: 'string', enum: ['user', 'admin', 'superadmin'], description: '角色' },
              isBanned: { type: 'boolean', description: '是否封禁' },
              isSuperAdmin: { type: 'boolean', description: '是否超级管理员' },
              created_at: { type: 'string', format: 'date-time', description: '注册时间' },
            },
          },
          LoginResponse: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'JWT Token' },
              user: { '$ref': '#/components/schemas/User' },
            },
          },
        },
      },
      tags: [
        { name: '认证', description: '用户注册与登录' },
        { name: '视频', description: '视频上传、播放、管理' },
        { name: '照片', description: '照片上传、浏览、管理' },
        { name: '评论', description: '视频评论' },
        { name: '点赞', description: '视频点赞' },
        { name: '用户', description: '用户信息与状态' },
        { name: '管理-用户', description: '管理员用户管理接口' },
        { name: '管理-视频', description: '管理员视频管理接口' },
        { name: '管理-照片', description: '管理员照片管理接口' },
        { name: '管理-权限', description: '权限与审计日志' },
        { name: '同学录', description: '同学录信息' },
        { name: '关于', description: '关于页面' },
        { name: '系统', description: '系统管理接口' },
      ],
    },
    apis: ['./routes/*.js', './server.js'],
  });

  app.use('/api-docs', swaggerUi.serveFiles(swaggerSpec), (req, res) => {
    const apiDocsHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>2302班回忆录 - API 文档</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css">
      <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { font-size: 28px; }
        .swagger-ui .info { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
      <script>
        (function() {
          var token = null;
          try {
            token = localStorage.getItem('token');
            if (!token || token === 'undefined' || token === 'null') token = null;
          } catch(e) {}

          var ui = SwaggerUIBundle({
            spec: ${JSON.stringify(swaggerSpec)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis
            ],
            requestInterceptor: function(req) {
              if (token && req.url.indexOf('/api/') !== -1) {
                req.headers['Authorization'] = 'Bearer ' + token;
              }
              return req;
            }
          });

          if (token) {
            ui.authActions.authorize({
              bearerAuth: {
                name: 'bearerAuth',
                schema: {
                  type: 'http',
                  scheme: 'bearer',
                  bearerFormat: 'JWT'
                },
                value: token
              }
            });
          }
        })();
      </script>
    </body>
    </html>
    `;
    res.send(apiDocsHtml);
  });

  // ==================== 依赖注入 ====================
  const routeDeps = {
    db,
    JWT_SECRET,
    upload,
    optionalAuth,
    authRequired,
    adminRequired,
    guestApiLimiter,
    loginLimiter,
    registerLimiter,
    uploadLimiter,
    commentLimiter,
    PERMISSIONS,
    hasPermission,
    addAuditLog,
    getAuditLogs,
    getAllPermissions,
    getAllRoles,
    getPermissionGroups,
    getPermissionDescription,
  };

  // ==================== 挂载路由模块 ====================
  app.use('/api', require('./routes/auth')(routeDeps));
  app.use('/api', require('./routes/videos')(routeDeps));
  app.use('/api', require('./routes/photos')(routeDeps));
  app.use('/api', require('./routes/comments')(routeDeps));
  app.use('/api', require('./routes/admin')(routeDeps));
  app.use('/api', require('./routes/classmates')(routeDeps));
  app.use('/api', require('./routes/about')(routeDeps));

  // ==================== 静态文件路由 ====================
  const MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.m4v': 'video/mp4',
    '.3gp': 'video/3gpp',
    '.ts': 'video/mp2t',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
  };

  app.get('/uploads/:filename', (req, res) => {
    const filePath = path.join(UPLOADS_DIR, req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : Math.min(start + 10 * 1024 * 1024, fileSize - 1);

      if (start >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });

      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  });

  // ==================== SPA 页面路由 ====================
  const sendIndex = (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

  app.get('/video/:id', sendIndex);
  app.get('/admin', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'admin.html'))
  );
  app.get('/upload', sendIndex);
  app.get('/upload/video', sendIndex);
  app.get('/upload/status', sendIndex);
  app.get('/upload/photos', sendIndex);
  app.get('/classmates', sendIndex);
  app.get('/about', sendIndex);
  app.get('/login', sendIndex);
  app.get('/register', sendIndex);

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      sendIndex(req, res);
    }
  });

  // ==================== 创建默认管理员 ====================
  await createAdminUser();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 服务器启动成功！`);
    console.log(`📍 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 外网访问: http://<你的公网IP>:${PORT}`);
    console.log(`\n⚠️  请确保防火墙已开放 ${PORT} 端口\n`);
  });
}

async function createAdminUser() {
  const adminUsername = 'admin';
  const adminPassword = 'admin123';

  if (!db) {
    console.error('Database not initialized');
    return;
  }

  await db.read();
  const existingAdmin = db.data.users.find(u => u.username === adminUsername);

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = {
      id: Date.now(),
      username: adminUsername,
      password: hashedPassword,
      role: 'superadmin',
      isSuperAdmin: true,
      permissions: Object.values(PERMISSIONS),
      created_at: new Date().toISOString(),
    };
    db.data.users.push(adminUser);
    await db.write();
    console.log('Super admin user created: username=admin, password=admin123');
  } else {
    const needsUpdate =
      existingAdmin.role !== 'superadmin' || !existingAdmin.isSuperAdmin;

    if (needsUpdate) {
      existingAdmin.role = 'superadmin';
      existingAdmin.isSuperAdmin = true;
      existingAdmin.permissions = Object.values(PERMISSIONS);
      await db.write();
      console.log('Existing admin upgraded to superadmin');
    }
  }
}

startServer();
