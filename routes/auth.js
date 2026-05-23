const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function ({ db, JWT_SECRET, registerLimiter, loginLimiter }) {
  const router = require('express').Router();

  /**
   * @openapi
   * /api/register:
   *   post:
   *     summary: 用户注册
   *     description: 注册新用户账号
   *     tags: [认证]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username:
   *                 type: string
   *                 description: 用户名（3-20字符，支持字母、数字、下划线、中文）
   *                 example: zhangsan
   *               password:
   *                 type: string
   *                 description: 密码（6-30字符）
   *                 example: mypassword123
   *     responses:
   *       200:
   *         description: 注册成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: User registered successfully
   *       400:
   *         description: 请求参数错误（用户名已存在、格式不正确等）
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post('/register', registerLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: '用户名不能为空' });
      }

      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: '用户名长度需要在3-20个字符之间' });
      }

      if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
        return res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: '密码不能为空' });
      }

      if (password.length < 6 || password.length > 30) {
        return res.status(400).json({ error: '密码长度需要在6-30个字符之间' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await db.read();
      const existingUser = db.data.users.find(u => u.username === username);

      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      const newUser = {
        id: Date.now(),
        username,
        password: hashedPassword,
        role: 'user',
        created_at: new Date().toISOString()
      };

      db.data.users.push(newUser);
      await db.write();

      res.json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  /**
   * @openapi
   * /api/login:
   *   post:
   *     summary: 用户登录
   *     description: 使用用户名和密码登录，获取 JWT Token
   *     tags: [认证]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username:
   *                 type: string
   *                 example: admin
   *               password:
   *                 type: string
   *                 example: admin123
   *     responses:
   *       200:
   *         description: 登录成功，返回 Token 和用户信息
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       401:
   *         description: 用户名或密码错误
   *       403:
   *         description: 账号已被封禁
   */
  router.post('/login', loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;

      await db.read();
      const user = db.data.users.find(u => u.username === username);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.isBanned) {
        return res.status(403).json({
          error: '账号已封禁',
          banReason: user.banReason || '您的账号已被封禁',
          isBanned: true
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, isSuperAdmin: user.isSuperAdmin },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin || false,
          isBanned: user.isBanned,
          banReason: user.banReason,
          uploadDisabled: user.uploadDisabled,
          uploadDisableReason: user.uploadDisableReason
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
};
