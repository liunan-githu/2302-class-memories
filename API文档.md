# 2302班回忆录 — API 接口文档

> 版本：1.0.0  
> 基础地址：`http://<你的服务器IP>:3000`  
> 数据格式：JSON  
> 认证方式：JWT Bearer Token

---

## 目录

- [一、快速开始](#一快速开始)
- [二、认证接口](#二认证接口)
- [三、视频接口](#三视频接口)
- [四、照片接口](#四照片接口)
- [五、评论接口](#五评论接口)
- [六、点赞接口](#六点赞接口)
- [七、用户接口](#七用户接口)
- [八、管理员-用户管理](#八管理员-用户管理)
- [九、管理员-视频管理](#九管理员-视频管理)
- [十、管理员-照片管理](#十管理员-照片管理)
- [十一、管理员-权限系统](#十一管理员-权限系统)
- [十二、同学录接口](#十二同学录接口)
- [十三、关于页面](#十三关于页面)
- [十四、系统调试](#十四系统调试)
- [十五、错误码说明](#十五错误码说明)
- [十六、权限对照表](#十六权限对照表)
- [附录：各平台调用示例](#附录各平台调用示例)

---

## 一、快速开始

### 1.1 调用流程

```
1. 用户注册（POST /api/register）或直接使用已有账号
2. 用户登录（POST /api/login）→ 拿到 Token
3. 后续请求在请求头携带 Token → 调用其他接口
```

### 1.2 认证方式

在请求头中添加：

```
Authorization: Bearer <你的Token>
```

### 1.3 Token 说明

- Token 是 **JWT 格式**的一长串字符
- 登录后服务器返回，前端需要保存下来
- 每次请求都带上它，服务器就能识别你的身份
- Token 目前**没有过期时间限制**

### 1.4 角色权限速览

| 角色 | 可操作内容 |
|------|-----------|
| 访客 | 浏览公开视频、照片、同学录 |
| 普通用户 | 上传视频/照片、发表评论、点赞 |
| 版主 | 审核内容、管理评论 |
| 管理员 | 管理用户、管理所有内容 |
| 超级管理员 | 拥有所有权限（含权限管理、系统设置） |

---

## 二、认证接口

### 2.1 用户注册

注册新账号。

```
POST /api/register
```

**请求头：** 无（不需要 Token）

**请求体：**

```json
{
  "username": "zhangsan",
  "password": "mypassword123"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| username | string | ✅ | 3~20个字符，支持字母、数字、下划线、中文 |
| password | string | ✅ | 6~30个字符 |

**成功响应（200）：**

```json
{
  "message": "User registered successfully"
}
```

**错误响应：**

| 状态码 | 说明 |
|:------:|------|
| 400 | 用户名已存在 / 格式不正确 |
| 429 | 注册太频繁（每小时限5次） |
| 500 | 服务器错误 |

---

### 2.2 用户登录

使用用户名密码登录，获取 Token。

```
POST /api/login
```

**请求头：** 无（不需要 Token）

**请求体：**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应（200）：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123456,
    "username": "admin",
    "role": "superadmin",
    "isSuperAdmin": true,
    "isBanned": false,
    "banReason": null,
    "uploadDisabled": false,
    "uploadDisableReason": null
  }
}
```

**错误响应：**

| 状态码 | 说明 |
|:------:|------|
| 401 | 用户名或密码错误 |
| 403 | 账号已被封禁（含封禁原因） |
| 429 | 登录太频繁（每15分钟限10次） |

---

## 三、视频接口

### 3.1 上传视频

> ⚠️ 需要登录

```
POST /api/upload
```

**请求头：** `Authorization: Bearer <Token>`

**请求体：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| video | file | ✅ | 视频文件 |
| cover | file | ❌ | 封面图片 |
| title | string | ✅ | 视频标题 |
| description | string | ❌ | 视频描述 |
| category | string | ❌ | 分类（默认"未分类"） |
| tags | string | ❌ | 标签（逗号分隔） |
| privacy | string | ❌ | `public` 或 `private`（默认 public） |
| allowComments | string | ❌ | `true` 或 `false`（默认 true） |

**成功响应（200）：**

```json
{
  "message": "Video uploaded successfully, waiting for review",
  "video": {
    "id": 1712345678901,
    "title": "班级回忆",
    "description": "我们的故事",
    "category": "校园生活",
    "tags": "毕业,回忆",
    "filename": "1712345678901-123456789.mp4",
    "coverFilename": "1712345678901-987654321.jpg",
    "uploader_id": 123456,
    "status": "pending",
    "views": 0,
    "likes": 0,
    "duration": 120,
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "videoInfo": { ... }
}
```

> **注意：** 上传成功后会自动触发视频转码（如果分辨率 > 360p），转码完成后会生成多种清晰度。

---

### 3.2 获取公开视频列表

```
GET /api/videos
```

**请求头：** 可选（带 Token 可提高限流上限）

**查询参数：** 无（目前未实现分页）

**成功响应（200）：**

```json
[
  {
    "id": 1712345678901,
    "title": "班级回忆",
    "description": "我们的故事",
    "category": "校园生活",
    "tags": "毕业,回忆",
    "filename": "1712345678901-123456789.mp4",
    "coverFilename": "1712345678901-987654321.jpg",
    "uploader_id": 123456,
    "username": "zhangsan",
    "status": "approved",
    "views": 1024,
    "likes": 50,
    "duration": 120,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

返回所有已审核通过的视频，按上传时间倒序排列。

---

### 3.3 获取视频详情

```
GET /api/videos/{id}
```

**请求头：** 可选

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 视频ID |

**成功响应（200）：** 返回单个视频对象（同列表中的结构）

> **注意：** 每次访问此接口，视频的 `views`（播放次数）会 +1。

---

### 3.4 获取用户自己的视频列表

> ⚠️ 需要登录

```
GET /api/user/videos
```

**请求头：** `Authorization: Bearer <Token>`

返回当前登录用户上传的所有视频。

---

### 3.5 删除视频

> ⚠️ 需要管理员权限：`video_delete`

```
DELETE /api/videos/{id}
```

**请求头：** `Authorization: Bearer <Token>`

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 视频ID |

**成功响应（200）：**

```json
{
  "message": "Video deleted successfully"
}
```

> 删除时同时会删除视频文件、封面文件和所有转码文件。

---

### 3.6 获取视频可用画质

```
GET /api/videos/{id}/qualities
```

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 视频ID |

**成功响应（200）：**

```json
{
  "qualities": [...]
}
```

返回该视频已转码好的所有清晰度列表。

---

### 3.7 强制重新转码

> ⚠️ 需要管理员权限：`video_manage`

```
POST /api/videos/{id}/transcode
```

**请求头：** `Authorization: Bearer <Token>`

---

### 3.8 转码状态查询（管理员）

> ⚠️ 需要管理员权限：`video_manage`

```
GET /api/admin/transcode/status
```

### 3.9 转码状态查询（普通用户）

> ⚠️ 需要登录

```
GET /api/user/transcode/status
```

---

## 四、照片接口

### 4.1 批量上传照片

> ⚠️ 需要登录

```
POST /api/photos/batch
```

**请求头：** `Authorization: Bearer <Token>`

**请求体：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| photos | file[] | ✅ | 照片文件，最多50张 |
| title | string | ❌ | 相册标题 |
| description | string | ❌ | 相册描述 |
| category | string | ❌ | 分类 |
| tags | string | ❌ | 标签 |

**成功响应（200）：**

```json
{
  "message": "成功上传 5 张图片，等待审核",
  "batchId": "abc123def456",
  "count": 5
}
```

---

### 4.2 获取公开照片列表

```
GET /api/photos
```

返回所有已审核通过的照片批次。

---

### 4.3 获取公开相册详情

```
GET /api/photos/{id}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 批次ID（batchId） |

> 只能查看已审核通过的相册。

---

### 4.4 获取用户自己的照片列表

> ⚠️ 需要登录

```
GET /api/user/photos
```

---

## 五、评论接口

### 5.1 获取视频评论列表

```
GET /api/videos/{id}/comments
```

| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 视频ID |

**成功响应（200）：**

```json
[
  {
    "id": 1712345678901,
    "videoId": 1712345678900,
    "userId": 123456,
    "username": "zhangsan",
    "content": "这个视频拍得真好！",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 5.2 发表评论

> ⚠️ 需要登录

```
POST /api/videos/{id}/comments
```

**请求头：** `Authorization: Bearer <Token>`

**请求体：**

```json
{
  "content": "这个视频拍得真好！"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| content | string | ✅ | 1~500个字符 |

---

### 5.3 删除评论

> ⚠️ 需要登录（仅评论作者或管理员可删除）

```
DELETE /api/comments/{id}
```

**请求头：** `Authorization: Bearer <Token>`

| 参数 | 类型 | 说明 |
|------|------|------|
| id | integer | 评论ID |

---

## 六、点赞接口

### 6.1 点赞视频

> ⚠️ 需要登录

```
POST /api/videos/{id}/like
```

**请求头：** `Authorization: Bearer <Token>`

**成功响应（200）：**

```json
{
  "likes": 51
}
```

> 目前每次调用点赞数 +1，没有取消点赞功能。

---

## 七、用户接口

### 7.1 获取当前用户状态

> ⚠️ 需要登录

```
GET /api/user/status
```

**请求头：** `Authorization: Bearer <Token>`

**成功响应（200）：**

```json
{
  "isBanned": false,
  "banReason": null,
  "uploadDisabled": false,
  "uploadDisableReason": null
}
```

---

### 7.2 获取当前用户权限

> ⚠️ 需要登录

```
GET /api/user/permissions
```

**请求头：** `Authorization: Bearer <Token>`

**成功响应（200）：**

```json
{
  "permissions": ["video_audit", "video_manage", "..."],
  "role": "admin",
  "isSuperAdmin": false
}
```

---

## 八、管理员-用户管理

> ⚠️ 以下接口均需要管理员权限

### 8.1 获取所有用户列表

> 需要权限：`user_management`

```
GET /api/admin/users/all
```

**成功响应（200）：**

```json
[
  {
    "id": 1,
    "username": "admin",
    "name": "",
    "role": "superadmin",
    "isBanned": false,
    "isSuperAdmin": true,
    "permissions": ["..."],
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

> 返回的用户信息**不包含密码**。

---

### 8.2 封禁用户

> 需要权限：`user_ban`

```
POST /api/admin/user/{id}/ban
```

**请求体：**

```json
{
  "reason": "发布不当内容"
}
```

---

### 8.3 解封用户

> 需要权限：`user_unban`

```
POST /api/admin/user/{id}/unban
```

---

### 8.4 禁用用户上传

> 需要权限：`user_disable_upload`

```
POST /api/admin/user/{id}/disable-upload
```

---

### 8.5 启用用户上传

> 需要权限：`user_enable_upload`

```
POST /api/admin/user/{id}/enable-upload
```

---

### 8.6 提升用户为管理员

> 需要权限：`user_promote`

```
POST /api/admin/users/{id}/promote
```

---

### 8.7 降级管理员

> 需要权限：`user_demote`

```
POST /api/admin/users/{id}/demote
```

> 不能降级超级管理员。

---

### 8.8 更新用户权限

> 需要权限：`permission_manage`

```
PUT /api/admin/users/{id}/permissions
```

**请求体：**

```json
{
  "permissions": ["video_audit", "video_manage"]
}
```

> 不能修改超级管理员的权限。

---

## 九、管理员-视频管理

### 9.1 获取待审核视频列表

> 需要权限：`video_audit`

```
GET /api/videos/pending
```

### 9.2 获取所有视频列表

> 需要权限：`video_manage`

```
GET /api/admin/videos
```

### 9.3 审核通过视频

> 需要权限：`video_audit`

```
POST /api/videos/{id}/approve
```

### 9.4 拒绝视频

> 需要权限：`video_audit`

```
POST /api/videos/{id}/reject
```

**请求体：**

```json
{
  "reason": "视频内容不符合规范"
}
```

---

## 十、管理员-照片管理

> ⚠️ 以下接口需要权限：`photo_manage` 或 `photo_delete`

### 10.1 获取待审核照片

```
GET /api/photos/pending
```

### 10.2 获取所有照片批次

```
GET /api/admin/photos
```

### 10.3 审核通过照片批次

```
POST /api/photos/{id}/approve
```

### 10.4 拒绝照片批次

```
POST /api/photos/{id}/reject
```

### 10.5 管理员查看相册详情

```
GET /api/admin/photos/{id}
```

### 10.6 删除照片批次

> 需要权限：`photo_delete`

```
DELETE /api/photos/{id}
```

---

## 十一、管理员-权限系统

### 11.1 获取所有权限和角色定义

> 需要权限：`permission_manage`

```
GET /api/admin/permissions
```

**成功响应（200）：**

```json
{
  "permissions": { "USER_VIEW": "user_view", "..." },
  "roles": [ { "id": "admin", "name": "管理员", "..." } ],
  "groups": { "user": { "name": "用户管理", "..." } },
  "descriptions": { "user_view": { "name": "查看用户", "description": "..." } }
}
```

### 11.2 获取审计日志

> 需要权限：`audit_log_view`

```
GET /api/admin/audit-logs?page=1&limit=50
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | integer | 页码（默认1） |
| limit | integer | 每页条数（默认50） |
| action | string | 按操作类型筛选 |
| userId | integer | 按操作用户ID筛选 |
| targetId | integer | 按目标ID筛选 |

---

## 十二、同学录接口

### 12.1 获取同学录列表

```
GET /api/classmates?search=张三&sortBy=name
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索关键词（按姓名、性格、简介、联系方式） |
| graduationYear | string | 按毕业年份筛选 |
| sortBy | string | `name` / `graduationYear` / `newest` |

**成功响应（200）：**

```json
{
  "classmates": [
    {
      "id": 1,
      "name": "张三",
      "graduationYear": "2023",
      "personality": "开朗",
      "contact": "微信:zhangsan",
      "photo": "zhangsan.jpg",
      "description": "喜欢打篮球",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "allGraduationYears": ["2023", "2024"]
}
```

### 12.2 同学录统计

```
GET /api/classmates/stats
```

**成功响应（200）：**

```json
{
  "total": 50,
  "withPhoto": 35,
  "graduationYears": { "2023": 20, "2024": 30 },
  "recentCount": 2
}
```

### 12.3 添加同学

> ⚠️ 需要权限：`classmates_manage`

```
POST /api/admin/classmates
```

**请求体：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| name | string | ✅ | 姓名（最多50字符，不能重复） |
| graduationYear | string | ❌ | 毕业年份 |
| personality | string | ❌ | 性格特点 |
| contact | string | ❌ | 联系方式 |
| description | string | ❌ | 个人简介（最多500字符） |
| photo | file | ❌ | 照片文件 |
| existingPhoto | string | ❌ | 已有照片文件名 |

### 12.4 更新同学信息

> ⚠️ 需要权限：`classmates_manage`

```
PUT /api/admin/classmates/{id}
```

### 12.5 删除同学

> ⚠️ 需要权限：`classmates_manage`

```
DELETE /api/admin/classmates/{id}
```

### 12.6 批量删除同学

> ⚠️ 需要权限：`classmates_manage`

```
POST /api/admin/classmates/batch-delete
```

**请求体：**

```json
{
  "ids": [1, 2, 3]
}
```

---

## 十三、关于页面

### 13.1 获取关于页面

```
GET /api/about
```

### 13.2 更新关于页面

> ⚠️ 需要权限：`about_manage`

```
PUT /api/admin/about
```

**请求体：**

```json
{
  "creatorName": "2302班技术团队",
  "creatorRole": "网站开发 & 设计",
  "projectDesc": "项目描述",
  "projectDesc2": "补充描述",
  "thanks": "感谢语",
  "thanks2": "补充感谢"
}
```

---

## 十四、系统调试

### 14.1 查看数据库全部内容

> ⚠️ 需要权限：`system_settings`

```
GET /api/debug/db
```

> 返回完整的数据库内容，仅用于调试。

---

## 十五、错误码说明

所有接口的错误响应格式：

```json
{
  "error": "错误描述信息",
  "code": "ERROR_CODE"
}
```

### 通用错误码

| HTTP 状态码 | code | 说明 |
|:----------:|------|------|
| 400 | - | 请求参数错误 |
| 401 | `AUTH_TOKEN_MISSING` | 未提供 Token |
| 403 | `AUTH_TOKEN_INVALID` | Token 无效 |
| 403 | `USER_BANNED` | 账号已被封禁 |
| 403 | `ADMIN_PERMISSION_DENIED` | 权限不足 |
| 404 | - | 资源不存在 |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求太频繁 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 具体业务错误码

| code | 说明 |
|------|------|
| `BATCH_NOT_FOUND` | 相册批次不存在 |
| `ALREADY_APPROVED` | 已被审核通过 |
| `ALREADY_REJECTED` | 已被拒绝 |

---

## 十六、权限对照表

| 权限标识 | 中文名 | 说明 |
|---------|--------|------|
| `user_view` | 查看用户 | 查看用户列表和详情 |
| `user_management` | 管理用户 | 管理用户账号和状态 |
| `user_promote` | 提升用户 | 将普通用户提升为管理员 |
| `user_demote` | 降级用户 | 将管理员降级为普通用户 |
| `user_ban` | 封禁用户 | 封禁违规用户 |
| `user_unban` | 解封用户 | 解封已封禁的用户 |
| `user_disable_upload` | 禁用上传 | 禁用用户上传功能 |
| `user_enable_upload` | 启用上传 | 启用用户上传功能 |
| `video_audit` | 视频审核 | 审核用户上传的视频 |
| `video_manage` | 视频管理 | 管理所有视频内容 |
| `video_delete` | 删除视频 | 删除违规视频 |
| `photo_manage` | 照片管理 | 管理照片 |
| `photo_delete` | 删除照片 | 删除照片 |
| `comment_manage` | 评论管理 | 管理用户评论 |
| `comment_delete` | 删除评论 | 删除违规评论 |
| `classmates_manage` | 同学录管理 | 管理同学录信息 |
| `about_manage` | 关于页面 | 编辑关于页面内容 |
| `statistics_view` | 查看统计 | 查看数据统计 |
| `audit_log_view` | 审计日志 | 查看操作日志 |
| `permission_manage` | 权限管理 | 管理用户权限 |
| `role_manage` | 角色管理 | 管理系统角色 |
| `system_settings` | 系统设置 | 配置系统参数 |

---

## 附录：各平台调用示例

### Android (Java) — OkHttp

```java
// 1. 登录
OkHttpClient client = new OkHttpClient();

String loginJson = "{\"username\":\"用户1\",\"password\":\"123456\"}";
Request loginRequest = new Request.Builder()
    .url("http://你的IP:3000/api/login")
    .post(RequestBody.create(loginJson, MediaType.parse("application/json")))
    .build();

Response loginResponse = client.newCall(loginRequest).execute();
String responseBody = loginResponse.body().string();
// 解析 JSON，提取 token

// 2. 拿 Token 调其他接口
String token = "从登录响应中提取的token";
Request videoRequest = new Request.Builder()
    .url("http://你的IP:3000/api/videos")
    .header("Authorization", "Bearer " + token)
    .get()
    .build();

Response videoResponse = client.newCall(videoRequest).execute();
```

### Python

```python
import requests

BASE_URL = "http://你的IP:3000"

# 1. 注册（如已有账号可跳过）
# requests.post(f"{BASE_URL}/api/register", json={
#     "username": "用户1",
#     "password": "123456"
# })

# 2. 登录
resp = requests.post(f"{BASE_URL}/api/login", json={
    "username": "用户1",
    "password": "123456"
})
data = resp.json()
token = data["token"]
print("登录成功，Token:", token[:20] + "...")

# 3. 获取视频列表
headers = {"Authorization": f"Bearer {token}"}
videos = requests.get(f"{BASE_URL}/api/videos", headers=headers)
print("视频数量:", len(videos.json()))

# 4. 获取同学录
classmates = requests.get(f"{BASE_URL}/api/classmates")
print("同学数量:", classmates.json()["total"])
```

### JavaScript (Node.js)

```javascript
const BASE_URL = 'http://你的IP:3000';

async function main() {
  // 1. 登录
  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '用户1', password: '123456' })
  });
  const { token, user } = await loginRes.json();
  console.log('登录成功，角色:', user.role);

  // 2. 获取视频列表
  const videosRes = await fetch(`${BASE_URL}/api/videos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const videos = await videosRes.json();
  console.log('视频列表:', videos);

  // 3. 发表评论
  const commentRes = await fetch(`${BASE_URL}/api/videos/1/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content: '好视频！' })
  });
  const comment = await commentRes.json();
  console.log('评论成功:', comment);
}

main();
```

### cURL

```bash
# 登录
curl -X POST http://你的IP:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取视频列表（带 Token）
curl http://你的IP:3000/api/videos \
  -H "Authorization: Bearer 你的Token"

# 获取同学录
curl http://你的IP:3000/api/classmates

# 发表评论
curl -X POST http://你的IP:3000/api/videos/1/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的Token" \
  -d '{"content":"好视频！"}'
```

---

> 文档生成日期：2025-05-08
>
> 如有接口变动，请以 Swagger 在线文档为准：`http://你的IP:3000/api-docs/`
