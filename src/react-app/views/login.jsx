import React, { useState } from "react";
import { 
  Form, 
  Input, 
  Button, 
  Toast, 
  Card
} from "antd-mobile";
import { EyeInvisibleOutline, EyeOutline, UserOutline } from "antd-mobile-icons";
import { authApi } from "../utils/api";
import { useAuth } from "../utils/authContext";
import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";

const Login = () => {
  const [visible, setVisible] = useState(false);
  const [showInit, setShowInit] = useState(false);
  const [initPassword, setInitPassword] = useState('');
  const [initSecret, setInitSecret] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, loading, loginError } = useAuth();

  // 处理表单提交
  const onFinish = async (values) => {
    try {
      await login(values.account, values.password);
      Toast.show({
        icon: 'success',
        content: '登录成功！',
      });
      // 登录成功后跳转到主页
      navigate('/');
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '登录失败，请重试',
      });
    }
  };

  const handleInitAdmin = async () => {
    if (!initPassword) {
      Toast.show({
        icon: 'fail',
        content: '请输入管理员密码',
      });
      return;
    }

    if (initPassword.length < 6) {
      Toast.show({
        icon: 'fail',
        content: '管理员密码至少6个字符',
      });
      return;
    }

    if (!initSecret) {
      Toast.show({
        icon: 'fail',
        content: '请输入初始化密钥',
      });
      return;
    }

    setInitLoading(true);
    try {
      await authApi.initAdmin('admin', initPassword, initSecret);
      await login('admin', initPassword);
      Toast.show({
        icon: 'success',
        content: '管理员账号初始化成功，已登录！',
      });
      navigate('/');
    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '初始化管理员账号失败，请重试',
      });
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* 背景装饰 */}
      <div className={styles.backgroundDecoration1} />
      <div className={styles.backgroundDecoration2} />

      <div className={styles.loginCard}>
        <Card className={styles.card}>
          {/* 顶部装饰条 */}
          {/* <div className={styles.decorationBar} /> */}

          <div className={styles.cardContent}>
            {/* Logo区域 */}
            <div className={styles.logoSection}>
              <div className={styles.logoIcon}>
                <UserOutline />
              </div>
              <h2 className={styles.title}>
                欢迎回来
              </h2>
              <p className={styles.subtitle}>
                请登录您的账户继续使用
              </p>
            </div>

            <Form
              form={form}
              onFinish={onFinish}
              layout="horizontal"
              mode='card'
              footer={
                <Button
                  block
                  color="primary"
                  size="large"
                  loading={loading}
                  className={styles.loginButton}
                  type="submit"
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              }
              style={{
                '--prefix-width': '40px'
              }}
            >
              <Form.Item
                name="account"
                label={<span className={styles.formLabel}>账号</span>}
                rules={[
                  { required: true, message: '请输入账号' },
                  { min: 2, message: '账号至少2个字符' }
                ]}
              >
                <Input
                  placeholder="请输入您的账号"
                  clearable
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className={styles.formLabel}>密码</span>}
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' }
                ]}
                extra={
                  <div 
                    onClick={() => setVisible(!visible)}
                    className={`${styles.eyeIcon} ${visible ? styles.visible : ''}`}
                  >
                    {visible ? <EyeOutline /> : <EyeInvisibleOutline />}
                  </div>
                }
              >
                <Input
                  placeholder="请输入您的密码"
                  type={visible ? 'text' : 'password'}
                  clearable
                />
              </Form.Item>
            </Form>

            {/* 底部链接 */}
            <div className={styles.bottomLinks}>
              <span className={styles.registerLink}>
                还没有账户？{' '}
                <a onClick={() => Toast.show({
                  content: '暂未开放注册',
                })}>
                  立即注册
                </a>
              </span>
              <Button
                fill='outline'
                className={styles.initButton}
                onClick={() => setShowInit(true)}
              >
                初始化管理员账号
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {showInit && (
        <div className={styles.modalOverlay} onClick={() => setShowInit(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalTitle}>初始化管理员账号</div>
            <div className={styles.modalText}>
              管理员账号固定为 <strong>admin</strong>，请输入管理员登录密码和初始化密钥。
            </div>
            <Form
              layout="vertical"
              footer={(
                <div className={styles.modalActions}>
                  <Button
                    color='warning'
                    fill='outline'
                    onClick={() => setShowInit(false)}
                  >
                    取消
                  </Button>
                  <Button
                    color='primary'
                    loading={initLoading}
                    disabled={!initPassword || initPassword.length < 6 || !initSecret}
                    onClick={handleInitAdmin}
                  >
                    确认创建
                  </Button>
                </div>
              )}
              style={{
                '--prefix-width': '40px'
              }}
            >
              <Form.Item
                label={<span className={styles.formLabel}>管理员密码</span>}
              >
                <Input
                  placeholder="请输入管理员密码"
                  type={visible ? 'text' : 'password'}
                  value={initPassword}
                  onChange={setInitPassword}
                  clearable
                />
              </Form.Item>
              <Form.Item
                label={<span className={styles.formLabel}>初始化密钥</span>}
              >
                <Input
                  placeholder="请输入 vars 中定义的初始化密钥"
                  value={initSecret}
                  onChange={setInitSecret}
                  clearable
                />
              </Form.Item>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;