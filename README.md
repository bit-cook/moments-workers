# moments-workers

基于 Cloudflare Workers + Hono + React 的全栈开箱即用项目，**完全免费**，用于记录和分享美好瞬间 ✨

## 功能特点

- 📝 支持用户注册、登录、权限管理（管理员/普通用户）
- 📸 图片/文件上传，文件存储于 Cloudflare KV，支持 Telegram 云端备份
- 🗂️ 记录（posts）增删改查，支持分页
- 🔒 RESTful API，基于 JWT + HttpOnly Cookie 验证
- ⚡ 前后端分离，前端基于 React + antd-mobile，后端基于 Hono 框架
- 🌍 跨域支持，适合多端部署
- 🛠️ 支持 Cloudflare D1 数据库

## 技术栈

- Cloudflare Workers
- Hono (API 路由，已模块化至 `src/worker/routes/`)
- React 18 / antd-mobile
- Cloudflare KV / D1 Database
- Vite 构建
- Telegram Bot API（文件备份）

## 项目预览

<table>   <tr>     <td><img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/1000056292.mfksz4o4.png" alt="示例1" width="200"/></td>     <td><img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/1000056296.13m4vouyl1.png" alt="示例2" width="200"/></td>     <td><img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/1000056300.491mumpdjp.png" alt="示例3" width="200"/></td>     <td><img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/1000056303.9rjrau4lvx.png" alt="示例4" width="200"/></td> <td><img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/1000056298.1sfefpihmg.png" alt="示例5" width="200"/></td>  </tr> </table>

## 部署步骤

### 1. 克隆项目

```bash
https://github.com/chengzhnag/moments-workers
```
⚡️⚡️⚡️不要fork，fork的项目是公开的，因为wrangler.json需要配置密钥，最好是私有的项目

![克隆项目](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.7pnfzp7uf.webp)

---

### 2. 创建cloudflareKV和D1数据库

登录[cloudflare](https://dash.cloudflare.com/)新创建KV和D1数据库

![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.32ibls7k2s.webp)
![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.pfp4kud8j.webp)
![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.1e8yolnt6b.webp)

**创建出来之后kv和d1都有对应的ID**

![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.8ok1znkvtr.webp)
![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.45i0wog243.webp)

---

### 3. 进入D1数据库新增用户表和记录表

```
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    extra_data TEXT
);
```

```
CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    content_text TEXT,
    content_media TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    extra_data TEXT,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

> 请在 `wrangler.json` 中补充 `ADMIN_INIT_SECRET`，然后使用登录页底部“初始化管理员账号”按钮创建固定账号 `admin`。

**将上面两段代码分别执行**

![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.8z6vssz5v9.webp)

---

### 4. 修改git仓库配置文件

需要创建[Telegram Bot](https://chengzhnag.github.io/collect/2025-9-15-1757907416553.html)用于存储文件，需要科学上网

其他配置可直接填入保存

- 修改 `wrangler.json`，设置你的 Cloudflare KV、D1、Telegram Bot Token 等。
- 主要环境变量：
  - `TG_BOT_TOKEN`：Telegram Bot Token
  - `TG_CHAT_ID`：Telegram 群组/用户ID
  - `DOMAIN`：你的域名
  - `DB`：Cloudflare D1 数据库绑定
  - `IMAGE`：Cloudflare KV 绑定

![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.2obvv5dowz.webp)

---

### 5. 在cloudflare新建workers

![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.9o05d1x3wa.webp)
![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.9ddbjwltd6.webp)

**等待部署完成即可，后续改动git仓库都会触发自动部署**
![](https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/image.7lkcp23fm5.webp)

默认分配的域名需要科学上网才可以访问，[点击查看](https://moment.chengzhnag1.workers.dev)

初始账号：admin
初始密码：admin123

## 支持我

如果你喜欢我的项目或工作，并希望通过捐赠来支持我，非常感谢您的慷慨！

### 我的收款码
<img src="https://cdn.jsdelivr.net/gh/Zgrowth/image@master/document/1000056304.2rvhsy1c5e.png" style="width: 160px;" />

### 注意事项：

- 请在确认金额无误后进行支付。
- 捐赠时可以选择填写留言，告诉我你是谁或者对项目的建议和期待，这对我非常重要！
- 如果遇到任何问题，请联系我。

感谢您的支持与鼓励！
