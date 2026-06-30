import { Hono } from 'hono';
import { getTgFileById } from '../utils/index.js';

const files = new Hono();

files.post('/upload-file', async (c) => {
  try {
    const body = await c.req.formData();
    const file = body.get('file');
    if (!file) {
      return c.json({ success: false, message: '缺少文件' }, 400);
    }

    const uploadFormData = new FormData();
    uploadFormData.append('chat_id', c.env.TG_CHAT_ID);
    let fileId, fileName, thumbnailFileId, mimeType;

    if (file.type.startsWith('image/gif')) {
      const newFileName = file.name.replace(/\.gif$/, '.jpeg');
      const newFile = new File([file], newFileName, { type: 'image/jpeg' });
      uploadFormData.append('document', newFile);
    } else {
      uploadFormData.append('document', file);
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${c.env.TG_BOT_TOKEN}/sendDocument`, { method: 'POST', body: uploadFormData });
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      return c.json({ success: false, message: '上传到 Telegram 失败', error: errorData }, 500);
    }

    const responseData = await telegramResponse.json();
    if (responseData.result.video) {
      fileId = responseData.result.video.file_id;
      fileName = responseData.result.video.file_name;
      mimeType = responseData.result.video.mime_type;
      thumbnailFileId = responseData.result.video.thumb?.file_id;
    } else if (responseData.result.document) {
      fileId = responseData.result.document.file_id;
      fileName = responseData.result.document.file_name;
      mimeType = responseData.result.document.mime_type;
      if (responseData.result.document.thumb) {
        thumbnailFileId = responseData.result.document.thumb?.file_id;
      }
    } else if (responseData.result.audio) {
      fileId = responseData.result.audio.file_id;
      fileName = responseData.result.audio.file_name;
      mimeType = responseData.result.audio.mime_type;
    } else if (responseData.result.photo) {
      fileId = responseData.result.photo.file_id;
      fileName = responseData.result.photo.file_name;
      mimeType = responseData.result.photo.mime_type;
      thumbnailFileId = responseData.result.photo.thumb?.file_id;
    } else {
      return c.json({ success: false, message: '获取文件ID失败', data: responseData }, 500);
    }

    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const data = { ...responseData.result };
    data.mimeType = mimeType;
    data.fileId = fileId;
    data.fileName = fileName || `file_${timestamp}.${fileExtension}`;
    data.key = `${timestamp}.${fileExtension}`;
    if (thumbnailFileId) {
      data.thumbnailFileId = thumbnailFileId;
      data.thumbnailKey = `thumb/${timestamp}.${fileExtension}`;
      data.thumbnailUrl = `${c.env.DOMAIN}/api/file/${data.thumbnailKey}`;
    }
    data.url = `${c.env.DOMAIN}/api/file/${data.key}`;
    delete data.chat;
    delete data.from;

    await c.env.IMAGE.put(`${timestamp}.${fileExtension}`, JSON.stringify(data));
    return c.json({ success: true, message: '文件上传成功', data });
  } catch (error) {
    return c.json({ success: false, message: '文件上传失败', error: error instanceof Error ? error.message : '未知错误' }, 500);
  }
});

files.get('/file/:key', async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return c.json({ success: false, message: '请传入文件key' });
  }
  const data = await c.env.IMAGE.get(key);
  if (!data) {
    return c.json({ success: false, message: '未找到对应数据' }, 404);
  }
  const parsedData = JSON.parse(data);
  try {
    const { response, contentType } = await getTgFileById(c, parsedData.fileId);
    return c.body(response.body, 200, { 'Content-Type': contentType });
  } catch (error) {
    return c.json({ success: false, message: error.message, error: error.errorData }, 500);
  }
});

files.get('/file/thumb/:key', async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return c.json({ success: false, message: '请传入文件key' });
  }
  const data = await c.env.IMAGE.get(key);
  if (!data) {
    return c.json({ success: false, message: '未找到对应数据' }, 404);
  }
  const parsedData = JSON.parse(data);
  if (!parsedData.thumbnailFileId) {
    return c.json({ success: false, message: '该文件没有缩略图' }, 400);
  }
  try {
    const { response, contentType } = await getTgFileById(c, parsedData.thumbnailFileId);
    return c.body(response.body, 200, { 'Content-Type': contentType });
  } catch (error) {
    return c.json({ success: false, message: error.message, error: error.errorData }, 500);
  }
});

files.get('/file-info/:key', async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return c.json({ success: false, message: '请传入文件key' });
  }
  const data = await c.env.IMAGE.get(key);
  if (!data) {
    return c.json({ success: false, message: '未找到对应数据' }, 404);
  }
  const parsedData = JSON.parse(data);
  return c.json({ success: true, data: parsedData });
});

export default files;
