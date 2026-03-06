# Agent Native IM - Web

基于 React 的 Web 控制面板，连接 Agent-Native IM 后端服务。

## 项目背景

本项目是 **Agent-Native IM** 平台的 Web 控制面板，为人类用户提供与 AI Agents 协作的界面。

**后端服务**：https://github.com/wzfukui/agent-native-im

## 功能特性

### 用户与认证
- ✅ 注册、登录、个人资料管理
- ✅ 用户头像上传
- ✅ 多设备管理（查看、踢出设备）
- ✅ 密码安全（8位+大小写+数字）

### 会话管理
- ✅ 创建 / 重命名 / 删除会话
- ✅ Direct / Group / Channel 三种类型
- ✅ 会话归档与恢复
- ✅ 成员管理（添加/移除/角色）
- ✅ 系统提示词配置
- ✅ 订阅模式设置

### 消息系统
- ✅ 文本、语音、文件、图片消息
- ✅ 流式响应（打字机效果）
- ✅ Markdown 渲染 + 代码高亮
- ✅ Mermaid 图表支持
- ✅ 消息撤回（2分钟内）
- ✅ @提及与引用回复
- ✅ 全文搜索
- ✅ 剪贴板图片粘贴
- ✅ 拖拽上传文件
- ✅ 图片灯箱查看

### Agent 管理
- ✅ 创建 Bot 与凭证管理
- ✅ Bot Token 重新生成（旧 token 自动失效）
- ✅ 一键复制 Agent 接入文本 / 接入 URL
- ✅ 在线状态实时追踪
- ✅ Bot 软删除与重新激活
- ✅ 自定义头像上传
- ✅ 元数据（描述、标签）
- ✅ 一键复制接入代码
- ✅ Agent 自检与连接诊断面板
- ✅ Quickstart 文档下载

### 任务系统
- ✅ 会话内任务管理
- ✅ 任务分配与优先级
- ✅ 任务依赖关系
- ✅ 状态流转可视化
- ✅ 截止日期提醒

### 实时功能
- ✅ WebSocket 双向通信
- ✅ 输入指示器
- ✅ 在线状态广播
- ✅ 消息乐观更新
- ✅ 自动重连
- ✅ Push 通知（HTTPS环境）
- ✅ 断网离线发送队列（Outbox）
- ✅ 离线缓存消息回放与失败重试
- ✅ 连接状态分级提示（离线 / 服务不可达 / 会话检查）

### UI/UX
- ✅ 深色/浅色主题
- ✅ 多语言支持（中/英）
- ✅ 响应式设计（桌面优化）
- ✅ 错误边界与友好提示
- ✅ 结构化错误诊断

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 7 | 构建工具 |
| Tailwind CSS | v4 | 样式 |
| Zustand | 5 | 状态管理 |
| React Router | 7 | 客户端路由 |
| React Markdown | 10 | Markdown 渲染 |
| Rehype Highlight | - | 代码高亮 |
| Lucide React | - | 图标库 |

## 开发

### Prerequisites

- Node.js 18+

### 安装

```bash
npm install
```

### 开发模式

```bash
npm run dev
# 访问 http://localhost:5173
```

开发模式下 Vite 自动代理 `/api/*` 和 `/files/*` 到后端服务。

### 构建

```bash
npm run build
# 产物输出到 dist/
```

### 部署

构建产物为纯静态文件，可部署到任意 Web 服务器。推荐使用 nginx 反向代理：

```nginx
server {
    listen 80;
    root /var/www/agent-im;

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # WebSocket
        proxy_set_header Connection "upgrade";
    }

    location /files/ {
        proxy_pass http://127.0.0.1:9800;
    }
}
```

## 项目结构

```
src/
├── components/
│   ├── auth/               # 认证相关
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── chat/               # 聊天核心
│   │   ├── ChatThread.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageComposer.tsx
│   │   ├── ArtifactRenderer.tsx
│   │   └── AudioPlayer.tsx
│   ├── conversation/       # 会话管理
│   │   ├── ConversationList.tsx
│   │   ├── ConversationItem.tsx
│   │   ├── ConversationSettingsPanel.tsx
│   │   ├── GroupMembersPanel.tsx
│   │   └── NewConversationDialog.tsx
│   ├── entity/             # 实体管理
│   │   ├── BotList.tsx
│   │   ├── BotDetail.tsx
│   │   ├── CreateAgentDialog.tsx
│   │   ├── EntityAvatar.tsx
│   │   └── AvatarPicker.tsx
│   ├── task/               # 任务系统
│   │   └── TaskPanel.tsx
│   ├── settings/           # 设置页面
│   │   ├── UserSettingsPage.tsx
│   │   └── AdminPanel.tsx
│   ├── layout/             # 布局组件
│   │   └── Sidebar.tsx
│   └── ui/                 # UI 组件
│       ├── ConfirmDialog.tsx
│       ├── ErrorBoundary.tsx
│       ├── ErrorToast.tsx
│       ├── ImageLightbox.tsx
│       └── StreamingOverlay.tsx
├── store/                  # Zustand 状态管理
│   ├── auth.ts             # 认证状态
│   ├── conversations.ts    # 会话状态
│   ├── messages.ts         # 消息状态
│   ├── presence.ts         # 在线状态
│   └── tasks.ts            # 任务状态
├── hooks/                  # 自定义 Hooks
│   ├── useWebSocket.ts     # WebSocket 管理
│   └── use-audio-recorder.ts # 语音录制
├── lib/
│   ├── api.ts              # REST API 客户端
│   ├── types.ts            # TypeScript 类型
│   ├── utils.ts            # 工具函数
│   ├── errors.ts           # 错误处理
│   └── push.ts             # Push 通知
├── i18n/                   # 国际化
│   ├── en.json
│   └── zh-CN.json
└── App.tsx                 # 应用入口
```

## 相关项目

| 项目 | 说明 |
|------|------|
| **[agent-native-im](https://github.com/wzfukui/agent-native-im)** | 核心后端服务 (Go) |
| **[agent-native-im-sdk-python](https://github.com/wzfukui/agent-native-im-sdk-python)** | Python SDK (供 Agent 接入) |

## License

MIT
