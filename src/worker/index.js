import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { authMiddleware, isPublicPath } from './routes/common.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import records from './routes/records.js';
import files from './routes/files.js';

const app = new Hono();

// CORS should be applied before route handling
app.use('/api/*', cors({
  origin: (origin) => origin,
  credentials: true,
}));

// 为公开文件接口添加缓存策略
app.get(
  '/api/file/*',
  cache({
    cacheName: 'open-api-image',
    cacheControl: 'public, max-age=31536000',
  })
);

// 对所有 API 请求应用认证中间件（排除公开路由）
app.use('/api/*', async (c, next) => {
  const path = c.req.path.split('?')[0];
  if (isPublicPath(path)) {
    return next();
  }
  return authMiddleware(c, next);
});

// 挂载模块化路由
app.route('/api/auth', auth);
app.route('/api/users', users);
app.route('/api/records', records);
app.route('/api', files);

export default app;
