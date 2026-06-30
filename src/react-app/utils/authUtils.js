// 简化的认证工具函数

// 本地存储键名
const AUTH_KEYS = {
  USER: 'auth_user',
  // 不再在 localStorage 中存储 token（使用 HttpOnly cookie）
};

/**
 * 保存认证信息到本地存储。
 * 仅保留 JWT token 作为登录态凭据。
 */
export const saveAuthInfo = (userInfo) => {
  try {
    localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userInfo || {}));
  } catch (error) {
    console.error('保存认证信息失败:', error);
  }
};

/**
 * 从本地存储获取认证信息。
 * 仅返回用户信息和 JWT token。
 */
export const getAuthInfo = () => {
  try {
    const user = localStorage.getItem(AUTH_KEYS.USER);
    if (!user) return null;
    return { user: JSON.parse(user) };
  } catch (error) {
    console.error('获取认证信息失败:', error);
    return null;
  }
};

/**
 * 清除所有认证缓存。
 */
export const clearAuthCache = () => {
  localStorage.removeItem(AUTH_KEYS.USER);
};

/**
 * 获取当前用户信息。
 */
export const getCurrentUser = () => {
  const authInfo = getAuthInfo();
  return authInfo ? authInfo.user : null;
};

/**
 * 获取当前 token。
 */
export const getToken = () => {
  const authInfo = getAuthInfo();
  // Token 存储为 HttpOnly cookie，前端不可访问
  return null;
}; 