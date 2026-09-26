# 前端架构说明

## 1. 当前目标

当前前端是“应届毕业生就业政策 Agent 工作台”。它保留真实的用户与 LLM 对话链路，同时用明确标记的 Mock 状态演示未来 Agent 如何推动用户补充信息、选择材料和查看政策结果。

当前没有实现 RAG、OCR、文件上传、文件解析、资格判断或完整 Workflow Agent。页面中的政策结果只展示数据结构，不代表真实政策结论。

## 2. 页面结构

页面由三部分组成：

- 左侧 `AppSidebar`：新建会话、切换会话，显示每个会话当前阶段。
- 中间 `ChatPanel`：多轮对话、Markdown、Loading、错误重试、多行输入和消息滚动。
- 右侧 `AgentWorkspace`：显示当前任务进度，以及 Agent 当前需要用户处理的内容。

桌面端同时显示三栏。中等宽度下左侧栏变为抽屉。手机端使用“对话 / 工作台”切换，避免三栏被压缩到不可用；用户在 Workspace 提交操作后会自动返回对话查看 Agent 反馈。

## 3. 组件结构

```text
App.vue
├─ AppSidebar.vue
├─ ChatPanel.vue
│  ├─ MessageBubble.vue
│  └─ ChatComposer.vue
└─ workspace/AgentWorkspace.vue
   ├─ TaskProgress.vue
   ├─ MissingFieldBlock.vue
   ├─ ProfileSummaryBlock.vue
   ├─ FileRequestBlock.vue
   └─ PolicyMatchBlock.vue
```

`App.vue` 只负责组合页面和转发事件。会话、消息、请求状态和 Workspace 状态集中在 `useAgentWorkbench.ts` 中。所有正式 HTTP 请求由 `services/chatApi.ts` 发出。

## 4. Workspace 工作方式

`WorkspaceState.blocks` 是一个有类型约束的组件列表。`AgentWorkspace` 根据每个 block 的 `type` 选择对应组件：

| type | 组件 | 用途 |
| --- | --- | --- |
| `missing_field` | `MissingFieldBlock` | 让用户补充缺失信息 |
| `profile_summary` | `ProfileSummaryBlock` | 显示已识别的用户信息及来源 |
| `file_request` | `FileRequestBlock` | 选择材料；当前仅本地演示 |
| `policy_matches` | `PolicyMatchBlock` | 展示后端返回的政策匹配结构 |

组件只收数据、展示状态并发出 `AgentAction`，不判断用户是否符合政策。新增 Workspace 展示能力时，应先扩展 `WorkspaceBlock` 类型，再增加一个对应组件和注册项。

## 5. 当前数据流

```text
用户在 Chat 输入
  -> useAgentWorkbench
  -> chatApi.sendChatMessage
  -> POST /api/agent/chat/stream
  -> 后端 ChatService / LLM Provider
  -> delta 事件逐步更新消息
  -> done 事件更新最终 ChatData 和 userProfile

用户在 Workspace 操作
  -> AgentAction
  -> workspaceMock.applyMockAction（当前阶段）
  -> 更新 WorkspaceState
  -> 转成一条普通 Chat 请求
  -> POST /api/agent/chat/stream
  -> Chat 自动显示 LLM 回复
```

因此 Chat 与 Workspace 属于同一个 `ChatSession`，不会形成两个互不相关的页面。

## 6. 状态与持久化

每个 `ChatSession` 同时保存：

- `messages`：当前会话的消息。
- `workspace`：当前任务、用户信息、材料和展示块。

浏览器使用 `localStorage` 保存最多 20 个会话。刷新页面后会恢复会话；发送中的消息会恢复为可重试的错误状态。损坏的历史数据会被忽略，浏览器禁用存储时也不会影响当前对话。这里没有引入额外状态管理库。

## 7. 当前 Mock 边界

`services/workspaceMock.ts` 只用于演示 Workspace 联动：

- 就业状态选项是界面交互演示。
- 文件只读取名称和大小，不上传、不解析、不审核。
- 政策卡片使用“政策匹配结果待接入”，不包含真实政策事实。
- 任务进度中的“政策库待接入”明确表示后端能力尚未完成。

Mock 状态在页面顶部、材料组件和政策卡片中都有可见标记。

## 8. 后续接入位置

后续 Workflow Agent 应在后端生成真实的 `WorkspaceState` 或等价字段，并随 Chat 响应返回。前端收到后直接替换当前会话的 Workspace 状态，再逐步删除 `workspaceMock.ts`。

- RAG：返回政策来源、原文片段、地区、发布时间和可追溯链接，填入 `PolicyDetail`。
- Rule/Business：返回匹配状态、已满足条件、缺失条件和匹配原因，填入 `PolicyMatch`。前端不得自行计算。
- Tool：接收 `AgentAction` 并执行业务操作，执行结果由 Agent 更新到 Chat 和 Workspace。
- 文件服务：先上传文件并返回文档 ID；OCR/解析服务更新 `AgentDocument.status`，前端只展示服务端状态。

## 9. 不要随意修改

- `POST /api/agent/chat` 的路径、方法和已有字段。
- `POST /api/agent/chat/stream` 的请求字段和 `delta`、`done`、`error` 事件含义。
- `ChatRequest`、`ChatData` 和统一响应外层结构。
- `chatApi.ts` 作为前端唯一 Chat HTTP 调用入口的边界。
- `ChatService` 与 LLM Provider 的后端边界。

需要扩展时优先增加可选字段，保证当前 Chat 客户端仍能工作。
