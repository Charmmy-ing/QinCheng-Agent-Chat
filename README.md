# 应届毕业生就业政策 Agent 工作台

本目录包含第一阶段真实 Chat 链路，以及面向后续 Agent 的三栏工作台前端。LLM 回答通过流式接口渐进显示，同时保留原 JSON Chat 接口；右侧 Workspace 使用明确标记的 Mock 数据演示 Agent 与用户如何联动，不包含真实政策判断、RAG、OCR 或文件上传。

## 目录

- `frontend/`：Vue 3 + TypeScript + Vite 对话界面
- `backend/`：FastAPI Chat API、会话上下文和 LLM Provider
- `docs/Frontend Architecture.md`：三栏页面、Workspace 和后续接入说明
- `docs/Frontend API Contract.md`：前端接口与状态数据契约
- `Chat 模块接口规范.md`：接口调用说明
- `后续开发对接说明.md`：Agent、RAG、Tool 后续接入位置

## 本地启动

### 1. 配置后端

```powershell
cd backend
Copy-Item .env.example .env
```

编辑 `.env`，至少填写：

```dotenv
LLM_API_KEY=你的模型服务密钥
```

默认使用移动云的 OpenAI 兼容接口和 `deepseek-v4-flash-0731` 模型。更换服务时修改 `LLM_BASE_URL` 和 `LLM_MODEL`，不需要改业务代码。

### 2. 安装并构建前端

```powershell
cd frontend
npm install
npm run build
```

### 3. 启动完整应用

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

浏览器访问 `http://127.0.0.1:8000/`。开发前端时可以在 `frontend/` 运行 `npm run dev`，访问 `http://127.0.0.1:5173/`。

## 验证

```powershell
cd backend
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python scripts\smoke_real_llm.py

cd ..\frontend
npm run typecheck
npm run build
```

`smoke_real_llm.py` 会通过已启动的 Chat API 发起一次真实模型请求，不读取或输出 API Key。
