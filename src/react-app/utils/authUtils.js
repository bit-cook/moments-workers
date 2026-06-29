// 简化的认证工具函数

// 本地存储键名
const AUTH_KEYS = {
  USER: 'auth_user',
  TOKEN: 'auth_token'
};

/**
 * 保存认证信息到本地存储。
 * 仅保留 JWT token 作为登录态凭据。
 */
export const saveAuthInfo = (userInfo, token = null) => {
  try {
    localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userInfo || {}));

    if (token) {
      localStorage.setItem(AUTH_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(AUTH_KEYS.TOKEN);
    }
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
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);

    if (!user || !token) {
      return null;
    }

    return {
      user: JSON.parse(user),
      token
    };
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
  localStorage.removeItem(AUTH_KEYS.TOKEN);
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
  return authInfo ? authInfo.token : null;
}; 