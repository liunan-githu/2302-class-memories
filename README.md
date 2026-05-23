# 2302班回忆录

记录班级美好时光的视频分享网站

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

访问 http://localhost:3000

## 部署指南

### 方式一：云服务器部署（推荐）

#### 1. 准备服务器
- 购买云服务器（阿里云、腾讯云、华为云等）
- 操作系统：Ubuntu 20.04 或更高版本
- 安装 Node.js 16+

#### 2. 安装 Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v
npm -v
```

#### 3. 上传项目
```bash
# 使用 git 克隆（推荐）
git clone <你的仓库地址>
cd 2302-class-memories

# 或使用 SFTP 上传文件
```

#### 4. 安装依赖并启动
```bash
npm install

# 使用 pm2 管理进程（推荐）
npm install -g pm2

# 启动应用
pm2 start server.js --name "class-memories"

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
# 按照提示执行命令
```

#### 5. 使用 Nginx 反向代理（可选但推荐）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 方式二：Vercel/Railway 部署

对于这种全栈项目，推荐使用 Railway 更简单：

1. 注册 Railway 账号
2. 导入 GitHub 仓库
3. 配置环境变量
4. 一键部署

**注意**：需要配置持久化存储解决方案（如对象存储）

### 方式三：Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 重要注意事项

1. **uploads 目录持久化**
   - 部署时确保 uploads 目录需要持久化
   - 可以配置对象存储服务（阿里云 OSS、腾讯云 COS）

2. **数据库备份**
   - db.json 需要定期备份

3. **HTTPS 证书**
   - 生产环境建议配置 HTTPS
   - 使用 Let's Encrypt 免费证书

4. **安全配置**
   - 修改默认管理员密码
   - 配置防火墙规则
   - 使用环境变量管理敏感信息

## 默认账号

- 管理员账号：`admin` / `admin123`
- **请在部署后立即修改！

## 技术栈

- 后端：Express.js
- 数据库：LowDB (JSON)
- 文件上传：Multer
- 认证：JWT
