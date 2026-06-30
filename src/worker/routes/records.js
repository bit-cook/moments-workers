import { Hono } from 'hono';
import { createResponse } from './common.js';

const records = new Hono();

records.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;
  const { results } = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    ORDER BY r.created_at DESC 
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();
  const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM records').first();
  return createResponse(c, {
    records: results,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit),
    },
  }, 200);
});

records.get('/:id', async (c) => {
  const recordId = c.req.param('id');
  const record = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    WHERE r.id = ?
  `).bind(recordId).first();
  if (!record) {
    return createResponse(c, { error: 'Not Found', message: 'Record not found' }, 404);
  }
  return createResponse(c, record, 200);
});

records.post('/', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return createResponse(c, { error: '权限错误', message: '非管理员权限，无法创建记录' }, 400);
  }
  const body = await c.req.json();
  if (body.creator_id === undefined) {
    return createResponse(c, { error: '参数错误', message: '必须提供创建者ID' }, 400);
  }
  const creator = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(body.creator_id).first();
  if (!creator) {
    return createResponse(c, { error: '参数错误', message: '创建者不存在' }, 400);
  }
  const result = await c.env.DB.prepare(
    'INSERT INTO records (creator_id, content_text, content_media, extra_data) VALUES (?, ?, ?, ?)'
  ).bind(
    body.creator_id,
    body.content_text || null,
    body.content_media ? (Array.isArray(body.content_media) ? JSON.stringify(body.content_media) : body.content_media) : null,
    body.extra_data ? JSON.stringify(body.extra_data) : null,
  ).run();
  const newRecord = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    WHERE r.id = ?
  `).bind(result.meta.last_row_id).first();
  return createResponse(c, newRecord, 201);
});

records.put('/:id', async (c) => {
  const recordId = c.req.param('id');
  const body = await c.req.json();
  const existingRecord = await c.env.DB.prepare(
    'SELECT id FROM records WHERE id = ?'
  ).bind(recordId).first();
  if (!existingRecord) {
    return createResponse(c, { error: '未找到', message: '记录不存在' }, 404);
  }
  const updates = [];
  const bindings = [];
  if (body.creator_id !== undefined) { updates.push('creator_id = ?'); bindings.push(body.creator_id); }
  if (body.content_text !== undefined) { updates.push('content_text = ?'); bindings.push(body.content_text); }
  if (body.content_media !== undefined) { updates.push('content_media = ?'); bindings.push(body.content_media ? (Array.isArray(body.content_media) ? JSON.stringify(body.content_media) : body.content_media) : null); }
  if (body.extra_data !== undefined) { updates.push('extra_data = ?'); bindings.push(body.extra_data ? JSON.stringify(body.extra_data) : null); }
  if (updates.length === 0) {
    return createResponse(c, { error: '参数错误', message: '没有需要更新的字段' }, 400);
  }
  updates.push('updated_at = datetime(\'now\', \'localtime\')');
  bindings.push(recordId);
  await c.env.DB.prepare(
    `UPDATE records SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...bindings).run();
  const updatedRecord = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    WHERE r.id = ?
  `).bind(recordId).first();
  return createResponse(c, updatedRecord, 200);
});

records.delete('/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return createResponse(c, { error: '权限错误', message: '非管理员权限，无法删除记录' }, 400);
  }
  const recordId = c.req.param('id');
  const existingRecord = await c.env.DB.prepare(
    'SELECT id FROM records WHERE id = ?'
  ).bind(recordId).first();
  if (!existingRecord) {
    return createResponse(c, { error: '未找到', message: '记录不存在' }, 404);
  }
  await c.env.DB.prepare('DELETE FROM records WHERE id = ?').bind(recordId).run();
  return createResponse(c, { message: '记录删除成功' }, 200);
});

export default records;
