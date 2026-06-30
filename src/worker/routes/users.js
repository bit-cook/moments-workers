import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { createResponse } from './common.js';

const users = new Hono();

users.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;
  const { results } = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();
  const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first();
  return createResponse(c, {
    users: results,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit),
    },
  }, 200);
});

users.get('/:id', async (c) => {
  const userId = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!user) {
    return createResponse(c, { error: 'Not Found', message: 'User not found' }, 404);
  }
  return createResponse(c, user, 200);
});

users.post('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return createResponse(c, { error: '权限错误', message: '非管理员权限，无法创建用户' }, 400);
  }
  const body = await c.req.json();
  if (!body.account || !body.password || !body.name) {
    return createResponse(c, { error: '参数错误', message: '账号、密码和姓名为必填项' }, 400);
  }
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE account = ?'
  ).bind(body.account).first();
  if (existingUser) {
    return createResponse(c, { error: '账号已存在', message: '该账号已被注册' }, 409);
  }
  const hashedPassword = bcrypt.hashSync(body.password, 10);
  const result = await c.env.DB.prepare(
    'INSERT INTO users (account, password, name, role, extra_data) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    body.account,
    hashedPassword,
    body.name,
    body.role || 'normal',
    body.extra_data ? JSON.stringify(body.extra_data) : null,
  ).run();
  const newUser = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(result.meta.last_row_id).first();
  return createResponse(c, newUser, 200);
});

users.put('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return createResponse(c, { error: '权限错误', message: '非管理员权限，无法更新用户' }, 400);
  }
  const userId = c.req.param('id');
  const body = await c.req.json();
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!existingUser) {
    return createResponse(c, { error: '未找到', message: '用户不存在' }, 404);
  }
  const updates = [];
  const bindings = [];
  if (body.account !== undefined) { updates.push('account = ?'); bindings.push(body.account); }
  if (body.password !== undefined) { updates.push('password = ?'); bindings.push(body.password ? bcrypt.hashSync(body.password, 10) : null); }
  if (body.name !== undefined) { updates.push('name = ?'); bindings.push(body.name); }
  if (body.role !== undefined) { updates.push('role = ?'); bindings.push(body.role); }
  if (body.extra_data !== undefined) { updates.push('extra_data = ?'); bindings.push(body.extra_data ? JSON.stringify(body.extra_data) : null); }
  if (updates.length === 0) {
    return createResponse(c, { error: '参数错误', message: '没有需要更新的字段' }, 400);
  }
  updates.push('updated_at = datetime(\'now\', \'localtime\')');
  bindings.push(userId);
  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...bindings).run();
  const updatedUser = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(userId).first();
  return createResponse(c, updatedUser, 200);
});

users.delete('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return createResponse(c, { error: '权限错误', message: '非管理员权限，无法删除用户' }, 400);
  }
  const userId = c.req.param('id');
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!existingUser) {
    return createResponse(c, { error: '未找到', message: '用户不存在' }, 404);
  }
  await c.env.DB.prepare('DELETE FROM records WHERE creator_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return createResponse(c, { message: '用户删除成功' }, 200);
});

export default users;
