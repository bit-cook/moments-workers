import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from './api';
import {
  saveAuthInfo,
  getAuthInfo,
  clearAuthCache,
  getCurrentUser
} from './authUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 优先从本地缓存恢复用户信息（方便展示），再调用后端 /auth/me 验证会话
        const authInfo = getAuthInfo();
        if (authInfo && authInfo.user) {
          setUser(authInfo.user);
        }

        try {
          const me = await authApi.me();
          if (me) {
            // me 返回 user 对象
            saveAuthInfo(me);
            authApi.saveAuth(me);
            setUser(me);
          }
        } catch (e) {
          // 未登录或 token 失效
          clearAuthCache();
        }
      } catch (e) {
        console.error('初始化认证失败:', e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // 登录方法
  const login = async (account, password) => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await authApi.login(account, password);

      // 保存认证信息到本地存储，包含 JWT token，便于刷新后恢复登录态
      saveAuthInfo(result.user);

      // 更新状态
      setUser(result.user);

      return result;
    } catch (error) {
      setLoginError(error.message);
      throw error;
    } finally {
      setLoginLoading(false);
    }
  };

  // 登出方法
  const logout = () => {
    authApi.logout();
    clearAuthCache();
    setUser(null);
    setLoginError(null);
  };

  const value = {
    user,
    loading: loading || loginLoading,
    login,
    logout,
    isAuthenticated: !!user,
    loginError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 