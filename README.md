# 2302班回忆录

一个专为班级打造的集体回忆共享平台，支持视频、照片的上传与浏览，配有完整的用户系统、权限管理和后台审核功能。

在线体验：[GitHub Pages](https://github.com/liunan-githu/2302-class-memories)

## 功能概览

### 前台功能
- 视频上传与在线播放（支持多清晰度转码：360p / 720p / 1080p）
- 照片批量上传与相册浏览
- 视频评论与点赞互动
- 同学录管理（记录班级成员信息）
- 关于页面（班级介绍，支持图文编辑）
- 用户注册 / 登录（JWT 认证）
- 游客模式（未登录可浏览，受限操作）
- PC + 移动端自适应

### 后台管理
- **视频审核** — 审核通过后方可公开展示
- **照片审核** — 审核通过后方可公开展示
- **评论管理** — 查看 / 删除违规评论
- **用户管理** — 审批注册用户、封禁 / 解封、角色分配
- **权限管理** — 细粒度权限控制（28 项独立权限）
- **同学录管理** — 编辑班级成员信息
- **关于编辑** — 修改关于页面内容
- **数据统计** — 视频数、照片数、用户数等统计面板
- **审计日志** — 记录管理员操作历史

### 角色体系

| 角色 | 权限 |
|------|------|
| **游客** | 仅浏览，不可上传和互动 |
| **普通用户** | 上传视频/照片、评论、点赞 |
| **管理员** | 可分配部分后台权限 |
| **超级管理员** | 拥有全部 28 项权限 |

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端框架** | Express.js (Node.js) |
| **前端框架** | React 18 + Vite |
| **UI 动效** | GSAP + Framer Motion |
| **数据库** | LowDB（JSON 文件存储） |
| **文件上传** | Multer |
| **视频转码** | FFmpeg（fluent-ffmpeg） |
| **认证** | JWT（jsonwebtoken） |
| **密码加密** | bcryptjs |
| **限流** | express-rate-limit |
| **API 文档** | Swagger（swagger-jsdoc） |

## 项目结构

```
├── server.js              # 服务入口，数据库初始化，自动创建管理员
├── database.js            # LowDB 数据库初始化与配置
├── permissions.js         # 28 项权限常量定义
├── transcoding.js         # 视频转码（360p/720p/1080p）
├── reset-password.js      # 独立密码重置脚本
│
├── routes/                # API 路由
│   ├── auth.js            # 注册 / 登录
│   ├── videos.js          # 视频 CRUD + 审核
│   ├── photos.js          # 照片 CRUD + 审核
│   ├── comments.js        # 评论 + 点赞
│   ├── classmates.js      # 同学录
│   ├── admin.js           # 用户 / 权限 / 统计管理
│   └── about.js           # 关于页面内容
│
├── middleware/             # 中间件
│   └── api-access-control.js  # 角色权限校验
│
├── public/                # 静态资源 + 传统前端页面
│   ├── index.html         # SPA 入口
│   ├── admin.html         # 后台管理入口
│   ├── app.js             # 前端主逻辑
│   └── player/            # 视频播放器组件
│
├── react-app/             # React 前端（Vite 构建）
│   └── src/
│       ├── pages/         # 11 个页面组件
│       ├── components/    # UI 组件 / 布局 / Admin 面板
│       ├── services/      # API 调用封装（8 个模块）
│       ├── hooks/         # 自定义 Hooks
│       ├── context/       # Auth / Theme 上下文
│       └── utils/         # 工具函数
│
└── android-app/           # Android WebView 壳应用
```

## 快速开始

### 环境要求

- Node.js 16+
- FFmpeg（视频转码需要）

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/liunan-githu/2302-class-memories.git
cd 2302-class-memories

# 安装依赖
npm install

# 启动服务（端口默认 3000）
npm start
```

访问 **http://localhost:3000**

### 构建前端（可选）

```bash
cd react-app
npm install
npm run build    # 输出到 ../public/assets/
```

## 默认管理员

首次启动时系统会自动创建超级管理员账号：

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

**部署后请立即修改默认密码。**

## API 概览

完整 API 文档见 [API文档.md](./API文档.md)，支持 Swagger 文档页面（`/api-docs`）。

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/register` | 用户注册 |
| 认证 | `POST /api/login` | 用户登录 |
| 视频 | `GET/POST /api/videos` | 视频列表 / 上传 |
| 视频 | `GET /api/videos/:id` | 视频详情 |
| 照片 | `GET/POST /api/photos` | 照片列表 / 上传 |
| 评论 | `GET/POST /api/comments` | 评论列表 / 发表 |
| 点赞 | `POST /api/videos/:id/like` | 点赞 / 取消 |
| 同学录 | `GET/POST /api/classmates` | 同学录管理 |
| 关于 | `GET/PUT /api/about` | 关于页面 |
| 管理 | `/api/admin/*` | 后台管理接口 |

## 部署

### 云服务器（推荐）

```bash
# 安装依赖
npm install

# 安装 PM2 进程管理
npm install -g pm2

# 启动
pm2 start server.js --name "class-memories"
pm2 save
pm2 startup
```

### 环境变量

创建 `.env` 文件：

```
JWT_SECRET=your-secret-key-here
```

### 注意事项

- **`uploads/`** — 用户上传文件目录，需持久化或接入对象存储
- **`db.json`** — 数据库文件，建议定期备份
- **端口** — 默认 3000，可通过 Nginx 反代到 80/443
- **FFmpeg** — 视频转码依赖，服务器需安装 `ffmpeg`

## License

ISC
