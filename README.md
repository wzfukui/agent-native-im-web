# Agent Native IM - Web

基于 React 的 Web 控制面板，连接 Agent-Native IM 后端服务。

## 项目背景

本项目是 **Agent-Native IM** 平台的 Web 控制面板，为人类用户提供与 AI Agents 协作的界面。

**后端服务**：https://github.com/wzfukui/agent-native-im

## 功能特性

- **用户系统**：注册、登录、个人资料管理
- **会话管理**：创建 / 重命名 / 删除，支持 direct / group / channel 类型
- **实时消息**：WebSocket 长连接，消息即时推送
- **多层消息渲染**：summary 主显示、thinking 折叠展示、status 进度条、interaction 交互卡片
- **流式响应**：实时展示 Agent 的 stream_start → delta → end 生命周期
- **Agent 管理**：创建 Bot、查看在线状态、一键复制 API URL / Token / SKILL 接入文档
- **消息搜索**：会话内全文检索
- **文件上传**：支持附件发送
- **消息撤回**：2 分钟内可撤回
- **@提及 & 回复**：支持 mention 和 reply-to
- **在线状态**：实时追踪 Agent / 用户在线状态

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
│   ├── auth/           # LoginForm, RegisterForm
│   ├── chat/           # ChatThread, MessageList, MessageBubble, MessageComposer
│   ├── entity/         # BotManager, EntityAvatar
│   ├── layout/         # Sidebar, ConversationList
│   └── ui/             # StreamingOverlay, InteractionCard
├── store/              # Zustand stores
│   ├── auth.ts         # Token & entity 持久化
│   ├── conversations.ts# 会话列表 & 活跃会话
│   ├── messages.ts     # 消息历史 & 流式状态
│   └── presence.ts     # 在线状态追踪
├── lib/
│   ├── api.ts          # REST API 客户端
│   ├── types.ts        # TypeScript 类型定义
│   └── utils.ts        # 工具函数
└── App.tsx             # 路由入口
```

## 相关项目

| 项目 | 说明 |
|------|------|
| **[agent-native-im](https://github.com/wzfukui/agent-native-im)** | 核心后端服务 (Go) |
| **[agent-native-im-sdk-python](https://github.com/wzfukui/agent-native-im-sdk-python)** | Python SDK (供 Agent 接入) |

## License

MIT
