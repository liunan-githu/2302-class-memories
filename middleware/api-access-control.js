const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { hasPermission } = require('../permissions');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量未设置，请检查 .env 文件');
  process.exit(1);
}

// ==================== 限流器工厂 ====================

function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 60,
    message = '请求过于频繁，请稍后再试',
    keyGenerator,
    skipAuthenticated = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => {
      if (req.user?.id) return `user_${req.user.id}`;
      return ipKeyGenerator(req.ip);
    }),
    skip: (req) => {
      if (skipAuthenticated && req.user) return true;
      return false;
    },
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    },
  });
}

// ==================== 限流器实例 ====================

const guestApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: '请求过于频繁，请登录后获得更高访问频率，或稍后再试',
  skipAuthenticated: true,
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试过于频繁，请15分钟后再试',
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: '注册请求过于频繁，请1小时后再试',
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: '上传次数过多，请稍后再试',
});

const commentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: '评论过于频繁，请稍后再试',
});

// ==================== 认证中间件 ====================

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = decoded;
    next();
  });
}

function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: '未提供认证令牌',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: '登录已过期，请重新登录',
          code: 'AUTH_TOKEN_EXPIRED',
        });
      }
      return res.status(403).json({
        error: '无效的认证令牌',
        code: 'AUTH_TOKEN_INVALID',
      });
    }

    const db = req.app.get('db');
    if (db) {
      try {
        await db.read();
        const dbUser = db.data.users.find(u => u.id === decoded.id);
        if (!dbUser) {
          return res.status(401).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
        }
        if (dbUser.isBanned) {
          return res.status(403).json({
            error: '账号已封禁',
            banReason: dbUser.banReason || '您的账号已被封禁',
            isBanned: true,
            code: 'USER_BANNED',
          });
        }
        req.user = {
          ...decoded,
          isBanned: dbUser.isBanned,
          uploadDisabled: dbUser.uploadDisabled,
          isSuperAdmin: dbUser.isSuperAdmin || false,
        };
      } catch (dbError) {
        console.error('[Auth] 数据库读取失败:', dbError);
        return res.status(500).json({ error: '服务器内部错误', code: 'INTERNAL_ERROR' });
      }
    } else {
      req.user = decoded;
    }

    // 滑动续签: Token 剩余有效期不足 12 小时则自动续期 1 天
    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp ? decoded.exp - now : 0;
    if (remaining < 12 * 60 * 60) {
      const newToken = jwt.sign(
        { id: decoded.id, username: decoded.username, role: decoded.role, isSuperAdmin: decoded.isSuperAdmin },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      res.setHeader('X-Refresh-Token', newToken);
    }

    next();
  });
}

// ==================== 管理员权限中间件 ====================

function adminRequired(permission) {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: '管理后台需要登录',
        code: 'ADMIN_AUTH_REQUIRED',
      });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: '登录已过期，请重新登录',
            code: 'AUTH_TOKEN_EXPIRED',
          });
        }
        return res.status(403).json({
          error: '无效的认证令牌',
          code: 'AUTH_TOKEN_INVALID',
        });
      }

      const db = req.app.get('db');
      if (!db) {
        return res.status(500).json({ error: '服务器内部错误', code: 'INTERNAL_ERROR' });
      }

      try {
        await db.read();
        const dbUser = db.data.users.find(u => u.id === decoded.id);

        if (!dbUser) {
          return res.status(401).json({ error: '用户不存在', code: 'USER_NOT_FOUND' });
        }

        if (dbUser.isBanned) {
          return res.status(403).json({
            error: '账号已封禁',
            banReason: dbUser.banReason || '您的账号已被封禁',
            isBanned: true,
            code: 'USER_BANNED',
          });
        }

        req.user = {
          ...decoded,
          isBanned: dbUser.isBanned,
          uploadDisabled: dbUser.uploadDisabled,
          isSuperAdmin: dbUser.isSuperAdmin || false,
        };

        if (permission && !hasPermission(req.user, permission)) {
          return res.status(403).json({
            error: '权限不足，无法访问管理后台',
            code: 'ADMIN_PERMISSION_DENIED',
            requiredPermission: permission,
          });
        }

        // 滑动续签: Token 剩余有效期不足 12 小时则自动续期 1 天
        const now = Math.floor(Date.now() / 1000);
        const remaining = decoded.exp ? decoded.exp - now : 0;
        if (remaining < 12 * 60 * 60) {
          const newToken = jwt.sign(
            { id: decoded.id, username: decoded.username, role: decoded.role, isSuperAdmin: decoded.isSuperAdmin },
            JWT_SECRET,
            { expiresIn: '1d' }
          );
          res.setHeader('X-Refresh-Token', newToken);
        }

        next();
      } catch (dbError) {
        console.error('[Admin] 数据库读取失败:', dbError);
        return res.status(500).json({ error: '服务器内部错误', code: 'INTERNAL_ERROR' });
      }
    });
  };
}

// ==================== 安全头中间件 ====================

function securityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
}

// ==================== 请求日志中间件 ====================

function requestLogger(req, res, next) {
  if (!req.path.startsWith('/api')) return next();

  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userStr = req.user ? `[User:${req.user.id}]` : '[Guest]';
    console.log(`[API] ${timestamp} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms) ${userStr}`);
  });

  next();
}

// ==================== 导出 ====================

module.exports = {
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
  createRateLimiter,
};
