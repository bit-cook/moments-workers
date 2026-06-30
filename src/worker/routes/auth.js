import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { createResponse, generateToken, ADMIN_ACCOUNT, isAdminInitSecretValid } from './common.js';

const auth = new Hono();

auth.post('/login', async (c) => {
  const { account, password } = await c.req.json();
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, account, password, name, role, extra_data FROM users WHERE account = ?'
    ).bind(account).first();
    if (!user) {
      return createResponse(c, { error: '未授权', message: '用户不存在' }, 400);
    }

    const passwordMatch = bcrypt.compareSync(password, user.password || '');
    if (!passwordMatch) {
      return createResponse(c, { error: '未授权', message: '密码错误' }, 400);
    }

    const result = {
      id: user.id,
      account: user.account,
      name: user.name,
      role: user.role,
      extra_data: user.extra_data,
    };
    const token = await generateToken(result, c.env.JWT_SECRET);
    const maxAge = 7 * 24 * 60 * 60;
    const secureFlag = c.env.NODE_ENV === 'production' ? '; Secure' : '';
    const cookie = `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
    c.header('Set-Cookie', cookie);

    return createResponse(c, result, 200);
  } catch (error) {
    return createResponse(c, { error: '服务器内部错误', message: error.message }, 500);
  }
});

auth.post('/init-admin', async (c) => {
  const { account, password, secret } = await c.req.json();
  if (account !== ADMIN_ACCOUNT) {
    return createResponse(c, { error: '参数错误', message: `管理员账号固定为 ${ADMIN_ACCOUNT}` }, 400);
  }
  if (!password || password.length < 6) {
    return createResponse(c, { error: '参数错误', message: '密码至少6位' }, 400);
  }
  if (!isAdminInitSecretValid(c, secret)) {
    return createResponse(c, { error: '未授权', message: '初始化密钥错误' }, 403);
  }

  const existingAdmin = await c.env.DB.prepare(
    'SELECT id FROM users WHERE account = ?'
  ).bind(ADMIN_ACCOUNT).first();
  if (existingAdmin) {
    return createResponse(c, { error: '已存在', message: '管理员账号已存在' }, 409);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = await c.env.DB.prepare(
    'INSERT INTO users (account, password, name, role, extra_data) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    ADMIN_ACCOUNT,
    hashedPassword,
    '管理员',
    'admin',
    null
  ).run();

  const newUser = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(result.meta.last_row_id).first();

  const token = await generateToken({
    id: newUser.id,
    account: newUser.account,
    name: newUser.name,
    role: newUser.role,
    extra_data: newUser.extra_data,
  }, c.env.JWT_SECRET);
  const maxAge = 7 * 24 * 60 * 60;
  const secureFlag = c.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
  c.header('Set-Cookie', cookie);

  return createResponse(c, newUser, 200);
});

auth.post('/logout', async (c) => {
  const cookie = `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
  c.header('Set-Cookie', cookie);
  return createResponse(c, { message: '登出成功' }, 200);
});

auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return createResponse(c, { error: '未授权', message: '未登录' }, 401);
  }
  return createResponse(c, user, 200);
});

export default auth;
