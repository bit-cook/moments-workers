import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { useAuth } from '../utils/authContext';
import { usersApi } from '../utils/api';
import styles from './users.module.css';

const initialForm = {
  account: '',
  password: '',
  name: '',
  role: 'normal',
};

const Users = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  const loadUsers = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await usersApi.getUsers({ page: pageNum, limit: pageSize });
      const nextUsers = response?.users || [];
      setUsers((prev) => append ? [...prev, ...nextUsers] : nextUsers);

      const pagination = response?.pagination || {};
      setHasMore(Boolean(pagination.pages && pagination.page < pagination.pages));
      setPage(pagination.page || pageNum);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      Toast.show({
        content: error.message || '获取用户列表失败',
        position: 'center',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(1, false);
  }, [loadUsers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (targetUser) => {
    setEditingId(targetUser.id);
    setForm({
      account: targetUser.account || '',
      password: '',
      name: targetUser.name || '',
      role: targetUser.role || 'normal',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.account.trim() || !form.name.trim()) {
      Toast.show({ content: '账号和姓名不能为空', position: 'center' });
      return;
    }

    if (!editingId && !form.password.trim()) {
      Toast.show({ content: '初始密码不能为空', position: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        account: form.account.trim(),
        name: form.name.trim(),
        role: form.role,
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (editingId) {
        await usersApi.updateUser(editingId, payload);
        Toast.show({ content: '更新成功', position: 'center' });
      } else {
        await usersApi.createUser(payload);
        Toast.show({ content: '创建成功', position: 'center' });
      }

      closeForm();
      await loadUsers();
    } catch (error) {
      console.error('保存用户失败:', error);
      Toast.show({ content: error.message || '保存失败，请重试', position: 'center' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定删除这个用户吗？')) {
      return;
    }

    try {
      await usersApi.deleteUser(id);
      Toast.show({ content: '删除成功', position: 'center' });
      await loadUsers(1, false);
    } catch (error) {
      console.error('删除用户失败:', error);
      Toast.show({ content: error.message || '删除失败，请重试', position: 'center' });
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    await loadUsers(page + 1, true);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className={styles.page}>
        <div className={styles.accessCard}>
          <h2 className={styles.title}>访问受限</h2>
          <p className={styles.subtitle}>只有管理员才能访问用户管理页面。</p>
          <button className={styles.primaryButton} onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>系统设置</div>
          <h2 className={styles.title}>用户管理</h2>
          <p className={styles.subtitle}>查看、创建和维护系统中的账号信息</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={() => navigate('/')}>返回首页</button>
          <button className={styles.primaryButton} onClick={openCreate}>新增用户</button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>用户列表</h3>
          <span className={styles.sectionHint}>共 {users.length} 位用户</span>
        </div>

        {loading ? (
          <div className={styles.emptyState}>加载中...</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>暂无用户数据</div>
        ) : (
          <>
            <div className={styles.list}>
              {users.map((item) => (
                <div className={styles.userRow} key={item.id}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>{(item.name || item.account || 'U').charAt(0).toUpperCase()}</div>
                    <div className={styles.userDetails}>
                      <div className={styles.userName}>{item.name || item.account}</div>
                      <div className={styles.userMeta}>账号：{item.account}</div>
                      <div className={styles.userMeta}>角色：{item.role === 'admin' ? '管理员' : '普通用户'}</div>
                    </div>
                  </div>
                  <div className={styles.actionGroup}>
                    <button className={styles.linkButton} onClick={() => openEdit(item)}>编辑</button>
                    <button className={styles.dangerButton} onClick={() => handleDelete(item.id)}>删除</button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className={styles.loadMoreRow}>
                <button className={styles.primaryButton} onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}

            {!hasMore && users.length > 0 && (
              <div className={styles.emptyState}>已加载全部用户</div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className={styles.modalBackdrop} onClick={closeForm}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingId ? '编辑用户' : '新增用户'}</h3>
              <button className={styles.closeButton} onClick={closeForm}>×</button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>账号</span>
                <input
                  value={form.account}
                  onChange={(event) => setForm({ ...form, account: event.target.value })}
                  placeholder="请输入账号"
                />
              </label>

              <label className={styles.field}>
                <span>姓名</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="请输入姓名"
                />
              </label>

              <label className={styles.field}>
                <span>密码</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={editingId ? '不修改请留空' : '请输入密码'}
                />
              </label>

              <label className={styles.field}>
                <span>角色</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                >
                  <option value="normal">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </label>

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeForm}>取消</button>
                <button type="submit" className={styles.primaryButton} disabled={submitting}>
                  {submitting ? '提交中...' : editingId ? '保存修改' : '创建用户'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
