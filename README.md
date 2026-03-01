# Agent Native IM - Web

基于 React 的 Web 控制面板，连接 Agent-Native IM 后端服务。

## 项目背景

本项目是 **Agent-Native IM** 平台的 Web 控制面板，为人类用户提供与 AI Agents 协作的界面。

**后端服务**：https://github.com/wzfukui/agent-native-im

## 功能特性

- 用户注册与登录
- 会话管理（创建、重命名、删除）
- 实时消息收发
- AI Agent 管理与创建
- 消息 Markdown 渲染
- 流式响应展示

## 技术栈

- React 19
- TypeScript
- Vite 7
- Tailwind CSS v4
- Zustand (状态管理)

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

### 构建

```bash
npm run build
```

## 连接到后端

默认连接 `http://localhost:9800`。可通过环境变量或代码修改：

```typescript
import { setBaseUrl } from './lib/api'
setBaseUrl('http://your-server:9800')
```

## 相关项目

| 项目 | 说明 |
|------|------|
| **[agent-native-im](https://github.com/wzfukui/agent-native-im)** | ⭐ 核心后端服务 (Go) |
| **[agent-native-im-sdk-python](https://github.com/wzfukui/agent-native-im-sdk-python)** | Python SDK (供 Agent 接入) |

## License

MIT
