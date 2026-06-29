// api.js - 前端API请求封装

import { clearAuthCache, getAuthInfo } from './authUtils';

class ApiClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.currentUser = null;
    this.token = null;
    this.redirectingToLogin = false;
  }

  /**
   * 设置 JWT token，后续请求会自动携带 Bearer 认证头。
   * @param {string|null} token - JWT token
   */
  setToken(token) {
    this.token = token;
    this.redirectingToLogin = false;
    if (token) {
      this.defaultHeaders.Authorization = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders.Authorization;
    }
  }

  /**
   * 清除认证信息。
   */
  clearAuth() {
    delete this.defaultHeaders.Authorization;
    this.currentUser = null;
    this.token = null;
  }

  /**
   * 处理 401 未授权，清理本地登录态并跳转到登录页。
   */
  handleUnauthorized() {
    if (this.redirectingToLogin) return;

    this.redirectingToLogin = true;
    this.clearAuth();
    clearAuthCache();

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }

  /**
   * 通用请求方法。
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>} 响应数据
   * @throws {Error} 请求失败时抛出错误
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };

    if (options.isFormData) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }

    const config = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json');
      let data = null;

      if (isJsonResponse) {
        try {
          data = await response.json();
        } catch (error) {
          data = null;
        }
      }

      if (response.status === 401) {
        this.handleUnauthorized();
        const message = data?.error?.message || data?.error || data?.message || '未授权，请重新登录';
        throw new Error(message);
      }

      if (!response.ok) {
        const message = data?.error?.message || data?.error || data?.message || 'Request failed';
        throw new Error(message);
      }

      if (!data || typeof data !== 'object') {
        return null;
      }

      if (data.success === false) {
        const message = data?.error?.message || data?.error || data?.message || 'Request failed';
        throw new Error(message);
      }

      return data.data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * GET请求。
   * @param {string} endpoint - API端点
   * @param {Object} params - 查询参数
   * @returns {Promise<any>} 响应数据
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST请求。
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求体数据
   * @returns {Promise<any>} 响应数据
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT请求。
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求体数据
   * @returns {Promise<any>} 响应数据
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE请求。
   * @param {string} endpoint - API端点
   * @returns {Promise<any>} 响应数据
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * 上传文件。
   * @param {File} file - 要上传的文件
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const result = await this.request('/upload-file', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });

    return {
      url: result?.url,
      thumbnailUrl: result?.thumbnailUrl,
      key: result?.key,
      type: result?.mimeType ? (result.mimeType.startsWith('video/') ? 'video' : 'image') : 'image',
    };
  }
}

// 创建API实例
const api = new ApiClient();

// 认证API封装
export const authApi = {
  /**
   * 使用账号密码登录，服务端返回 JWT token。
   * @param {string} account - 用户账号
   * @param {string} password - 用户密码
   * @returns {Promise<Object>} 登录结果 { success, user, token }
   * @throws {Error} 登录失败时抛出错误
   */
  async login(account, password) {
    try {
      const result = await api.post('/auth/login', { account, password });
      const { token, ...userData } = result || {};

      if (!token) {
        throw new Error('登录接口未返回 token');
      }

      api.setToken(token);
      api.currentUser = {
        ...userData,
        authenticated: true,
      };

      return { success: true, user: api.currentUser, token };
    } catch (error) {
      api.clearAuth();
      console.error('登录失败:', error);

      if (error.message.includes('未授权') || error.message.includes('密码') || error.message.includes('用户不存在')) {
        throw new Error('账号或密码错误');
      }

      throw new Error('登录失败: ' + error.message);
    }
  },

  /**
   * 从已有会话恢复认证状态。
   * @param {Object} user - 用户信息
   * @param {string} token - JWT token
   */
  async saveAuth(user, token) {
    api.setToken(token);
    api.currentUser = {
      ...user,
      authenticated: true,
    };
  },

  /**
   * 登出。
   * @returns {Object} 登出结果 { success, message }
   */
  logout() {
    api.clearAuth();
    return { success: true, message: '登出成功' };
  },

  /**
   * 检查是否已认证。
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    return !!api.token && api.currentUser?.authenticated;
  },

  /**
   * 获取当前用户信息。
   * @returns {Object|null} 当前用户信息
   */
  getCurrentUser() {
    return api.currentUser;
  },
};

