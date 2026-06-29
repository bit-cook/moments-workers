import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Toast,
  Card,
  Selector,
  SafeArea,
  ImageUploader,
} from "antd-mobile";
import { EyeInvisibleOutline, EyeOutline, UserOutline, LockOutline, LeftOutline } from "antd-mobile-icons";
import { useAuth } from "../utils/authContext";
import { useNavigate } from "react-router-dom";
import { usersApi, commonUploadFile } from "../utils/api";
import styles from "./createAccount.module.css";

const CreateAccount = () => {
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // 角色选项
  const roleOptions = [
    {
      label: '普通用户',
      value: 'normal',
    },
    {
      label: '管理员',
      value: 'admin',
    },
  ];

  // 处理表单提交
  const onFinish = async (values) => {
    // 验证密码确认
    if (values.password !== values.confirmPassword) {
      Toast.show({
        icon: 'fail',
        content: '两次输入的密码不一致',
      });
      return;
    }

    setLoading(true);
    try {
      const userData = {
        account: values.account,
        password: values.password,
        name: values.name,
        role: values.role?.[0] || 'normal',
        extra_data: {
          avatar: values.avatar?.[0]?.url,
          avatarThumbnailUrl: values.avatar?.[0]?.thumbnailUrl,
          createdBy: user.name,
          createdAt: new Date().toISOString()
        }
      };
      console.log('userData🧐', userData);

      await usersApi.createUser(userData);

      Toast.show({
        icon: 'success',
        content: '账号创建成功！',
      });

      // 重置表单
      form.resetFields();

      // 延迟跳转到登录页面
      setTimeout(() => {
        navigate(-1);
      }, 600);

    } catch (error) {
      Toast.show({
        icon: 'fail',
        content: error.message || '创建账号失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 验证账号唯一性
  const validateAccount = async (_, value) => {
    if (!value) return;

    try {
      // 可以添加检查账号是否已存在的逻辑
      // 这里暂时跳过
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error('账号验证失败'));
    }
  };

  // 处理图片上传
  const handleImageUpload = async (file) => {
    console.log('file🧐', file);
    try {
      const result = await commonUploadFile(file);
      console.log('result🧐', result);
      return result;
    } catch (error) {
      console.error('图片上传失败:', error);
      Toast.show({
        content: '图片上传失败',
        position: 'center',
      });
      return null;
    }
  };

  return (
    <div className={styles.createAccountContainer}>
      <SafeArea position='top' />

      {/* 背景装饰 */}
      <div className={styles.backgroundDecoration1} />
      <div className={styles.backgroundDecoration2} />

      <div className={styles.createAccountCard}>
        <Card className={styles.card}>
          <div className={styles.cardContent}>
            {/* Logo区域 */}
            <div className={styles.logoSection}>
              <div className={styles.logoIcon}>
                <UserOutline />
              </div>
              <h2 className={styles.title}>
                创建新账号
              </h2>
              <p className={styles.subtitle}>
                管理员权限 - 为用户创建新的登录账号
              </p>
            </div>

            <Form
              form={form}
              onFinish={onFinish}
              layout="horizontal"
              mode='card'
              initialValues={{
                role: ["normal"]
              }}
              footer={
                <Button
                  block
                  color="primary"
                  size="large"
                  loading={loading}
                  className={styles.createButton}
                  type="submit"
                >
                  {loading ? '创建中...' : '创建账号'}
                </Button>
              }
              style={{
                '--prefix-width': '70px'
              }}
            >
              <Form.Item
                name="account"
                label={<span className={styles.formLabel}>账号</span>}
                rules={[
                  { required: true, message: '请输入账号' },
                  { min: 2, message: '账号至少2个字符' },
                  { max: 20, message: '账号最多20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '账号只能包含字母、数字和下划线' },
                ]}
              >
                <Input
                  placeholder="请输入登录账号"
                  clearable
                />
              </Form.Item>

              <Form.Item
                name="name"
                label={<span className={styles.formLabel}>姓名</span>}
                rules={[
                  { required: true, message: '请输入用户姓名' },
                  { min: 2, message: '姓名至少2个字符' },
                  { max: 10, message: '姓名最多10个字符' }
                ]}
              >
                <Input
                  placeholder="请输入用户姓名"
                  clearable
                />
              </Form.Item>

              <Form.Item
                name="role"
                label={<span className={styles.formLabel}>角色</span>}
                rules={[
                  { required: true, message: '请选择用户角色' }
                ]}
              >
                <Selector
                  options={roleOptions}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className={styles.formLabel}>密码</span>}
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                  { max: 20, message: '密码最多20个字符' }
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
                  placeholder="请输入登录密码"
                  type={visible ? 'text' : 'password'}
                  clearable
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span className={styles.formLabel}>确认密码</span>}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
                extra={
                  <div
                    onClick={() => setConfirmVisible(!confirmVisible)}
                    className={`${styles.eyeIcon} ${confirmVisible ? styles.visible : ''}`}
                  >
                    {confirmVisible ? <EyeOutline /> : <EyeInvisibleOutline />}
                  </div>
                }
              >
                <Input
                  placeholder="请再次输入密码"
                  type={confirmVisible ? 'text' : 'password'}
                  clearable
                />
              </Form.Item>
              <Form.Item
                name="avatar"
                label={<span className={styles.formLabel}>头像</span>}
                rules={[
                  { required: true, message: '请上传头像' },
                ]}
              >
                <ImageUploader
                  upload={handleImageUpload}
                  maxCount={1}
                />
              </Form.Item>
            </Form>

            {/* 底部说明 */}
            <div className={styles.bottomNote}>
              <p className={styles.noteText}>
                • 账号创建后用户即可使用此账号密码登录系统
              </p>
              <p className={styles.noteText}>
                • 普通用户只能查看和评论内容
              </p>
              <p className={styles.noteText}>
                • 管理员可以发布内容和管理系统
              </p>
            </div>
          </div>
        </Card>
      </div>
      <SafeArea position='bottom' />
    </div>
  );
};

export default CreateAccount;
