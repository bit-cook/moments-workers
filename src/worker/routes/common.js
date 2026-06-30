import { verify, sign } from 'hono/jwt';

export const ADMIN_ACCOUNT = 'admin';

export function createResponse(c, data, status = 200) {
  return c.json({
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : null,
    error: status >= 400 ? data : null,
    timestamp: new Date().toISOString(),
  }, status);
}

export async function generateToken(user, secret) {
  const now = Math.floor(Date.now() / 1000);
  return await sign({
    ...user,
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  }, secret);
}

export const isAdminInitSecretValid = (c, secret) => {
  const envSecret = c.env.ADMIN_INIT_SECRET;
  return Boolean(envSecret && secret === envSecret);
};

export const authMiddleware = async (c, next) => {
  let token = null;
  const authHeader = c.req.header('Authorization') || c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookieHeader = c.req.header('cookie') || c.req.header('Cookie') || '';
    const match = cookieHeader.match(/(?:^|; )token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return createResponse(c, { message: '未授权访问' }, 401);
  }

  try {
    const decoded = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('user', decoded);
    await next();
  } catch (err) {
    console.error('[authMiddleware] Token verification failed:', err);
    return createResponse(c, { message: 'Token 无效或已过期' }, 401);
  }
};

export const isPublicPath = (path) => {
  return path === '/api/auth/login' ||
    path === '/api/auth/init-admin' ||
    path.startsWith('/api/file/') ||
    path.startsWith('/api/file/thumb/') ||
    path.startsWith('/api/file-info/');
};