// Users API 封装
export const usersApi = {
  /**
   * 获取用户列表
   * @param {Object} params - 查询参数
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.limit=10] - 每页数量
   * @returns {Promise<Object>} 用户列表数据 { users: Array, pagination: Object }
   */
  getUsers: (params = {}) => api.get('/users', params),

  /**
   * 获取单个用户
   * @param {number} id - 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  getUser: (id) => api.get(`/users/${id}`),

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @param {string} userData.account - 用户账号
   * @param {string} userData.password - 用户密码
   * @param {string} userData.name - 用户名称
   * @param {string} [userData.role='normal'] - 用户角色
   * @param {Object} [userData.extra_data] - 扩展数据
   * @returns {Promise<Object>} 创建的用户信息
   */
  createUser: (userData) => api.post('/users', userData),

  /**
   * 更新用户
   * @param {number} id - 用户ID
   * @param {Object} userData - 更新的用户数据
   * @param {string} [userData.account] - 用户账号
   * @param {string} [userData.password] - 用户密码
   * @param {string} [userData.name] - 用户名称
   * @param {string} [userData.role] - 用户角色
   * @param {Object} [userData.extra_data] - 扩展数据
   * @returns {Promise<Object>} 更新后的用户信息
   */
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),

  /**
   * 删除用户
   * @param {number} id - 用户ID
   * @returns {Promise<Object>} 删除结果
   */
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Records API 封装
export const recordsApi = {
  /**
   * 获取记录列表
   * @param {Object} params - 查询参数
   * @param {number} [params.page=1] - 页码
   * @param {number} [params.limit=10] - 每页数量
   * @returns {Promise<Object>} 记录列表数据 { records: Array, pagination: Object }
   */
  getRecords: (params = {}) => api.get('/records', params),

  /**
   * 获取单个记录
   * @param {number} id - 记录ID
   * @returns {Promise<Object>} 记录信息
   */
  getRecord: (id) => api.get(`/records/${id}`),

  /**
   * 创建记录
   * @param {Object} recordData - 记录数据
   * @param {number} recordData.creator_id - 创建人ID
   * @param {string} [recordData.content_text] - 文本内容
   * @param {string} [recordData.content_media] - 媒体内容（JSON字符串）
   * @param {Object} [recordData.extra_data] - 扩展数据
   * @returns {Promise<Object>} 创建的记录信息
   */
  createRecord: (recordData) => api.post('/records', recordData),

  /**
   * 更新记录
   * @param {number} id - 记录ID
   * @param {Object} recordData - 更新的记录数据
   * @param {number} [recordData.creator_id] - 创建人ID
   * @param {string} [recordData.content_text] - 文本内容
   * @param {string} [recordData.content_media] - 媒体内容（JSON字符串）
   * @param {Object} [recordData.extra_data] - 扩展数据
   * @returns {Promise<Object>} 更新后的记录信息
   */
  updateRecord: (id, recordData) => api.put(`/records/${id}`, recordData),

  /**
   * 删除记录
   * @param {number} id - 记录ID
   * @returns {Promise<Object>} 删除结果
   */
  deleteRecord: (id) => api.delete(`/records/${id}`),

  /**
   * 点赞/取消点赞记录
   * @param {number} recordId - 记录ID
   * @param {number} userId - 用户ID
   * @param {string} userName - 用户名
   * @returns {Promise<Object>} 点赞结果
   */
  async toggleLike(recordId, userId, userName) {
    try {
      // 首先获取当前记录
      const record = await api.get(`/records/${recordId}`);

      // 解析 extra_data
      let extraData = {};
      if (record.extra_data) {
        try {
          extraData = JSON.parse(record.extra_data);
        } catch (error) {
          console.error('解析 extra_data 失败:', error);
          extraData = {};
        }
      }

      // 初始化 likes 数组
      if (!extraData.likes || !Array.isArray(extraData.likes)) {
        extraData.likes = [];
      }

      // 检查用户是否已经点赞
      const existingLikeIndex = extraData.likes.findIndex(like => like.userId === userId);

      if (existingLikeIndex >= 0) {
        // 取消点赞
        extraData.likes.splice(existingLikeIndex, 1);
      } else {
        // 添加点赞
        extraData.likes.push({
          userId,
          userName,
          timestamp: new Date().toISOString()
        });
      }

      // 更新记录
      const updatedRecord = await api.put(`/records/${recordId}`, {
        extra_data: extraData
      });

      return {
        success: true,
        isLiked: existingLikeIndex < 0,
        likesCount: extraData.likes.length,
        record: updatedRecord
      };
    } catch (error) {
      console.error('点赞操作失败:', error);
      throw error;
    }
  },

  /**
   * 添加评论
   * @param {number} recordId - 记录ID
   * @param {number} userId - 用户ID
   * @param {string} userName - 用户名
   * @param {string} content - 评论内容
   * @returns {Promise<Object>} 评论结果
   */
  async addComment(recordId, { userId, userName, content, avatar }) {
    try {
      // 首先获取当前记录
      const record = await api.get(`/records/${recordId}`);

      // 解析 extra_data
      let extraData = {};
      if (record.extra_data) {
        try {
          extraData = JSON.parse(record.extra_data);
        } catch (error) {
          console.error('解析 extra_data 失败:', error);
          extraData = {};
        }
      }

      // 初始化 comments 数组
      if (!extraData.comments || !Array.isArray(extraData.comments)) {
        extraData.comments = [];
      }

      // 添加新评论
      const newComment = {
        id: Date.now(), // 简单的ID生成
        userId,
        userName,
        content,
        avatar,
        timestamp: new Date().toISOString()
      };

      extraData.comments.push(newComment);

      // 更新记录
      const updatedRecord = await api.put(`/records/${recordId}`, {
        extra_data: extraData
      });

      return {
        success: true,
        comment: newComment,
        commentsCount: extraData.comments.length,
        record: updatedRecord
      };
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  },

  /**
   * 获取记录的评论列表
   * @param {number} recordId - 记录ID
   * @returns {Promise<Array>} 评论列表
   */
  async getComments(recordId) {
    try {
      const record = await api.get(`/records/${recordId}`);

      let extraData = {};
      if (record.extra_data) {
        try {
          extraData = JSON.parse(record.extra_data);
        } catch (error) {
          console.error('解析 extra_data 失败:', error);
          extraData = {};
        }
      }

      return extraData.comments || [];
    } catch (error) {
      console.error('获取评论失败:', error);
      throw error;
    }
  },

  /**
   * 删除评论
   * @param {number} recordId - 记录ID
   * @param {number} commentId - 评论ID
   * @param {number} userId - 用户ID (用于权限检查)
   * @returns {Promise<Object>} 删除结果
   */
  async deleteComment(recordId, commentId, userId) {
    try {
      const record = await api.get(`/records/${recordId}`);

      let extraData = {};
      if (record.extra_data) {
        try {
          extraData = JSON.parse(record.extra_data);
        } catch (error) {
          console.error('解析 extra_data 失败:', error);
          extraData = {};
        }
      }

      if (!extraData.comments || !Array.isArray(extraData.comments)) {
        throw new Error('评论不存在');
      }

      // 查找要删除的评论
      const commentIndex = extraData.comments.findIndex(comment => comment.id === commentId);
      if (commentIndex < 0) {
        throw new Error('评论不存在');
      }

      const comment = extraData.comments[commentIndex];

      // 检查权限：只有评论作者或管理员可以删除
      const currentUser = api.currentUser;
      if (comment.userId !== userId && currentUser?.role !== 'admin') {
        throw new Error('没有权限删除此评论');
      }

      // 删除评论
      extraData.comments.splice(commentIndex, 1);

      // 更新记录
      const updatedRecord = await api.put(`/records/${recordId}`, {
        extra_data: extraData
      });

      return {
        success: true,
        commentsCount: extraData.comments.length,
        record: updatedRecord
      };
    } catch (error) {
      console.error('删除评论失败:', error);
      throw error;
    }
  },
};

// 上传文件封装
export const commonUploadFile = (file) => api.uploadFile(file);

// 导出API实例和认证API
export default api;