# 前端 API 与数据契约

## 1. 当前正式接口

前端当前只调用一个正式业务接口：

```text
POST /api/agent/chat
Content-Type: application/json
X-Trace-Id: 可选，前端自动生成
```

Workspace 当前没有新增后端接口。Workspace 操作会更新演示状态，并通过同一个 Chat 接口把用户选择交给 LLM。

## 2. Chat Request

```json
{
  "sessionId": "session-123",
  "userId": "user-123",
  "message": "我是今年毕业生，想了解本地就业补贴",
  "userProfile": {
    "city": "呼和浩特",
    "education": "本科",
    "graduationYear": 2026,
    "employmentStatus": "待就业"
  }
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sessionId` | string | 会话 ID；同一会话多轮请求保持不变 |
| `userId` | string | 浏览器生成并持久化的用户 ID |
| `message` | string | 当前一轮用户输入 |
| `userProfile` | object | 当前已知用户信息；未知字段可为 `null` 或省略 |

多轮历史由后端按 `sessionId` 管理。前端每一轮只提交当前消息和当前用户资料，不重复提交完整消息数组。

## 3. Chat Response

成功响应：

```json
{
  "code": 0,
  "message": "success",
  "traceId": "trace-123",
  "data": {
    "sessionId": "session-123",
    "replyText": "可以。请先告诉我你的就业状态和所在地区。",
    "needFollowUp": true,
    "followUpQuestions": ["你目前是待就业、已就业还是创业中？"],
    "userProfile": {
      "city": "呼和浩特",
      "education": "本科",
      "graduationYear": 2026,
      "employmentStatus": "待就业"
    },
    "policies": [],
    "eligibility": [],
    "plan": null,
    "materialResults": []
  }
}
```

| 字段 | 类型 | 当前用途 |
| --- | --- | --- |
| `code` | number | `0` 表示成功 |
| `message` | string | 响应说明或错误提示 |
| `traceId` | string | 排查一次请求的追踪号 |
| `data.sessionId` | string | 对应的会话 ID |
| `data.replyText` | string | LLM 回复，前端按 Markdown 展示 |
| `data.needFollowUp` | boolean | 是否需要继续补充信息 |
| `data.followUpQuestions` | string[] | 后端建议继续询问的问题 |
| `data.userProfile` | object | 后端确认或补充后的用户资料 |
| `data.policies` | array | 为未来 RAG 政策结果保留；当前为空 |
| `data.eligibility` | array | 为未来规则判断保留；当前为空 |
| `data.plan` | object/null | 为未来办理规划保留；当前为空 |
| `data.materialResults` | array | 为未来材料处理结果保留；当前为空 |

## 4. 错误响应

错误仍使用统一外层结构：

```json
{
  "code": 50001,
  "message": "模型服务暂时不可用，请稍后重试",
  "traceId": "trace-123",
  "data": null
}
```

前端会显示 `message` 和 `traceId`，并提供重试按钮。网络中断、无法解析的响应和用户主动终止请求也有独立提示。

## 5. 前端核心数据结构

### ChatSession

```ts
interface ChatSession {
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  workspace: WorkspaceState;
}
```

### WorkspaceState

```ts
interface WorkspaceState {
  sessionId: string;
  mode: "mock" | "live";
  phase: AgentPhase;
  phaseLabel: string;
  task: Task;
  profile: UserProfile;
  documents: AgentDocument[];
  policyMatches: PolicyMatch[];
  blocks: WorkspaceBlock[];
}
```

`mode` 用于区分当前演示数据与未来后端真实数据。真实 Agent 接入后应返回 `live`。

### WorkspaceBlock

当前支持四种类型：

```ts
type WorkspaceBlock =
  | { type: "missing_field"; fieldKey: "employmentStatus"; options: OptionItem[] }
  | { type: "profile_summary"; fields: ProfileDisplayField[] }
  | { type: "file_request"; acceptedTypes: string[]; document?: AgentDocument }
  | { type: "policy_matches"; matches: PolicyMatch[] };
```

每个 block 还包含 `id`、标题和该类型需要的展示字段。前端按 `type` 选择组件，不按政策名称或业务场景写死页面。

### AgentAction

当前页面会产生两种动作：

```ts
type AgentAction =
  | {
      id: string;
      type: "provide_field";
      fieldKey: "employmentStatus";
      value: string;
      label: string;
    }
  | {
      id: string;
      type: "select_file";
      fileName: string;
      fileSize: number;
    };
```

当前 `provide_field` 会更新 `userProfile` 并调用 Chat API。`select_file` 只保存本地文件名称和大小；它不代表上传成功。

### PolicyMatch

```ts
interface PolicyMatch {
  id: string;
  name: string;
  status: "potential" | "pending" | "not_eligible";
  matchReason: string;
  satisfiedConditions: string[];
  missingConditions: string[];
  detail: {
    sourceName: string;
    sourceUrl?: string;
    clauseExcerpt?: string;
    region?: string;
    publishedAt?: string;
    effectiveAt?: string;
  };
  isMock: boolean;
}
```

匹配状态、原因和条件必须由后端 RAG 与规则模块提供。前端只展示，不得根据用户资料自行判断。`sourceUrl` 只接受 HTTP/HTTPS 地址，并以新窗口打开；无有效链接时只显示来源名称。

## 6. Workspace 动作示例

用户在右侧选择“待就业”后，当前前端把资料更新为：

```json
{
  "employmentStatus": "待就业"
}
```

然后仍调用：

```json
{
  "sessionId": "session-123",
  "userId": "user-123",
  "message": "我的就业状态是：待就业。请继续帮我梳理就业政策咨询需要的信息。",
  "userProfile": {
    "employmentStatus": "待就业"
  }
}
```

这样 Workspace 操作、Chat 回复和多轮上下文保持在同一会话中。

## 7. 后续后端对接约定

后续 Agent 可以在 `ChatData` 中增加可选的 `workspace` 或等价字段，内容遵循 `WorkspaceState`。前端收到真实状态后替换当前 Mock 状态即可。

RAG、Rule、Tool 和文件服务都应由 Workflow Agent 调用。它们的内部接口不暴露给页面；页面继续通过 API Service 与后端通信。新增字段应保持向后兼容，不要修改 `/api/agent/chat` 的已有字段含义。
